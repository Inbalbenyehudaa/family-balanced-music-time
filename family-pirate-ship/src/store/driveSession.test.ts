import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    DRIVE_SESSION_KEY,
    RESUME_MAX_GAP_MS,
    clearDriveSession,
    loadDriveSession,
    saveDriveSession,
} from './driveSession';
import { useDrivesStore } from './drivesStore';
import type { DrivesState } from './drivesStore';

/** A store state shaped like a voyage in progress. */
function inFlight(over: Partial<DrivesState> = {}): DrivesState {
    return {
        ...useDrivesStore.getState(),
        active: [true, true, false],
        minutes: [90, 30, 0],
        tapCounts: [2, 1, 0],
        currentIdx: 0,
        driveInProgress: true,
        driveStartedAt: Date.now() - 120_000,
        lastTickAt: Date.now(),
        ...over,
    };
}

beforeEach(() => {
    localStorage.clear();
    useDrivesStore.getState().resetAll();
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
});

describe('driveSession', () => {
    it('returns null when nothing has been stored', () => {
        expect(loadDriveSession()).toBeNull();
    });

    it('round-trips an in-flight voyage', () => {
        const state = inFlight();
        saveDriveSession(state);

        const restored = loadDriveSession();
        expect(restored).not.toBeNull();
        expect(restored).toMatchObject({
            active: [true, true, false],
            minutes: [90, 30, 0],
            tapCounts: [2, 1, 0],
            currentIdx: 0,
            driveInProgress: true,
            driveStartedAt: state.driveStartedAt,
            lastTickAt: state.lastTickAt,
        });
    });

    it('does not write anything when no voyage is in progress', () => {
        saveDriveSession(inFlight({ driveInProgress: false }));
        expect(localStorage.getItem(DRIVE_SESSION_KEY)).toBeNull();
    });

    it('does not write a voyage that has no wall-clock anchor', () => {
        saveDriveSession(inFlight({ lastTickAt: null }));
        expect(localStorage.getItem(DRIVE_SESSION_KEY)).toBeNull();
    });

    it('drops a snapshot older than the resume cutoff', () => {
        saveDriveSession(inFlight({ lastTickAt: Date.now() - RESUME_MAX_GAP_MS - 1000 }));

        expect(loadDriveSession()).toBeNull();
        // And it clears itself out, so a stale snapshot can't be re-examined
        // on every future launch.
        expect(localStorage.getItem(DRIVE_SESSION_KEY)).toBeNull();
    });

    it('resumes a snapshot that is just inside the cutoff', () => {
        const lastTickAt = Date.now() - RESUME_MAX_GAP_MS + 60_000;
        saveDriveSession(inFlight({ lastTickAt }));

        expect(loadDriveSession()?.lastTickAt).toBe(lastTickAt);
    });

    it('discards unparseable JSON', () => {
        localStorage.setItem(DRIVE_SESSION_KEY, '{not json');

        expect(loadDriveSession()).toBeNull();
        expect(localStorage.getItem(DRIVE_SESSION_KEY)).toBeNull();
    });

    it('discards a snapshot with a malformed shape', () => {
        localStorage.setItem(
            DRIVE_SESSION_KEY,
            JSON.stringify({
                v: 1,
                active: [true, true],
                minutes: [1, 2, 3],
                tapCounts: [0, 0, 0],
                currentIdx: 0,
                driveStartedAt: 0,
                lastTickAt: Date.now(),
            }),
        );

        expect(loadDriveSession()).toBeNull();
        expect(localStorage.getItem(DRIVE_SESSION_KEY)).toBeNull();
    });

    it('discards a snapshot written by a future schema version', () => {
        localStorage.setItem(
            DRIVE_SESSION_KEY,
            JSON.stringify({ ...inFlight(), v: 2, lastTickAt: Date.now() }),
        );

        expect(loadDriveSession()).toBeNull();
    });

    it('clamps an anchor that sits in the future, so the gap is never negative', () => {
        // Device clock moved backwards between the write and the read. Left
        // alone this would credit the active pirate a negative number of
        // seconds on the next tick.
        saveDriveSession(inFlight({ lastTickAt: Date.now() + 60_000 }));

        const restored = loadDriveSession();
        expect(restored).not.toBeNull();
        expect(restored!.lastTickAt).toBeLessThanOrEqual(Date.now());
    });

    it('survives storage being unavailable', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('QuotaExceededError');
        });
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('SecurityError');
        });

        expect(() => saveDriveSession(inFlight())).not.toThrow();
        expect(loadDriveSession()).toBeNull();
    });

    it('clearDriveSession removes the snapshot', () => {
        saveDriveSession(inFlight());
        expect(localStorage.getItem(DRIVE_SESSION_KEY)).not.toBeNull();

        clearDriveSession();
        expect(localStorage.getItem(DRIVE_SESSION_KEY)).toBeNull();
    });
});

