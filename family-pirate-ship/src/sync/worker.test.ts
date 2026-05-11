import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks are hoisted — any references they need must be declared inside
// the factory. We expose the vi.fn() spies via the returned object and
// import them back below.

vi.mock('../api/drives', () => ({ insertDrive: vi.fn() }));
vi.mock('../api/pirates', () => ({ updatePirate: vi.fn() }));
vi.mock('../api/settings', () => ({ updateSettings: vi.fn() }));
vi.mock('../api/islands', () => ({
    recordUnlock: vi.fn(),
    recordCoastalFind: vi.fn(),
    renameIsland: vi.fn(),
}));
vi.mock('./queue', () => {
    // In-memory stand-in for IDB. Each test seeds it via `setQueue`.
    let store: import('../types').QueuedWrite[] = [];
    return {
        readQueue: vi.fn(async () => store.slice()),
        writeQueue: vi.fn(async (q) => {
            store = q.slice();
        }),
        mutateQueue: vi.fn(async (fn) => {
            const commit = async (next: import('../types').QueuedWrite[]) => {
                store = next.slice();
            };
            return await fn(store.slice(), commit);
        }),
        enqueueWrite: vi.fn(),
        clearQueue: vi.fn(async () => {
            store = [];
        }),
        // Test-only helpers for seeding + inspecting the store.
        __setQueue: (q: import('../types').QueuedWrite[]) => {
            store = q.slice();
        },
        __getQueue: () => store.slice(),
    };
});

import { insertDrive } from '../api/drives';
import { updatePirate } from '../api/pirates';
import * as queueModule from './queue';
import { AppError } from '../api/errors';
import { useSyncStore } from '../store/syncStore';
import { flushQueue } from './worker';

const insertDriveMock = vi.mocked(insertDrive);
const updatePirateMock = vi.mocked(updatePirate);
const setQueue = (queueModule as unknown as {
    __setQueue: (q: import('../types').QueuedWrite[]) => void;
}).__setQueue;
const getQueue = (queueModule as unknown as {
    __getQueue: () => import('../types').QueuedWrite[];
}).__getQueue;

beforeEach(() => {
    insertDriveMock.mockReset();
    updatePirateMock.mockReset();
    setQueue([]);
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    useSyncStore.setState({ isSyncing: false, queueLen: 0, queue: [] });
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('flushQueue', () => {
    it('is a no-op when offline', async () => {
        Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
        setQueue([{ id: '1', kind: 'insert_drive', payload: {}, createdAt: 0, attempts: 0 }]);
        await flushQueue();
        expect(insertDriveMock).not.toHaveBeenCalled();
        // Queue untouched when offline.
        expect(getQueue()).toHaveLength(1);
    });

    it('is a no-op when already syncing', async () => {
        useSyncStore.setState({ isSyncing: true });
        setQueue([{ id: '1', kind: 'insert_drive', payload: {}, createdAt: 0, attempts: 0 }]);
        await flushQueue();
        expect(insertDriveMock).not.toHaveBeenCalled();
    });

    it('dispatches each queued write and drains the queue on success', async () => {
        setQueue([
            { id: '1', kind: 'insert_drive' as const, payload: { id: 'd1' }, createdAt: 0, attempts: 0 },
            { id: '2', kind: 'update_pirate' as const, payload: { familyId: 'f', slot: 'kid', name: 'K' }, createdAt: 0, attempts: 0 },
        ]);
        insertDriveMock.mockResolvedValue(undefined);
        updatePirateMock.mockResolvedValue(undefined);

        await flushQueue();

        expect(insertDriveMock).toHaveBeenCalledTimes(1);
        expect(updatePirateMock).toHaveBeenCalledTimes(1);
        expect(getQueue()).toEqual([]);
    });

    it('stops on first transient failure, preserving order and bumping attempts', async () => {
        setQueue([
            { id: '1', kind: 'insert_drive' as const, payload: {}, createdAt: 0, attempts: 0 },
            { id: '2', kind: 'update_pirate' as const, payload: {}, createdAt: 0, attempts: 0 },
        ]);
        insertDriveMock.mockRejectedValue(new AppError('NETWORK', 'offline'));

        await flushQueue();

        expect(insertDriveMock).toHaveBeenCalledTimes(1);
        expect(updatePirateMock).not.toHaveBeenCalled();
        const remaining = getQueue();
        expect(remaining).toHaveLength(2);
        expect(remaining[0].attempts).toBe(1);
        expect(remaining[0].id).toBe('1');
    });

    it('drops items that hit a unique-violation (already applied)', async () => {
        setQueue([
            { id: '1', kind: 'insert_drive' as const, payload: {}, createdAt: 0, attempts: 0 },
        ]);
        insertDriveMock.mockRejectedValue(
            new AppError('CONFLICT', 'dup', { code: '23505' }),
        );

        await flushQueue();

        expect(getQueue()).toEqual([]);
    });

    it('drops permanent failures (FORBIDDEN, RLS)', async () => {
        setQueue([
            { id: '1', kind: 'insert_drive' as const, payload: {}, createdAt: 0, attempts: 0 },
            { id: '2', kind: 'update_pirate' as const, payload: {}, createdAt: 0, attempts: 0 },
        ]);
        insertDriveMock.mockRejectedValueOnce(new AppError('FORBIDDEN', 'rls'));
        updatePirateMock.mockResolvedValue(undefined);

        await flushQueue();

        expect(updatePirateMock).toHaveBeenCalledTimes(1);
        expect(getQueue()).toEqual([]);
    });

    it('preserves writes appended during a flush (no clobber of concurrent enqueues)', async () => {
        // Seed the queue with one write. During dispatch of that write,
        // simulate a parallel enqueue landing on the queue (e.g. user
        // saves a pirate name mid-sync). The new write must survive and
        // the second flush iteration must pick it up.
        setQueue([
            { id: '1', kind: 'insert_drive' as const, payload: {}, createdAt: 0, attempts: 0 },
        ]);
        insertDriveMock.mockImplementationOnce(async () => {
            // Mid-dispatch: a different path appends a new write.
            const appended = [
                ...getQueue(),
                {
                    id: '2',
                    kind: 'update_pirate' as const,
                    payload: { familyId: 'f', slot: 'kid', name: 'K' },
                    createdAt: 0,
                    attempts: 0,
                },
            ];
            setQueue(appended);
        });
        updatePirateMock.mockResolvedValue(undefined);

        await flushQueue();

        expect(insertDriveMock).toHaveBeenCalledTimes(1);
        expect(updatePirateMock).toHaveBeenCalledTimes(1);
        expect(getQueue()).toEqual([]);
    });
});
