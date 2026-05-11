# Offline sync — queue, worker, pull

Three files make up the sync layer: `src/sync/queue.ts` (IDB storage + mutex), `src/sync/worker.ts` (flush logic), `src/sync/pull.ts` (reconciliation). A fourth, `src/sync/resetFamily.ts`, orchestrates the reset-family sequence; it bypasses the queue and is documented at the end.

## 1. When is a write enqueued vs. done directly?

Enqueued (reads resilient to offline + tab close):

- `insert_drive` — from `drivesStore.endDrive` on any tapped drive with authed family and pirates with server UUIDs.
- `unlock_island` — same call site, when the tier is `fair_winds` (legacy `'fair'`) and a new unlock was picked.
- `find_coastal` — same call site, when the tier is `coastal`.
- `update_pirate` — from `piratesStore.savePirates`, one per changed slot name.
- `update_settings` — from `settingsStore.setSettings`, one per patch.
- `rename_island` — declared in `QueuedWriteKind` and dispatched by the worker, but no store currently enqueues it. The rename UI hasn't shipped.

Direct API calls (no queue):

- Auth: `signInWithGoogle`, `signOut`, `getSession`.
- Family lifecycle: `createFamily`, `getMyFamily(AndRole)`, `listMembersWithProfile`.
- Invites: `createInvite` (Edge Function), `acceptInvite`, `revokeInvite`, `listPendingInvites`, `findPendingInviteForMe`, `removeMember`. These are user-initiated, interactive, and surface their own errors directly — queueing them would mean "tap invite → wait until online → no feedback until then," which is worse UX than just showing the failure.
- Reset-family (see §6).
- All the read paths used by `pull.ts`.

## 2. IDB queue (`src/sync/queue.ts`)

Backed by a single `idb-keyval` key `pirate-ship-sync-queue-v1`. The stored value is a `QueuedWrite[]`:

```ts
{ id, kind: QueuedWriteKind, payload, createdAt, attempts, lastError? }
```

Every mutation funnels through a chain-promise mutex (`withLock`). This is the critical fix for the "names revert a minute later" bug: three parallel `savePirates` enqueues each used to do a read → modify → write on the shared key, and the last writer silently clobbered the other two. On the next focus-triggered pull, the stale server rows overwrote local state and the UI "reverted."

Public helpers:

- `readQueue()` — snapshot. No lock (the worker and pull both use this); a slightly-stale read is fine.
- `enqueueWrite(kind, payload)` — under the lock, appends a new `QueuedWrite` with a fresh UUID, `attempts: 0`, `createdAt: Date.now()`.
- `mutateQueue(fn)` — atomic read-modify-write. The callback receives the current queue + a `commit(next)` helper. Everything inside runs under the lock.
- `writeQueue(q)` / `clearQueue()` — for callers outside a `mutateQueue` block (tests, the reset-family path).

## 3. Worker (`src/sync/worker.ts`)

Single entry point: `flushQueue()`. Behavior:

1. **Early out** if `navigator.onLine === false` or if `syncStore.isSyncing` is already true. Sets `isSyncing: true` for the duration, clears it in `finally`.
2. **Drain one item at a time.** Each iteration reads the queue head under the lock, dispatches, and decides what to do with that item based on the outcome. Reading one-at-a-time (instead of taking a snapshot of the whole queue up front) is deliberate: it keeps the worker safe against concurrent enqueues landing mid-flush. The `worker.test.ts` "preserves writes appended during a flush" case exercises this.
3. **Dispatch.** A switch on `w.kind` maps to the right API wrapper:

| Kind | Wrapper |
|------|---------|
| `insert_drive` | `insertDrive(payload)` |
| `update_pirate` | `updatePirate(payload)` |
| `update_settings` | `updateSettings(familyId, patch)` |
| `unlock_island` | `recordUnlock(payload)` |
| `find_coastal` | `recordCoastalFind(payload)` |
| `rename_island` | `renameIsland(payload)` |