describe('drivesStore resume', () => {
    it('rebuilds an interrupted voyage at store construction and credits the discarded gap', async () => {
        // The tab was discarded 5 minutes ago with the kid (idx 0) active and
        // 90s already on their clock.
        const discardedAt = Date.now() - 5 * 60_000;
        localStorage.setItem(
            DRIVE_SESSION_KEY,
            JSON.stringify({
                v: 1,
                active: [true, true, true],
                minutes: [90, 30, 0],
                tapCounts: [2, 1, 0],
                currentIdx: 0,
                driveStartedAt: discardedAt - 120_000,
                lastTickAt: discardedAt,
            }),
        );

        // Force a fresh module graph so the store runs its initializer against
        // the snapshot above — the same thing that happens on a cold reload
        // after the OS evicts the tab.
        vi.resetModules();
        const { useDrivesStore: resumed } = await import('./drivesStore');

        expect(resumed.getState().driveInProgress).toBe(true);
        expect(resumed.getState().minutes).toEqual([90, 30, 0]);
        expect(resumed.getState().tapCounts).toEqual([2, 1, 0]);
        expect(resumed.getState().currentIdx).toBe(0);

        // The first tick after the reload is what closes the gap: 5 minutes of
        // discarded time land on the pirate who was active, and nobody else
        // moves.
        resumed.getState().tick(1);
        const [kid, mom, dad] = resumed.getState().minutes;
        expect(kid).toBeGreaterThanOrEqual(90 + 300);
        expect(kid).toBeLessThan(90 + 305);
        expect(mom).toBe(30);
        expect(dad).toBe(0);
    });

    it('starts clean when the snapshot is too stale to resume', async () => {
        localStorage.setItem(
            DRIVE_SESSION_KEY,
            JSON.stringify({
                v: 1,
                active: [true, true, true],
                minutes: [600, 0, 0],
                tapCounts: [1, 0, 0],
                currentIdx: 0,
                driveStartedAt: Date.now() - RESUME_MAX_GAP_MS - 600_000,
                lastTickAt: Date.now() - RESUME_MAX_GAP_MS - 1000,
            }),
        );

        vi.resetModules();
        const { useDrivesStore: fresh } = await import('./drivesStore');

        expect(fresh.getState().driveInProgress).toBe(false);
        expect(fresh.getState().minutes).toEqual([0, 0, 0]);
    });
});

describe('driveSession — breaks', () => {
    it('round-trips a voyage that was paused mid-flight', () => {
        // Paused is the pair (currentIdx < 0 && pausedFrom >= 0) — both halves
        // have to survive, or the family comes back to a voyage that has
        // forgotten who was listening.
        const state = inFlight({ currentIdx: -1, pausedFrom: 1 });
        saveDriveSession(state);

        const restored = loadDriveSession();
        expect(restored).toMatchObject({ currentIdx: -1, pausedFrom: 1 });
    });

    it('reads a snapshot written before pausedFrom existed as not-on-a-break', () => {
        // The back-compat case that decides whether `v` could stay at 1. A
        // snapshot from the currently-deployed build has no pausedFrom key at
        // all; it must load, not be thrown away.
        localStorage.setItem(
            DRIVE_SESSION_KEY,
            JSON.stringify({
                v: 1,
                active: [true, true, true],
                minutes: [60, 20, 0],
                tapCounts: [1, 1, 0],
                currentIdx: 0,
                driveStartedAt: Date.now() - 90_000,
                lastTickAt: Date.now(),
            }),
        );

        const restored = loadDriveSession();
        expect(restored).not.toBeNull();
        expect(restored!.pausedFrom).toBe(-1);
        expect(restored!.minutes).toEqual([60, 20, 0]);
    });

    it('treats a malformed pausedFrom as not-on-a-break rather than discarding the voyage', () => {
        localStorage.setItem(
            DRIVE_SESSION_KEY,
            JSON.stringify({
                v: 1,
                active: [true, true, true],
                minutes: [60, 20, 0],
                tapCounts: [1, 1, 0],
                currentIdx: 0,
                pausedFrom: 'nonsense',
                driveStartedAt: Date.now() - 90_000,
                lastTickAt: Date.now(),
            }),
        );

        const restored = loadDriveSession();
        expect(restored).not.toBeNull();
        expect(restored!.pausedFrom).toBe(-1);
    });

    it('credits the eviction gap to nobody when the tab died mid-break', () => {
        vi.useFakeTimers();
        const t0 = 1_700_000_000_000;
        vi.setSystemTime(t0);

        saveDriveSession(
            inFlight({
                currentIdx: -1,
                pausedFrom: 0,
                minutes: [90, 30, 0],
                lastTickAt: t0,
            }),
        );

        // Android discards the tab; the family comes back 25 minutes later.
        vi.setSystemTime(t0 + 25 * 60_000);
        const restored = loadDriveSession()!;
        expect(restored.minutes).toEqual([90, 30, 0]);

        // And the first tick after the restore credits nobody, because the
        // voyage is still on a break.
        useDrivesStore.setState({ ...restored });
        useDrivesStore.getState().tick(1);
        expect(useDrivesStore.getState().minutes).toEqual([90, 30, 0]);
    });
});
