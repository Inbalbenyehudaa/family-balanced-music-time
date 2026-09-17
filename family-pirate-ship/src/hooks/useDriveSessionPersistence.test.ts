import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';
import { useDriveSessionPersistence } from './useDriveSessionPersistence';
import { useAuthStore } from '../store/authStore';
import { useDrivesStore } from '../store/drivesStore';
import { DRIVE_SESSION_KEY, SAVE_INTERVAL_MS } from '../store/driveSession';

function readSnapshot() {
    const raw = localStorage.getItem(DRIVE_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
}

const USER = { id: 'u1', email: 'a@b.c', displayName: 'A' };

beforeEach(() => {
    localStorage.clear();
    useDrivesStore.getState().resetAll();
    useAuthStore.setState({ user: USER, isLoading: false });
    vi.useFakeTimers();
});

afterEach(() => {
    // vitest runs with `globals: false`, so testing-library never registers
    // its automatic cleanup — without this, every hook rendered above stays
    // mounted and keeps writing snapshots into the next test.
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe('useDriveSessionPersistence', () => {
    it('writes nothing while no voyage is running', () => {
        renderHook(() => useDriveSessionPersistence());
        expect(readSnapshot()).toBeNull();
    });

    it('snapshots a voyage as soon as it starts', () => {
        renderHook(() => useDriveSessionPersistence());
        useDrivesStore.getState().startDrive([true, true, false]);

        expect(readSnapshot()).toMatchObject({
            v: 1,
            active: [true, true, false],
            currentIdx: -1,
            minutes: [0, 0, 0],
        });
    });

    it('throttles tick-driven writes but keeps minutes and the anchor in step', () => {
        renderHook(() => useDriveSessionPersistence());
        const s = useDrivesStore.getState();
        s.startDrive([true, true, true]);
        s.setCurrentIdx(0);

        const afterTap = readSnapshot();

        // Two seconds of ticking, well inside the throttle window.
        vi.advanceTimersByTime(1000);
        useDrivesStore.getState().tick(1);
        vi.advanceTimersByTime(1000);
        useDrivesStore.getState().tick(1);

        // Still the tap-time snapshot — but that is lossless, because the
        // saved `minutes` and `lastTickAt` are a matched pair.
        expect(readSnapshot().lastTickAt).toBe(afterTap.lastTickAt);

        // Past the interval, the next tick does write.
        vi.advanceTimersByTime(SAVE_INTERVAL_MS);
        useDrivesStore.getState().tick(1);

        const later = readSnapshot();
        expect(later.lastTickAt).toBeGreaterThan(afterTap.lastTickAt);
        expect(later.minutes[0]).toBeCloseTo(SAVE_INTERVAL_MS / 1000 + 2, 1);
    });

    it('bypasses the throttle when the active pirate changes', () => {
        renderHook(() => useDriveSessionPersistence());
        const s = useDrivesStore.getState();
        s.startDrive([true, true, true]);
        s.setCurrentIdx(0);
        vi.advanceTimersByTime(1000);

        // A tap inside the throttle window must still land immediately —
        // otherwise a discard right afterwards would credit the gap to the
        // pirate who just stopped listening.
        useDrivesStore.getState().setCurrentIdx(1);

        const snap = readSnapshot();
        expect(snap.currentIdx).toBe(1);
        expect(snap.tapCounts).toEqual([1, 1, 0]);
    });

    it('clears the snapshot when the voyage is cancelled', () => {
        renderHook(() => useDriveSessionPersistence());
        const s = useDrivesStore.getState();
        s.startDrive([true, true, true]);
        s.setCurrentIdx(0);
        expect(readSnapshot()).not.toBeNull();

        useDrivesStore.getState().cancelDrive();
        expect(readSnapshot()).toBeNull();
    });

    it('flushes on pagehide, so a discard right after backgrounding loses nothing', () => {
        renderHook(() => useDriveSessionPersistence());
        const s = useDrivesStore.getState();
        s.startDrive([true, true, true]);
        s.setCurrentIdx(0);
        const atTap = readSnapshot();

        vi.advanceTimersByTime(2000);
        useDrivesStore.getState().tick(1);
        window.dispatchEvent(new Event('pagehide'));

        const flushed = readSnapshot();
        expect(flushed.lastTickAt).toBeGreaterThan(atTap.lastTickAt);
        expect(flushed.minutes[0]).toBeCloseTo(2, 1);
    });

    it('flushes on freeze — the event Chrome fires before discarding a tab', () => {
        renderHook(() => useDriveSessionPersistence());
        const s = useDrivesStore.getState();
        s.startDrive([true, true, true]);
        s.setCurrentIdx(0);
        const atTap = readSnapshot();

        vi.advanceTimersByTime(3000);
        useDrivesStore.getState().tick(1);
        document.dispatchEvent(new Event('freeze'));

        expect(readSnapshot().lastTickAt).toBeGreaterThan(atTap.lastTickAt);
    });

    it('drops the voyage on sign-out so the next person does not inherit it', () => {
        renderHook(() => useDriveSessionPersistence());
        const s = useDrivesStore.getState();
        s.startDrive([true, true, true]);
        s.setCurrentIdx(0);
        expect(readSnapshot()).not.toBeNull();

        useAuthStore.setState({ user: null });

        expect(readSnapshot()).toBeNull();
        expect(useDrivesStore.getState().driveInProgress).toBe(false);
    });

    it('stops writing once unmounted', () => {
        const { unmount } = renderHook(() => useDriveSessionPersistence());
        unmount();

        useDrivesStore.getState().startDrive([true, true, true]);
        expect(readSnapshot()).toBeNull();
    });
});
