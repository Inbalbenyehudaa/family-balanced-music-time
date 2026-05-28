import { create } from 'zustand';
import { tierV3ToLegacy } from '../types';
import type { CoastalFind, Drive, DriveRecord, Island, Pirate } from '../types';
import { COASTAL_FINDS, ISLANDS } from '../data';
import { calculateBalance } from '../lib/balance';
import { useSettingsStore } from './settingsStore';
import { useAuthStore } from './authStore';
import { useSyncStore } from './syncStore';

export interface DrivesState {
    // Drive timer state
    active: boolean[];
    minutes: number[];
    tapCounts: number[];
    currentIdx: number;
    driveInProgress: boolean;
    driveStartedAt: number | null;
    // Wall-clock anchor of the last tick. The tick credits (now − lastTickAt)
    // seconds to the active pirate so a backgrounded/suspended tab catches up
    // on return instead of losing the time it spent suspended.
    lastTickAt: number | null;

    // Accumulated state
    drives: Drive[];
    unlockedIslandIds: string[];
    latestUnlock: Island | null;
    latestFind: CoastalFind | null;

    // Drive lifecycle
    startDrive: (active: boolean[]) => void;
    setCurrentIdx: (i: number) => void;
    tick: (speed: number) => void;
    endDrive: (pirates: Pirate[]) => Promise<void>;
    cancelDrive: () => void;

    // Demo / tweak setters
    setMinutes: (m: number[]) => void;
    setActive: (a: boolean[]) => void;
    setUnlockedIslandIds: (ids: string[]) => void;
    setLatestUnlock: (i: Island | null) => void;
    setLatestFind: (f: CoastalFind | null) => void;

    resetAll: () => void;
}

const initialState = {
    active: [true, true, true],
    minutes: [0, 0, 0],
    tapCounts: [0, 0, 0],
    currentIdx: -1,
    driveInProgress: false,
    driveStartedAt: null as number | null,
    lastTickAt: null as number | null,
    drives: [] as Drive[],
    unlockedIslandIds: [] as string[],
    latestUnlock: null as Island | null,
    latestFind: null as CoastalFind | null,
};

