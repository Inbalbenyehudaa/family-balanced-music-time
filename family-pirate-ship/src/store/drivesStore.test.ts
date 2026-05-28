import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDrivesStore } from './drivesStore';
import { useAuthStore } from './authStore';
import { useSyncStore } from './syncStore';
import type { Pirate } from '../types';

const PIRATES: Pirate[] = [
    { kind: 'kid', role: 'kid', name: 'Kid', color: '#E63946', serverId: 'p-kid' },
    { kind: 'mom', role: 'mom', name: 'Mom', color: '#2A9D8F', serverId: 'p-mom' },
    { kind: 'dad', role: 'dad', name: 'Dad', color: '#7B4B94', serverId: 'p-dad' },
];

function resetStores() {
    useDrivesStore.getState().resetAll();
    // Tests that bypass startDrive (writing minutes directly via setState) need
    // a wall-clock anchor so endDrive's settle-tick credits ~0s, not garbage.
    useDrivesStore.setState({ lastTickAt: Date.now() });
    useAuthStore.setState({
        user: { id: 'u1', email: 'a@b.c', displayName: 'A' },
        family: {
            id: 'f1',
            name: 'Fam',
            ownerUserId: 'u1',
            createdAt: 0,
            updatedAt: 0,
        },
        members: [],
        role: 'owner',
        isLoading: false,
    });
    // Replace syncStore's enqueue/flush with spies.
    useSyncStore.setState({
        enqueue: vi.fn().mockResolvedValue(undefined),
        flush: vi.fn().mockResolvedValue(undefined),
        clear: vi.fn().mockResolvedValue(undefined),
    } as Partial<ReturnType<typeof useSyncStore.getState>>);
}

