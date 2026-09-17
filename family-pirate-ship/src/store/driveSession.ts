/**
 * Durable snapshot of an in-flight voyage.
 *
 * Why this exists: a voyage lives entirely in `drivesStore`, which is
 * in-memory. Android — and iOS under memory pressure — discards a
 * backgrounded tab outright, and Chrome then reloads it from the URL when
 * the family comes back. Before this module that reload landed on
 * /drive/active against a freshly-constructed store: same screen, timer at
 * zero, voyage gone. Distinct from the v10 suspension fix, which handles a
 * tab that stays alive with its timers frozen.
 *
 * Only the in-flight drive is persisted. Accumulated state (`drives`,
 * `unlockedIslandIds`, `latestUnlock`, `latestFind`) is deliberately left
 * out: it is server-owned and `sync/pull` re-hydrates it, so caching it here
 * would fight the pull's server-wins resolution.
 *
 * localStorage rather than the idb-keyval used by the sync queue, because
 * the writes that matter most happen in `pagehide` / `freeze` handlers
 * moments before the tab is destroyed. A synchronous write lands; an async
 * IndexedDB transaction may never flush.
 */
import type { DrivesState } from './drivesStore';

export const DRIVE_SESSION_KEY = 'pirate-ship-drive-session-v1';

/**
 * A resumed voyage credits the entire eviction gap to whoever was active
 * when the tab died — the same rule, resting on the same assumption, as the
 * visibility-change catch-up: the music kept playing while the phone sat in
 * a pocket. That assumption expires. A tab discarded at bedtime and reopened
 * the next morning must not hand someone an eight-hour voyage, so past this
 * cutoff the snapshot is dropped and the family starts fresh.
 */
export const RESUME_MAX_GAP_MS = 2 * 60 * 60 * 1000;

/**
 * Ceiling on how long a tick-driven write can be deferred. Throttling costs
 * nothing: `minutes` and `lastTickAt` are written as a pair, so a restore
 * credits (now − lastTickAt) to the active pirate through the store's normal
 * wall-clock tick, recovering the un-written tail along with the time the tab
 * spent discarded. Only a change that would misdirect that arithmetic — a
 * tap, a roll-call edit, drive start or end — has to bypass the throttle.
 */
export const SAVE_INTERVAL_MS = 5000;

interface DriveSnapshot {
    v: 1;
    active: boolean[];
    minutes: number[];
    tapCounts: number[];
    currentIdx: number;
    driveStartedAt: number | null;
    lastTickAt: number;
}

/** The slice of store state a restored voyage replaces. */
export type RestoredDrive = Pick<
    DrivesState,
    | 'active'
    | 'minutes'
    | 'tapCounts'
    | 'currentIdx'
    | 'driveInProgress'
    | 'driveStartedAt'
    | 'lastTickAt'
>;

function isNumberTriple(v: unknown): v is number[] {
    return (
        Array.isArray(v) &&
        v.length === 3 &&
        v.every((n) => typeof n === 'number' && Number.isFinite(n))
    );
}

function isBooleanTriple(v: unknown): v is boolean[] {
    return Array.isArray(v) && v.length === 3 && v.every((b) => typeof b === 'boolean');
}

/**
 * True when a snapshot is currently on disk. Lets the persistence hook skip
 * pointless `removeItem` calls on every store change outside a voyage.
 */
export function hasDriveSession(): boolean {
    try {
        return localStorage.getItem(DRIVE_SESSION_KEY) !== null;
    } catch {
        return false;
    }
}

export function clearDriveSession(): void {
    try {
        localStorage.removeItem(DRIVE_SESSION_KEY);
    } catch {
        /* storage disabled — nothing was written either */
    }
}

export function saveDriveSession(s: DrivesState): void {
    if (!s.driveInProgress || s.lastTickAt === null) return;
    const snapshot: DriveSnapshot = {
        v: 1,
        active: s.active,
        minutes: s.minutes,
        tapCounts: s.tapCounts,
        currentIdx: s.currentIdx,
        driveStartedAt: s.driveStartedAt,
        lastTickAt: s.lastTickAt,
    };
    try {
        localStorage.setItem(DRIVE_SESSION_KEY, JSON.stringify(snapshot));
    } catch {
        // Quota exhausted, or Safari private mode. A voyage that can't be
        // snapshotted is still a perfectly good voyage — don't break it.
    }
}

/**
 * Read back a resumable voyage, or null when there is nothing to resume.
 * Anything unreadable, malformed, or too old is discarded on the spot so a
 * bad snapshot can't wedge every future launch.
 *
 * Called at store-construction time, which is what lets /drive/active paint
 * the real timer on its first render instead of flashing zeros.
 */
export function loadDriveSession(): RestoredDrive | null {
    let raw: string | null;
    try {
        raw = localStorage.getItem(DRIVE_SESSION_KEY);
    } catch {
        return null;
    }
    if (!raw) return null;

    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        clearDriveSession();
        return null;
    }

    const s = parsed as Partial<DriveSnapshot> | null;
    if (
        !s ||
        s.v !== 1 ||
        !isBooleanTriple(s.active) ||
        !isNumberTriple(s.minutes) ||
        !isNumberTriple(s.tapCounts) ||
        typeof s.currentIdx !== 'number' ||
        typeof s.lastTickAt !== 'number' ||
        !Number.isFinite(s.lastTickAt)
    ) {
        clearDriveSession();
        return null;
    }

    const now = Date.now();
    if (now - s.lastTickAt > RESUME_MAX_GAP_MS) {
        clearDriveSession();
        return null;
    }

    return {
        active: s.active,
        minutes: s.minutes,
        tapCounts: s.tapCounts,
        currentIdx: s.currentIdx,
        driveInProgress: true,
        driveStartedAt:
            typeof s.driveStartedAt === 'number' && Number.isFinite(s.driveStartedAt)
                ? s.driveStartedAt
                : null,
        // Carried across as written, so the next tick credits the discarded
        // stretch to the active pirate — that single subtraction is the whole
        // catch-up. Clamped forward if the snapshot somehow sits in the future
        // (device clock moved backwards), which would otherwise credit a
        // negative number of seconds.
        lastTickAt: Math.min(s.lastTickAt, now),
    };
}
