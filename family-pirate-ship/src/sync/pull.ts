import { listDrives } from '../api/drives';
import { listUnlocked, listCoastalFinds } from '../api/islands';
import { listPirates } from '../api/pirates';
import { getSettings } from '../api/settings';
import { useAuthStore } from '../store/authStore';
import { useDrivesStore } from '../store/drivesStore';
import { usePiratesStore } from '../store/piratesStore';
import { useSettingsStore } from '../store/settingsStore';
import { useSyncStore } from '../store/syncStore';
import { readQueue } from './queue';
import type { QueuedWriteKind } from '../types';
import { migrateIslandId, migrateIslandIds } from '../lib/islandMigration';

/**
 * Full-state pull. Fires on: app open (after auth), window focus, after
 * sign-in, after accepting an invite, pull-to-refresh.
 *
 * Strategy per dev spec §7.1:
 * - drives: server is append-only. Replace local drives array with what
 *   the server has, but preserve any local drives that are still queued
 *   (identified by a client-only `id`).
 * - islands / coastal finds: union. Server list wins for items both know
 *   about; local-only (queued) entries stay until the queue drains.
 * - pirates & settings: last-write-wins by updated_at. We have no local
 *   updated_at for pirates/settings today, so we always take the server
 *   value — this is correct for v1, where local edits are only made via
 *   the settings screen which also enqueues a server update.
 */
export async function pullFamilyState(): Promise<void> {
    const { family } = useAuthStore.getState();
    if (!family) return;

    // Read the persisted queue once, under no lock — pull is advisory and
    // the result only guards against overwriting local state with stale
    // server rows. A slightly-stale read is fine: if a new write lands
    // after we snapshot the queue, the next pull will respect it.
    const queue = await readQueue();
    const pending = new Set<QueuedWriteKind>(queue.map((q) => q.kind));

    const [drives, islandIds, findIds, pirates, settings] = await Promise.all([
        listDrives(family.id),
        listUnlocked(family.id),
        listCoastalFinds(family.id),
        listPirates(family.id),
        getSettings(family.id),
    ]);

    // Drives — preserve any still-queued local drive (one without a server
    // UUID match). This covers the "ended a drive offline, just came back
    // online, pull fires before flush" case. Normalize islandId through the
    // rename map so historical rows referencing retired island ids render
    // against the current catalog.
    const normalizedDrives = drives.map((d) => ({
        ...d,
        islandId: d.islandId ? migrateIslandId(d.islandId) ?? undefined : undefined,
    }));
    const serverIds = new Set(normalizedDrives.map((d) => d.id));
    const localOnly = useDrivesStore
        .getState()
        .drives.filter((d) => !d.id || !serverIds.has(d.id));
    useDrivesStore.setState({ drives: [...normalizedDrives, ...localOnly] });

    // Islands — union by ID, after mapping renamed/removed ids.
    const localUnlocked = useDrivesStore.getState().unlockedIslandIds;
    const merged = migrateIslandIds([...islandIds, ...localUnlocked]);
    useDrivesStore.setState({ unlockedIslandIds: merged });
    // Coastal finds not directly held in drivesStore yet (v2 tracked them
    // only as "latestFind"). Drop on the floor for now; Phase 5 may expose
    // a finds list in settings.
    void findIds;

    // Pirates / settings last-write-wins by side-effect: skip the hydrate
    // if there are still pending local writes for the same state slice.
    // The flush will land them on the server and a later pull will pick
    // up the authoritative values.
    if (pirates.length === 3 && !pending.has('update_pirate')) {
        usePiratesStore.getState().setPirates(pirates);
    }

    if (settings && !pending.has('update_settings')) {
        useSettingsStore.getState().hydrateSettings(settings);
    }

    useSyncStore.getState().setLastSyncAt(Date.now());
}