beforeEach(() => {
    resetStores();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('drivesStore.endDrive', () => {
    it('does nothing when no taps were made', async () => {
        const s = useDrivesStore.getState();
        s.startDrive([true, true, true]);
        // No taps, no ticks — drive is empty.
        await s.endDrive(PIRATES);
        expect(useDrivesStore.getState().drives).toHaveLength(0);
        const sync = useSyncStore.getState();
        expect(sync.enqueue).not.toHaveBeenCalled();
    });

    it('records a local drive and enqueues an insert_drive on any tap', async () => {
        const s = useDrivesStore.getState();
        s.startDrive([true, true, true]);
        // Simulate the kid driving for 130s.
        useDrivesStore.setState({
            currentIdx: 0,
            tapCounts: [1, 0, 0],
            minutes: [130, 0, 0],
            lastTickAt: Date.now(),
        });
        await useDrivesStore.getState().endDrive(PIRATES);

        const drives = useDrivesStore.getState().drives;
        expect(drives).toHaveLength(1);
        expect(drives[0].id).toBeDefined();
        expect(drives[0].totalMin).toBeGreaterThan(0);

        const sync = useSyncStore.getState();
        const calls = (sync.enqueue as unknown as ReturnType<typeof vi.fn>).mock.calls;
        const kinds = calls.map((c) => c[0]);
        expect(kinds).toContain('insert_drive');
    });

    it('enqueues unlock_island when the tier is fair', async () => {
        // A perfectly balanced drive clears the default fair-winds threshold.
        const s = useDrivesStore.getState();
        s.startDrive([true, true, true]);
        useDrivesStore.setState({
            currentIdx: 0,
            tapCounts: [1, 1, 1],
            minutes: [120, 120, 120],
            lastTickAt: Date.now(),
        });
        await useDrivesStore.getState().endDrive(PIRATES);

        const drives = useDrivesStore.getState().drives;
        expect(drives[0].tier).toBe('fair');
        // An island must have been unlocked.
        expect(useDrivesStore.getState().unlockedIslandIds).toHaveLength(1);

        const sync = useSyncStore.getState();
        const calls = (sync.enqueue as unknown as ReturnType<typeof vi.fn>).mock.calls;
        const kinds = calls.map((c) => c[0]);
        expect(kinds).toContain('insert_drive');
        expect(kinds).toContain('unlock_island');
    });

    it('enqueues find_coastal when the tier is coastal', async () => {
        const s = useDrivesStore.getState();
        s.startDrive([true, true, true]);
        // Lopsided: kid 70%, mom/dad 15% each → coastal
        useDrivesStore.setState({
            currentIdx: 0,
            tapCounts: [1, 1, 1],
            minutes: [210, 45, 45],
            lastTickAt: Date.now(),
        });
        await useDrivesStore.getState().endDrive(PIRATES);

        const drives = useDrivesStore.getState().drives;
        expect(drives[0].tier).toBe('coastal');

        const sync = useSyncStore.getState();
        const calls = (sync.enqueue as unknown as ReturnType<typeof vi.fn>).mock.calls;
        const kinds = calls.map((c) => c[0]);
        expect(kinds).toContain('insert_drive');
        expect(kinds).toContain('find_coastal');
        expect(kinds).not.toContain('unlock_island');
    });

    it('computes per-participant minutes in kid/mom/dad order and sends seconds + minutes to the server', async () => {
        // Units of `minutes` in the store are SECONDS (the tick accumulator
        // increments by 1 each second). Convert to display minutes with
        // Math.floor so max(perPirate) ≤ totalMin always holds.
        const s = useDrivesStore.getState();
        s.startDrive([true, true, true]);
        useDrivesStore.setState({
            currentIdx: 0,
            tapCounts: [3, 1, 2],
            minutes: [180, 120, 90],
            lastTickAt: Date.now(),
        });
        await useDrivesStore.getState().endDrive(PIRATES);

        const drive = useDrivesStore.getState().drives[0];
        // perPirate = floor(seconds/60) — 90s floors to 1, not rounds to 2.
        expect(drive.perPirate).toEqual([3, 2, 1]);
        expect(drive.totalMin).toBe(6); // floor((180+120+90)/60) = floor(6.5) = 6
        // Invariant the old bug broke: max per-pirate ≤ total minutes.
        expect(Math.max(...drive.perPirate)).toBeLessThanOrEqual(drive.totalMin);

        const sync = useSyncStore.getState();
        const calls = (sync.enqueue as unknown as ReturnType<typeof vi.fn>).mock.calls;
        const insertCall = calls.find((c) => c[0] === 'insert_drive');
        expect(insertCall).toBeDefined();
        const record = insertCall![1] as {
            participants: Array<{
                pirateId: string;
                totalMinutes: number;
                totalSeconds: number;
                tapCount: number;
                participated: boolean;
            }>;
        };
        const byId = new Map(record.participants.map((p) => [p.pirateId, p]));
        // totalSeconds is canonical; totalMinutes is floor(seconds/60).
        expect(byId.get('p-kid')).toEqual({
            pirateId: 'p-kid',
            participated: true,
            totalSeconds: 180,
            totalMinutes: 3,
            tapCount: 3,
        });
        expect(byId.get('p-mom')).toEqual({
            pirateId: 'p-mom',
            participated: true,
            totalSeconds: 120,
            totalMinutes: 2,
            tapCount: 1,
        });
        expect(byId.get('p-dad')).toEqual({
            pirateId: 'p-dad',
            participated: true,
            totalSeconds: 90,
            totalMinutes: 1,
            tapCount: 2,
        });
    });

    it('keeps max(perPirate) ≤ totalMin for adversarial rounding inputs', async () => {
        // The old Math.round-based math produced max=1, total=2 locally and
        // max=1, total=3 after pull (sum of rounded-up integers). With floor
        // the invariant holds at both layers: here 3×31s = 93s = 1 min total,
        // and each pirate's 31s floors to 0.
        const s = useDrivesStore.getState();
        s.startDrive([true, true, true]);
        useDrivesStore.setState({
            currentIdx: 0,
            tapCounts: [1, 1, 1],
            minutes: [31, 31, 31],
            lastTickAt: Date.now(),
        });
        await useDrivesStore.getState().endDrive(PIRATES);

        const drive = useDrivesStore.getState().drives[0];
        expect(drive.perPirate).toEqual([0, 0, 0]);
        expect(drive.totalMin).toBe(1);
        expect(Math.max(...drive.perPirate)).toBeLessThanOrEqual(drive.totalMin);
    });

    it('marks inactive pirates as not-participated with zero minutes', async () => {
        // Only the kid sailed today — mom stayed ashore.
        const s = useDrivesStore.getState();
        s.startDrive([true, false, true]);
        useDrivesStore.setState({
            currentIdx: 0,
            tapCounts: [2, 0, 1],
            minutes: [240, 0, 60],
            lastTickAt: Date.now(),
        });
        await useDrivesStore.getState().endDrive(PIRATES);

        const drive = useDrivesStore.getState().drives[0];
        expect(drive.perPirate).toEqual([4, 0, 1]);

        const sync = useSyncStore.getState();
        const calls = (sync.enqueue as unknown as ReturnType<typeof vi.fn>).mock.calls;
        const insertCall = calls.find((c) => c[0] === 'insert_drive')!;
        const record = insertCall[1] as {
            participants: Array<{
                pirateId: string;
                totalMinutes: number;
                totalSeconds: number;
                participated: boolean;
            }>;
        };
        const mom = record.participants.find((p) => p.pirateId === 'p-mom');
        expect(mom).toEqual(
            expect.objectContaining({
                participated: false,
                totalSeconds: 0,
                totalMinutes: 0,
            }),
        );
    });

    it('skips server enqueue when pirates lack serverIds (pre-sign-in)', async () => {
        const piratesWithoutIds = PIRATES.map((p) => ({ ...p, serverId: undefined }));
        const s = useDrivesStore.getState();
        s.startDrive([true, true, true]);
        useDrivesStore.setState({
            currentIdx: 0,
            tapCounts: [1, 0, 0],
            minutes: [130, 0, 0],
            lastTickAt: Date.now(),
        });
        await useDrivesStore.getState().endDrive(piratesWithoutIds);

        // Local state still updates.
        expect(useDrivesStore.getState().drives).toHaveLength(1);
        // But no server enqueue.
        const sync = useSyncStore.getState();
        expect(sync.enqueue).not.toHaveBeenCalled();
    });

    it('credits elapsed wall-clock time on tick after a long gap (mobile suspension)', () => {
        vi.useFakeTimers();
        const t0 = 1_700_000_000_000;
        vi.setSystemTime(t0);

        const s = useDrivesStore.getState();
        s.startDrive([true, true, true]);
        useDrivesStore.setState({ currentIdx: 0, lastTickAt: t0 });

        // Simulate 5 minutes of OS-suspended JS — no ticks fired.
        vi.setSystemTime(t0 + 5 * 60 * 1000);

        // The interval fires (or visibilitychange does) on return.
        useDrivesStore.getState().tick(1);

        const minutes = useDrivesStore.getState().minutes;
        // Kid (idx 0) should have ~300s credited. Allow 1s slop for fake-timer math.
        expect(minutes[0]).toBeGreaterThanOrEqual(299);
        expect(minutes[0]).toBeLessThanOrEqual(301);

        vi.useRealTimers();
    });

    it('settles in-flight wall-clock time onto the outgoing pirate when switching', () => {
        vi.useFakeTimers();
        const t0 = 1_700_000_000_000;
        vi.setSystemTime(t0);

        const s = useDrivesStore.getState();
        s.startDrive([true, true, true]);
        useDrivesStore.setState({ currentIdx: 0, lastTickAt: t0 });

        // 30s pass on the kid…
        vi.setSystemTime(t0 + 30_000);
        // …then user taps mom.
        useDrivesStore.getState().setCurrentIdx(1);

        const minutes = useDrivesStore.getState().minutes;
        // The 30s belong to the kid (outgoing), not mom (incoming).
        expect(minutes[0]).toBeGreaterThanOrEqual(29);
        expect(minutes[0]).toBeLessThanOrEqual(31);
        expect(minutes[1]).toBe(0);

        vi.useRealTimers();
    });
});
