import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScreenMap } from '../screens/Map';
import { ScreenReveal } from '../screens/Reveal';
import { ScreenSettings, type SettingsValues } from '../screens/Settings';
import { ScreenSpyglass } from '../screens/Spyglass';
import { useAuthStore } from '../store/authStore';
import { useDrivesStore } from '../store/drivesStore';
import { useSettingsStore } from '../store/settingsStore';
import { useSyncStore } from '../store/syncStore';
import { ISLANDS } from '../data';
import { DEFAULT_SETTINGS, type Pirate } from '../types';

// ─── Fixtures ─────────────────────────────────────────────────────────────

const PIRATES: Pirate[] = [
    { kind: 'kid', role: 'kid', name: 'Kid', color: '#E63946', serverId: 'p-kid' },
    { kind: 'mom', role: 'mom', name: 'Mom', color: '#2A9D8F', serverId: 'p-mom' },
    { kind: 'dad', role: 'dad', name: 'Dad', color: '#7B4B94', serverId: 'p-dad' },
];

/** Reset every store the end-to-end pipeline touches + stub Supabase-backed
 *  auth and sync layers so tests run deterministically. Pattern mirrors
 *  drivesStore.test.ts:13-34; we additionally reset settings (to lock the
 *  thresholds the scenario rows rely on). */
function resetStores() {
    useDrivesStore.getState().resetAll();
    useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS } });
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
    useSyncStore.setState({
        enqueue: vi.fn().mockResolvedValue(undefined),
        flush: vi.fn().mockResolvedValue(undefined),
        clear: vi.fn().mockResolvedValue(undefined),
    } as Partial<ReturnType<typeof useSyncStore.getState>>);
}

function buildSettingsValues(): SettingsValues {
    return {
        fairThreshold: DEFAULT_SETTINGS.fairWindsThreshold,
        harborThreshold: DEFAULT_SETTINGS.harborThreshold,
        audio: DEFAULT_SETTINGS.audioEnabled,
        fog: DEFAULT_SETTINGS.fogEnabled,
        demoFastClock: false,
        pirates: PIRATES,
    };
}

function getEnqueueKinds(): string[] {
    const sync = useSyncStore.getState();
    const calls = (sync.enqueue as unknown as ReturnType<typeof vi.fn>).mock.calls;
    return calls.map((c) => c[0]);
}

// ─── Suite ────────────────────────────────────────────────────────────────

beforeEach(() => {
    resetStores();
    // Deterministic island / coastal-find selection: the first locked item
    // from the catalog is always picked (ISLANDS[0], COASTAL_FINDS[0]).
    vi.spyOn(Math, 'random').mockReturnValue(0);
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
});

// ─── Harbor ───────────────────────────────────────────────────────────────