4. **Classify the outcome.** Wrap any thrown value via `mapError`. Then:
   - `appErr.code === 'CONFLICT'` **or** the underlying Postgres code is `23505` (unique violation) → **drop**. The write is "already applied." This is how `drive.id`-based idempotency flows from the client-UUID generation through to the queue: a retry that lands a duplicate is success.
   - `!isTransient(appErr)` (i.e. `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `UNAUTHENTICATED`) → **drop**. Retrying won't help; keeping the item blocks the rest of the queue behind one bad write. `attempts` isn't bumped because we're not retrying.
   - Otherwise transient (`NETWORK`, `UNKNOWN`) → **retry**. Bump `attempts`, stamp `lastError`, leave at head of queue, **stop the flush**. We stop on the first transient failure so downstream writes that depend on ordering (a drive insert followed by its unlock) don't race past a failed prerequisite.
5. **Commit under the lock.** The item id is re-found by `.findIndex` because anything could have shuffled the queue during dispatch.
6. When the loop exits (queue empty or a retry stopped it), stamp `syncStore.lastSyncAt = Date.now()`.

There is no exponential backoff. The flush simply stops and waits for the next trigger. Attempts is recorded but not currently acted on — no max-attempts dead-letter behavior. The transient-stops-at-head rule is what prevents a retry loop from hammering a down server.

## 4. What triggers a flush

Four places, all ultimately calling `syncStore.getState().flush()`:

1. **Write-site fire-and-forget.** `drivesStore.endDrive` and `piratesStore.savePirates` call `flush()` after their enqueues; `settingsStore.setSettings` does the same via `.then(flush)`.
2. **Online event.** `useOnlineStatus` calls `flush()` when `window`'s `online` fires.
3. **Focus / visibility.** `useSyncOnFocus` calls `flush()` then `pullFamilyState()` on window `focus` and on document `visibilitychange` with `document.visibilityState === 'visible'`. Flush-before-pull is intentional: if we pulled first, any just-saved local edits that hadn't flushed yet would be clobbered by the stale server read.
4. **60-second heartbeat.** Same hook; a `setInterval` calls `flush()` while the tab is visible and online.
5. **Auth bootstrap, after sign-in.** `useAuthBootstrap::resolveUser` calls `pullFamilyState()` then `flush()` once the session lands and `refreshFamily` succeeds.

`syncStore.hydrateSyncQueue()` (called once from `useAuthBootstrap`) only rehydrates the `queueLen`/`queue` mirror — it doesn't flush, so work queued from a previous session doesn't get retried until one of the five triggers fires.

## 5. Pull reconciliation (`src/sync/pull.ts`)

Single entry: `pullFamilyState()`. Does five `Promise.all`'d reads — `listDrives`, `listUnlocked`, `listCoastalFinds`, `listPirates`, `getSettings` — and merges each into its store. Different merge rule per entity:

- **Drives: server-wins with local-only preservation.** Replace the local drives array with what the server returned, but keep any local drive whose `id` isn't in the server set (i.e. an offline-ended drive that's still queued). Island ids on pulled drives are routed through `migrateIslandId` (`lib/islandMigration.ts`) so renamed ids (`cocoa-coast → cocoa-beach`) render against the current catalog.
- **Unlocked islands: union.** `migrateIslandIds([...serverIds, ...localIds])` dedupes and applies the rename map. Covers the "unlocked offline, pull fires before flush" case.
- **Coastal finds: read-but-dropped.** `findIds` is fetched but immediately `void`ed — the v2 drives store doesn't hold a list of finds (only `latestFind` during reveal).
- **Pirates: server-wins, skipped-if-pending.** If the returned list has exactly three rows AND there's no pending `update_pirate` in the queue, `setPirates(serverList)` hydrates. Skipping the hydrate when a write is still queued protects just-edited names from getting overwritten by pre-edit server state.
- **Settings: server-wins, skipped-if-pending.** Same pattern with `update_settings`.

The pending-writes check reads the queue once (no lock) at the top of the function; a write that lands after the snapshot is taken just rides on the next pull.

## 6. Reset-family (`src/sync/resetFamily.ts`)

Four-step sequence, bypassing the queue:

1. **Clear the queue** via `syncStore.clear()`. Any writes sitting there are about to be invalidated by the server wipe.
2. **Direct server wipe.** `wipeFamilyData(familyId)` → `reset_family_data` RPC (deletes drives, islands, finds). Then three `updatePirate` direct calls to reset names to defaults, then `updateSettings` to reset preferences. These bypass the queue because the queue was just cleared, and because we need completion before the next pull.
3. **Reset local stores** (`drivesStore.resetAll`, `piratesStore.resetToDefaults`, `settingsStore.reset`). Done after the server is confirmed clean so the UI doesn't briefly show defaults that a focus pull would re-hydrate away.
4. **Pull** to confirm canonical server state.

If no family is loaded (`authStore.family` is null), the helper just clears the queue and resets the three local stores — local-only mode has nothing server-side to wipe.

## 7. Error flow summary

```
UI write         drivesStore / piratesStore / settingsStore
   │
   ▼
syncStore.enqueue(kind, payload)     ← serialized under the queue mutex
   │
   ▼
syncStore.flush()  (fire-and-forget at write-site, or triggered later)
   │
   ▼
flushQueue()  ← src/sync/worker.ts
   │
   ├── offline or already-syncing? → return
   │
   ├── for each head item:
   │     dispatch(head) → api/*.ts → supabase
   │       │
   │       ├── success → drop item, continue
   │       ├── 23505 / CONFLICT → drop item, continue
   │       ├── non-transient (FORBIDDEN, NOT_FOUND, UNAUTHENTICATED)
   │       │     → drop item, continue
   │       └── transient (NETWORK, UNKNOWN)
   │             → bump attempts, keep at head, stop flush
   │
   └── stamp lastSyncAt
```

The "drop permanent failures and continue" policy is deliberate: one write rejected by RLS or validation shouldn't block every subsequent unrelated write. The tradeoff is that a permanent failure is silent from the UI's perspective (the drive appears to sync, but its participants/unlock row wasn't accepted). The only surfaces that would hint at it today are the browser console (`console.warn` from the enqueue path) and the offline indicator — and the indicator only shows queue depth, not failure history. If you ever see an unlock missing from `island_unlocked` despite a drive existing, check console logs.
