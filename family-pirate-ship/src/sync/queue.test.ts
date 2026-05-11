import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Stub idb-keyval with an in-memory map. The real library needs IndexedDB
 * which isn't present in jsdom. The tests exercise the lock semantics of
 * queue.ts, not the IDB implementation details.
 */
vi.mock('idb-keyval', () => {
    const store = new Map<string, unknown>();
    return {
        get: vi.fn(async (k: string) => store.get(k)),
        set: vi.fn(async (k: string, v: unknown) => {
            // Simulate a small asynchronous delay so concurrent callers
            // actually interleave like they would in the browser.
            await new Promise((r) => setTimeout(r, 0));
            store.set(k, v);
        }),
        del: vi.fn(async (k: string) => {
            store.delete(k);
        }),
        __reset: () => store.clear(),
    };
});

import * as idb from 'idb-keyval';
import { clearQueue, enqueueWrite, mutateQueue, readQueue } from './queue';

/**
 * Covers the race that caused the "names revert after a minute" bug:
 * concurrent enqueues must not lose writes.
 */
beforeEach(async () => {
    (idb as unknown as { __reset: () => void }).__reset();
});

afterEach(async () => {
    await clearQueue();
});

describe('sync queue', () => {
    it('persists a single enqueue', async () => {
        await enqueueWrite('update_pirate', { familyId: 'f', slot: 'kid', name: 'K' });
        const q = await readQueue();
        expect(q).toHaveLength(1);
        expect(q[0].kind).toBe('update_pirate');
    });

    it('preserves ALL writes when three enqueues run in parallel', async () => {
        // This is the core bug: savePirates fires three enqueues in
        // parallel (one per pirate). Without a lock, each read→modify→
        // write clobbers the others and only the last one lands. After a
        // focus-triggered pull the lost writes appeared to "revert."
        await Promise.all([
            enqueueWrite('update_pirate', { familyId: 'f', slot: 'kid', name: 'Kid2' }),
            enqueueWrite('update_pirate', { familyId: 'f', slot: 'mom', name: 'Mom2' }),
            enqueueWrite('update_pirate', { familyId: 'f', slot: 'dad', name: 'Dad2' }),
        ]);
        const q = await readQueue();
        expect(q).toHaveLength(3);
        const slots = q.map((w) => (w.payload as { slot: string }).slot).sort();
        expect(slots).toEqual(['dad', 'kid', 'mom']);
    });

    it('holds the lock across mutateQueue blocks', async () => {
        await enqueueWrite('update_pirate', { familyId: 'f', slot: 'kid', name: 'A' });

        // Two simultaneous mutations: one appends an item, one rewrites
        // the queue. The lock must serialize them so both land.
        const t1 = mutateQueue(async (q, commit) => {
            q.push({
                id: 'x',
                kind: 'update_settings',
                payload: {},
                createdAt: 0,
                attempts: 0,
            });
            await commit(q);
        });
        const t2 = mutateQueue(async (q, commit) => {
            q.push({
                id: 'y',
                kind: 'update_pirate',
                payload: {},
                createdAt: 0,
                attempts: 0,
            });
            await commit(q);
        });
        await Promise.all([t1, t2]);

        const q = await readQueue();
        const ids = q.map((w) => w.id).sort();
        // First kid write from the seed + the two mutations above = 3.
        expect(q).toHaveLength(3);
        expect(ids).toContain('x');
        expect(ids).toContain('y');
    });

    it('clearQueue removes everything', async () => {
        await enqueueWrite('update_pirate', { familyId: 'f', slot: 'kid', name: 'K' });
        await enqueueWrite('update_pirate', { familyId: 'f', slot: 'mom', name: 'M' });
        await clearQueue();
        expect(await readQueue()).toEqual([]);
    });
});