describe('Harbor tier end-to-end', () => {
    const active = [true, true, true];
    const minutesSeed = [240, 30, 30]; // 80% kid → harbor

    it('renders the harbor banner on Spyglass (pre-endDrive)', () => {
        useDrivesStore.setState({ active, minutes: minutesSeed });
        render(
            <ScreenSpyglass
                pirates={PIRATES}
                active={active}
                minutes={minutesSeed}
                onClose={() => {}}
            />,
        );
        expect(screen.getByText('מישהו משתלט, אתם לא זזים')).toBeTruthy();
    });

    describe('after endDrive', () => {
        beforeEach(async () => {
            useDrivesStore.setState({
                active,
                minutes: minutesSeed,
                tapCounts: [1, 1, 1],
                currentIdx: 0,
                driveInProgress: true,
                driveStartedAt: Date.now(),
            });
            await useDrivesStore.getState().endDrive(PIRATES);
        });

        it('stores a harbor drive with no unlock or coastal find', () => {
            const { drives, unlockedIslandIds, latestUnlock, latestFind } =
                useDrivesStore.getState();
            expect(drives).toHaveLength(1);
            expect(drives[0].tier).toBe('harbor');
            expect(drives[0].islandId).toBeUndefined();
            expect(drives[0].coastalFindId).toBeUndefined();
            expect(unlockedIslandIds).toHaveLength(0);
            expect(latestUnlock).toBeNull();
            expect(latestFind).toBeNull();
        });

        it('enqueues only insert_drive (no unlock / no coastal)', () => {
            const kinds = getEnqueueKinds();
            expect(kinds).toContain('insert_drive');
            expect(kinds).not.toContain('unlock_island');
            expect(kinds).not.toContain('find_coastal');
        });

        it('Reveal shows the harbor verdict and no island / find visual', () => {
            vi.useFakeTimers();
            render(
                <ScreenReveal
                    pirates={PIRATES}
                    active={active}
                    minutes={minutesSeed}
                    unlockIsland={null}
                    coastalFind={null}
                    onDone={() => {}}
                />,
            );
            act(() => {
                vi.advanceTimersByTime(9500);
            });
            expect(
                screen.getByText('נתקעתם בנמל - נסו לחלוק יותר פעם הבאה'),
            ).toBeTruthy();
            // No island name surfaced as a label, no coastal-find name either.
            expect(screen.queryByText(ISLANDS[0].name)).toBeNull();
        });

        it('Settings history row uses the harbor Hebrew label', () => {
            const drives = useDrivesStore.getState().drives;
            render(
                <ScreenSettings
                    onBack={() => {}}
                    settings={buildSettingsValues()}
                    setSettings={() => {}}
                    drives={drives}
                    onReset={() => {}}
                />,
            );
            expect(screen.getByText('⚓ נמל')).toBeTruthy();
        });

        it('Map renders zero unlocked islands', () => {
            const { unlockedIslandIds, drives } = useDrivesStore.getState();
            const { container } = render(
                <ScreenMap
                    unlockedIds={unlockedIslandIds}
                    drives={drives}
                    onBack={() => {}}
                    onIslandTap={() => {}}
                />,
            );
            // Unlocked islands render with the `animate-soft-pulse` wrapper.
            const unlocked = container.querySelectorAll('.animate-soft-pulse');
            expect(unlocked.length).toBe(0);
        });
    });
});

// ─── Coastal ──────────────────────────────────────────────────────────────

describe('Coastal tier end-to-end', () => {
    const active = [true, true, true];
    const minutesSeed = [210, 45, 45]; // 70% kid → coastal

    it('renders the coastal banner on Spyglass (pre-endDrive)', () => {
        useDrivesStore.setState({ active, minutes: minutesSeed });
        render(
            <ScreenSpyglass
                pirates={PIRATES}
                active={active}
                minutes={minutesSeed}
                onClose={() => {}}
            />,
        );
        expect(screen.getByText('🌊 הספינה קצת נטויה...אזנו את הזמן')).toBeTruthy();
    });

    describe('after endDrive', () => {
        beforeEach(async () => {
            useDrivesStore.setState({
                active,
                minutes: minutesSeed,
                tapCounts: [1, 1, 1],
                currentIdx: 0,
                driveInProgress: true,
                driveStartedAt: Date.now(),
            });
            await useDrivesStore.getState().endDrive(PIRATES);
        });

        it('stores a coastal drive with a coastal find but no unlock', () => {
            const { drives, unlockedIslandIds, latestUnlock, latestFind } =
                useDrivesStore.getState();
            expect(drives[0].tier).toBe('coastal');
            expect(drives[0].coastalFindId).toBeDefined();
            expect(drives[0].islandId).toBeUndefined();
            expect(unlockedIslandIds).toHaveLength(0);
            expect(latestUnlock).toBeNull();
            expect(latestFind).not.toBeNull();
        });

        it('enqueues find_coastal and insert_drive, not unlock_island', () => {
            const kinds = getEnqueueKinds();
            expect(kinds).toContain('insert_drive');
            expect(kinds).toContain('find_coastal');
            expect(kinds).not.toContain('unlock_island');
        });

        it('Reveal shows the coastal verdict and the find name', () => {
            vi.useFakeTimers();
            const find = useDrivesStore.getState().latestFind;
            render(
                <ScreenReveal
                    pirates={PIRATES}
                    active={active}
                    minutes={minutesSeed}
                    unlockIsland={null}
                    coastalFind={find}
                    onDone={() => {}}
                />,
            );
            act(() => {
                vi.advanceTimersByTime(9500);
            });
            expect(
                screen.getByText('האזנה קצת נטויה - מצאתם משהו על החוף!'),
            ).toBeTruthy();
            expect(find).not.toBeNull();
            expect(screen.getByText(find!.name)).toBeTruthy();
        });

        it('Settings history row uses the coastal Hebrew label', () => {
            const drives = useDrivesStore.getState().drives;
            render(
                <ScreenSettings
                    onBack={() => {}}
                    settings={buildSettingsValues()}
                    setSettings={() => {}}
                    drives={drives}
                    onReset={() => {}}
                />,
            );
            expect(screen.getByText('🌊 חוף')).toBeTruthy();
        });

        it('Map renders zero unlocked islands (coastal does not unlock)', () => {
            const { unlockedIslandIds, drives } = useDrivesStore.getState();
            const { container } = render(
                <ScreenMap
                    unlockedIds={unlockedIslandIds}
                    drives={drives}
                    onBack={() => {}}
                    onIslandTap={() => {}}
                />,
            );
            expect(container.querySelectorAll('.animate-soft-pulse').length).toBe(0);
        });
    });
});