export const useDrivesStore = create<DrivesState>((set, get) => ({
    ...initialState,

    startDrive: (active) =>
        set({
            active,
            minutes: [0, 0, 0],
            tapCounts: [0, 0, 0],
            currentIdx: -1,
            driveInProgress: true,
            driveStartedAt: Date.now(),
            lastTickAt: Date.now(),
        }),

    setCurrentIdx: (i) =>
        set((state) => {
            const now = Date.now();
            const last = state.lastTickAt ?? now;
            const elapsedSec = (now - last) / 1000;

            // Settle wall-clock delta onto the OUTGOING pirate before switching;
            // otherwise the time accumulated since the last tick gets handed to
            // whoever the user just tapped. Settle at speed=1 — demo-fast-clock
            // is dev-only and under-crediting by ~7s on a tap-switch is fine.
            let nextMinutes = state.minutes;
            if (
                state.currentIdx >= 0 &&
                state.active[state.currentIdx] &&
                elapsedSec > 0
            ) {
                nextMinutes = [...state.minutes];
                nextMinutes[state.currentIdx] += elapsedSec;
            }

            if (i < 0 || i === state.currentIdx) {
                return { currentIdx: i, minutes: nextMinutes, lastTickAt: now };
            }
            // Tap counts as a switch to this pirate.
            const tapCounts = [...state.tapCounts];
            tapCounts[i] = (tapCounts[i] ?? 0) + 1;
            return { currentIdx: i, minutes: nextMinutes, tapCounts, lastTickAt: now };
        }),

    tick: (speed) =>
        set((state) => {
            const now = Date.now();
            const last = state.lastTickAt ?? now;
            const elapsedSec = (now - last) / 1000;
            // No active pirate selected → just advance the anchor; don't credit anyone.
            if (state.currentIdx < 0 || !state.active[state.currentIdx]) {
                return { lastTickAt: now };
            }
            const next = [...state.minutes];
            next[state.currentIdx] += elapsedSec * speed;
            return { minutes: next, lastTickAt: now };
        }),

    endDrive: async (pirates) => {
        // Settle the trailing partial second onto the active pirate before we
        // freeze the totals. speed=1 matches setCurrentIdx's settle and is
        // negligible under the dev-only fast clock.
        get().tick(1);
        const state = get();
        const { minutes, tapCounts, active, unlockedIslandIds, drives, driveStartedAt } =
            state;
        const { fairWindsThreshold, harborThreshold, minimumDriveMinutes } =
            useSettingsStore.getState().settings;

        // Edge: zero taps — nothing to record.
        const anyTaps = tapCounts.some((n) => n > 0);
        if (!anyTaps && minutes.every((m) => m === 0)) {
            set({ driveInProgress: false, currentIdx: -1 });
            return;
        }

        // Server-shaped balance + tier — single source of truth for the
        // tier both locally and on the server, so a pull-after-insert can't
        // silently flip the history row's tier.
        const balance = calculateBalance({
            totalsSeconds: minutes,
            active,
            fairWindsThreshold,
            harborThreshold,
            minimumDriveMinutes,
        });
        const legacyTier = tierV3ToLegacy(balance.tier);

        let unlock: Island | null = null;
        let find: CoastalFind | null = null;
        if (legacyTier === 'fair') {
            const locked = ISLANDS.filter((i) => !unlockedIslandIds.includes(i.id));
            unlock = locked[Math.floor(Math.random() * locked.length)] ?? null;
        } else if (legacyTier === 'coastal') {
            find = COASTAL_FINDS[Math.floor(Math.random() * COASTAL_FINDS.length)];
        }

        const endedAt = Date.now();
        const startedAt = driveStartedAt ?? endedAt;
        // Canonical unit everywhere below is whole seconds — tick speed is
        // already an integer per second, so Math.round handles the demo
        // fast-clock (speed=4) without drift. Using floor for display
        // minutes guarantees sum(perPirate) ≤ totalMin at every layer.
        const perPirateSec = minutes.map((s) => Math.round(s));
        const totalSeconds = perPirateSec.reduce((a, b) => a + b, 0);
        const totalMin = Math.floor(totalSeconds / 60);
        const perPirateMin = perPirateSec.map((s) => Math.floor(s / 60));
        const date = new Date(startedAt).toLocaleDateString('he-IL');
        const driveId =
            typeof crypto !== 'undefined' && 'randomUUID' in crypto
                ? crypto.randomUUID()
                : Math.random().toString(36).slice(2);

        const drive: Drive = {
            id: driveId,
            startedAt,
            endedAt,
            biggestShare: balance.biggestShare,
            date,
            totalMin,
            perPirate: perPirateMin,
            tier: legacyTier,
            islandId: unlock?.id,
            coastalFindId: find?.id,
        };

        // Optimistic local write first — reveal plays from this immediately.
        set({
            latestUnlock: unlock,
            latestFind: find,
            drives: [...drives, drive],
            unlockedIslandIds: unlock
                ? [...unlockedIslandIds, unlock.id]
                : unlockedIslandIds,
            driveInProgress: false,
        });

        // Enqueue the server writes. If auth isn't wired (local-only dev),
        // skip — the Phase 1 fake-user world doesn't have a family.id the
        // server would accept.
        const { family, user } = useAuthStore.getState();
        if (!family || !user) return;

        // Build the server-shaped DriveRecord. Participants are keyed by
        // pirate.serverId, which we only have after the family's pirates
        // have been pulled from the server.
        const participants = pirates
            .map((p, i) => ({
                pirateId: p.serverId,
                participated: !!active[i],
                // Seconds is the canonical unit; totalMinutes kept only for
                // backward compat with rows written before 0005 migration.
                totalSeconds: perPirateSec[i],
                totalMinutes: Math.floor(perPirateSec[i] / 60),
                tapCount: tapCounts[i] ?? 0,
            }))
            .filter(
                (p): p is {
                    pirateId: string;
                    participated: boolean;
                    totalSeconds: number;
                    totalMinutes: number;
                    tapCount: number;
                } => !!p.pirateId,
            );

        if (participants.length === 0) {
            // Pirates haven't been loaded from the server yet — skip the
            // server write. Next drive after refresh will persist.
            return;
        }

        const record: DriveRecord = {
            id: driveId,
            familyId: family.id,
            startedAt,
            endedAt,
            biggestShare: balance.biggestShare,
            tier: balance.tier,
            islandUnlockedId: unlock?.id,
            coastalFindId: find?.id,
            createdByUserId: user.id,
            participants,
        };

        try {
            const sync = useSyncStore.getState();
            await sync.enqueue('insert_drive', record);
            if (unlock) {
                await sync.enqueue('unlock_island', {
                    familyId: family.id,
                    islandId: unlock.id,
                    driveId,
                });
            }
            if (find) {
                await sync.enqueue('find_coastal', {
                    familyId: family.id,
                    findId: find.id,
                    driveId,
                });
            }
            // Fire-and-forget flush; worker handles offline + failures.
            sync.flush().catch(() => {});
        } catch (err) {
            console.warn('[drivesStore] enqueue failed', err);
        }
    },

    cancelDrive: () =>
        set({
            minutes: [0, 0, 0],
            tapCounts: [0, 0, 0],
            currentIdx: -1,
            driveInProgress: false,
            driveStartedAt: null,
            lastTickAt: null,
        }),

    setMinutes: (m) => set({ minutes: m }),
    setActive: (a) => set({ active: a }),
    setUnlockedIslandIds: (ids) => set({ unlockedIslandIds: ids }),
    setLatestUnlock: (i) => set({ latestUnlock: i }),
    setLatestFind: (f) => set({ latestFind: f }),

    resetAll: () => set({ ...initialState }),
}));
