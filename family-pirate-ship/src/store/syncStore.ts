import { create } from 'zustand';
import type { QueuedWrite, QueuedWriteKind } from '../types';

/**
 * syncStore — the UI surface for the sync layer. State lives here
 * (online/offline, isSyncing, queue length, lastSyncAt) so components
 * can subscribe. The actual queue lives in IndexedDB via src/sync/queue,
 * and flushing runs through src/sync/worker.
 *
 * We defer the imports with require-at-call-time so this store can be
 * imported from anywhere without creating cycles with the API layer.
 */

export interface SyncState {
    /** Mirror of the IndexedDB queue length, updated after each mutation. */
    queueLen: number;
    isOnline: boolean;
    isSyncing: boolean;
    lastSyncAt?: number;

    /** in-flight queue kept locally too, mostly for tests + debugging */
    queue: QueuedWrite[];

    enqueue: (kind: QueuedWriteKind, payload: unknown) => Promise<void>;
    flush: () => Promise<void>;
    clear: () => Promise<void>;

    setOnline: (b: boolean) => void;
    setSyncing: (b: boolean) => void;
    setLastSyncAt: (t: number) => void;
    setQueueLen: (n: number) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
    queueLen: 0,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    lastSyncAt: undefined,
    queue: [],

    enqueue: async (kind, payload) => {
        // Dynamic import so we don't pull the queue module into test contexts
        // that don't need it.
        const { enqueueWrite, readQueue } = await import('../sync/queue');
        await enqueueWrite(kind, payload);
        const q = await readQueue();
        set({ queueLen: q.length, queue: q });
    },

    flush: async () => {
        const { flushQueue } = await import('../sync/worker');
        await flushQueue();
        const { readQueue } = await import('../sync/queue');
        const q = await readQueue();
        set({ queueLen: q.length, queue: q });
    },

    clear: async () => {
        const { clearQueue } = await import('../sync/queue');
        await clearQueue();
        set({ queueLen: 0, queue: [] });
    },

    setOnline: (b) => set({ isOnline: b }),
    setSyncing: (b) => set({ isSyncing: b }),
    setLastSyncAt: (t) => set({ lastSyncAt: t }),
    setQueueLen: (n) => set({ queueLen: n }),
}));

/** Rehydrate queueLen on app start. Called from useAuthBootstrap. */
export async function hydrateSyncQueue() {
    try {
        const { readQueue } = await import('../sync/queue');
        const q = await readQueue();
        useSyncStore.setState({ queueLen: q.length, queue: q });
    } catch {
        /* noop */
    }
}