// ─── Fair ─────────────────────────────────────────────────────────────────

describe('Fair tier end-to-end', () => {
    const active = [true, true, true];
    const minutesSeed = [120, 120, 120]; // balanced → fair

    it('renders the fair banner on Spyglass (pre-endDrive)', () => {
        useDrivesStore.setState({ active, minutes: minutesSeed });
        render(
            <ScreenSpyglass
                pirates={PIRATES}
                active={active}
                minutes={minutesSeed}
                onClose={() => {}}
            />,
        );
        expect(screen.getByText('⛵ רוח גבית! זמן האזנה שווה')).toBeTruthy();
    });

    describe('after endDrive', () => {
        beforeEach(async () => {
            useDrivesStore.setState({
                active,
                minutes: minutesSeed,
                tapCounts: [1, 1, 1],
                currentIdx: 0,
                driveInProgress: true,
                driveStartedAt: Date.now(),
            });
            await useDrivesStore.getState().endDrive(PIRATES);
        });

        it('stores a fair drive with exactly one new unlock (deterministic = ISLANDS[0])', () => {
            const { drives, unlockedIslandIds, latestUnlock, latestFind } =
                useDrivesStore.getState();
            expect(drives[0].tier).toBe('fair');
            expect(drives[0].islandId).toBe(ISLANDS[0].id);
            expect(drives[0].coastalFindId).toBeUndefined();
            expect(unlockedIslandIds).toEqual([ISLANDS[0].id]);
            expect(latestUnlock?.id).toBe(ISLANDS[0].id);
            expect(latestFind).toBeNull();
        });

        it('enqueues insert_drive + unlock_island, not find_coastal', () => {
            const kinds = getEnqueueKinds();
            expect(kinds).toContain('insert_drive');
            expect(kinds).toContain('unlock_island');
            expect(kinds).not.toContain('find_coastal');
        });

        it('Reveal shows the fair verdict and the unlocked island name', () => {
            vi.useFakeTimers();
            const unlock = useDrivesStore.getState().latestUnlock;
            render(
                <ScreenReveal
                    pirates={PIRATES}
                    active={active}
                    minutes={minutesSeed}
                    unlockIsland={unlock}
                    coastalFind={null}
                    onDone={() => {}}
                />,
            );
            act(() => {
                vi.advanceTimersByTime(9500);
            });
            expect(screen.getByText('האזנה משותפת - אי חדש התגלה!')).toBeTruthy();
            expect(unlock).not.toBeNull();
            expect(screen.getByText(unlock!.name)).toBeTruthy();
        });

        it('Settings history row uses the fair Hebrew label', () => {
            const drives = useDrivesStore.getState().drives;
            render(
                <ScreenSettings
                    onBack={() => {}}
                    settings={buildSettingsValues()}
                    setSettings={() => {}}
                    drives={drives}
                    onReset={() => {}}
                />,
            );
            expect(screen.getByText('🌞 רוח גבית')).toBeTruthy();
        });

        it('Map renders exactly one unlocked island with its name label', () => {
            const { unlockedIslandIds, drives } = useDrivesStore.getState();
            const { container } = render(
                <ScreenMap
                    unlockedIds={unlockedIslandIds}
                    drives={drives}
                    onBack={() => {}}
                    onIslandTap={() => {}}
                />,
            );
            expect(container.querySelectorAll('.animate-soft-pulse').length).toBe(1);
            expect(screen.getByText(ISLANDS[0].name)).toBeTruthy();
        });
    });
});
