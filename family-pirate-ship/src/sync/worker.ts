import { mutateQueue } from './queue';
import { useSyncStore } from '../store/syncStore';
import { insertDrive } from '../api/drives';
import { updatePirate, type PirateUpdate } from '../api/pirates';
import { updateSettings } from '../api/settings';
import {
    recordUnlock,
    recordCoastalFind,
    renameIsland,
    type UnlockPayload,
    type CoastalFindPayload,
    type RenamePayload,
} from '../api/islands';
import { AppError, isTransient, mapError } from '../api/errors';
import type {
    DriveRecord,
    QueuedWrite,
    Settings,
} from '../types';

interface SettingsUpdatePayload {
    familyId: string;
    patch: Partial<Settings>;
}

/**
 * Flush the queue. Stops on the first transient failure to preserve
 * order; permanent failures (RLS rejection, schema violation) get
 * dropped from the queue since retrying won't help.
 *
 * Triggered by: drive end, settings change, online event, focus regain,
 * 60s heartbeat while online.
 */
export async function flushQueue(): Promise<void> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    if (useSyncStore.getState().isSyncing) return;
    useSyncStore.getState().setSyncing(true);

    try {
        // Drain one item at a time, each step re-reading the queue under
        // the lock. This makes flush safe against concurrent enqueues:
        // adding an item during flush just appends to the tail, which the
        // next iteration picks up rather than overwriting.
        for (;;) {
            const head = await mutateQueue((q) => q[0] ?? null);
            if (!head) break;

            let outcome: 'drop' | 'retry' = 'drop';
            let appErr: AppError | null = null;

            try {
                await dispatch(head);
            } catch (err) {
                appErr = err instanceof AppError ? err : mapError(err);
                const pgCode = (appErr.cause as { code?: string } | undefined)?.code;
                if (appErr.code === 'CONFLICT' || pgCode === '23505') {
                    outcome = 'drop';
                } else if (!isTransient(appErr)) {
                    outcome = 'drop';
                } else {
                    outcome = 'retry';
                }
            }

            const stop = await mutateQueue(async (q, commit) => {
                // Find the item by id — it might have shifted position if
                // anything else mutated the queue while dispatch ran.
                const idx = q.findIndex((x) => x.id === head.id);
                if (idx === -1) {
                    // Someone else already removed it — just proceed.
                    return false;
                }
                if (outcome === 'drop') {
                    q.splice(idx, 1);
                    await commit(q);
                    return false;
                }
                // retry — bump attempts, keep at head, stop the flush.
                q[idx] = {
                    ...q[idx],
                    attempts: q[idx].attempts + 1,
                    lastError: appErr?.message,
                };
                await commit(q);
                return true;
            });

            if (stop) break;
        }
        useSyncStore.getState().setLastSyncAt(Date.now());
    } finally {
        useSyncStore.getState().setSyncing(false);
    }
}

async function dispatch(w: QueuedWrite): Promise<void> {
    switch (w.kind) {
        case 'insert_drive':
            return insertDrive(w.payload as DriveRecord);
        case 'update_pirate':
            return updatePirate(w.payload as PirateUpdate);
        case 'update_settings': {
            const p = w.payload as SettingsUpdatePayload;
            return updateSettings(p.familyId, p.patch);
        }
        case 'unlock_island':
            return recordUnlock(w.payload as UnlockPayload);
        case 'find_coastal':
            return recordCoastalFind(w.payload as CoastalFindPayload);
        case 'rename_island':
            return renameIsland(w.payload as RenamePayload);
    }
}
