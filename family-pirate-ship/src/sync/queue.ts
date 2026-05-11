import { get, set, del } from 'idb-keyval';
import type { QueuedWrite, QueuedWriteKind } from '../types';

const QUEUE_KEY = 'pirate-ship-sync-queue-v1';

/**
 * All mutations to the IDB queue funnel through this chain-promise mutex.
 * Without it, concurrent enqueues (e.g. Promise.all of three name-change
 * writes in savePirates) each do a read→modify→write and clobber each
 * other — last-writer-wins silently loses the other writes, then a pull
 * fetches the stale server rows and the UI "reverts" a minute later.
 */
let mutex: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
    const next = mutex.then(fn, fn);
    mutex = next.then(
        () => undefined,
        () => undefined,
    );
    return next;
}

export async function readQueue(): Promise<QueuedWrite[]> {
    try {
        const q = await get(QUEUE_KEY);
        return Array.isArray(q) ? (q as QueuedWrite[]) : [];
    } catch {
        return [];
    }
}

/**
 * Read-modify-write the queue atomically. The lock guarantees no other
 * enqueue, flush writeback, or clear can observe a partially-updated queue.
 * The callback receives the current queue and a `commit` helper; anything
 * it reads/writes inside happens under the lock.
 */
export async function mutateQueue<T>(
    fn: (q: QueuedWrite[], commit: (next: QueuedWrite[]) => Promise<void>) => Promise<T> | T,
): Promise<T> {
    return withLock(async () => {
        const q = await readQueue();
        return await fn(q, writeQueueRaw);
    });
}

async function writeQueueRaw(q: QueuedWrite[]): Promise<void> {
    try {
        await set(QUEUE_KEY, q);
    } catch (err) {
        // IndexedDB full or blocked — surface to caller, sync worker logs.
        throw err;
    }
}

export async function writeQueue(q: QueuedWrite[]): Promise<void> {
    // Exposed for callers outside a mutateQueue block (tests, legacy paths).
    // Production code should prefer mutateQueue so the read and write are a
    // single atomic step.
    return withLock(() => writeQueueRaw(q));
}

export async function enqueueWrite(kind: QueuedWriteKind, payload: unknown) {
    await withLock(async () => {
        const q = await readQueue();
        q.push({
            id:
                typeof crypto !== 'undefined' && 'randomUUID' in crypto
                    ? crypto.randomUUID()
                    : Math.random().toString(36).slice(2),
            kind,
            payload,
            createdAt: Date.now(),
            attempts: 0,
        });
        await writeQueueRaw(q);
    });
}

export async function clearQueue() {
    await withLock(() => del(QUEUE_KEY));
}
