import { useMemo } from 'react';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { AppRoutes } from './routes';
import { TweaksPanel } from './TweaksPanel';
import { usePiratesStore } from './store/piratesStore';
import { useDrivesStore } from './store/drivesStore';
import { useSettingsStore } from './store/settingsStore';
import { useAuthBootstrap } from './hooks/useAuthBootstrap';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useSyncOnFocus } from './hooks/useSyncOnFocus';
import { tweakState } from './routes/tweakState';
import type { TweakValues, Screen } from './types';

/**
 * Responsive shell. `.app-shell` provides the centered content column
 * (max-width 560px) + the mobile/desktop backdrop treatment; screens paint
 * their own backgrounds inside it via <ScreenBackground>.
 */
export function App() {
    return (
        <BrowserRouter>
            <Shell />
        </BrowserRouter>
    );
}

function Shell() {
    useAuthBootstrap();
    useOnlineStatus();
    useSyncOnFocus();
    return (
        <>
            <div dir="rtl" lang="he" className="app-shell">
                <AppRoutes />
            </div>

            {import.meta.env.DEV && <DevTweaksBridge />}
        </>
    );
}

/**
 * Bridges the old TweaksPanel (which expects a `bridge` with setters) to
 * the new store-based world. The panel itself stays as-is so we don't lose
 * any of its existing dev affordances.
 */
function DevTweaksBridge() {
    const nav = useNavigate();
    const pirates = usePiratesStore((s) => s.pirates);
    const drives = useDrivesStore((s) => s.drives);
    const unlockedIslandIds = useDrivesStore((s) => s.unlockedIslandIds);
    const settings = useSettingsStore((s) => s.settings);
    const setSettings = useSettingsStore((s) => s.setSettings);

    // The panel's "values" slot is the old TweakValues shape; wire it to
    // the new settings store for the persistent fields, and to tweakState
    // for the dev-only demoFastClock.
    const values: TweakValues = useMemo(
        () => ({
            fairThreshold: settings.fairWindsThreshold,
            harborThreshold: settings.harborThreshold,
            audio: settings.audioEnabled,
            fog: settings.fogEnabled,
            demoFastClock: tweakState.demoFastClock,
        }),
        [settings],
    );

    const setValues = (patch: Partial<TweakValues>) => {
        if (patch.fairThreshold !== undefined)
            setSettings({ fairWindsThreshold: patch.fairThreshold });
        if (patch.harborThreshold !== undefined)
            setSettings({ harborThreshold: patch.harborThreshold });
        if (patch.audio !== undefined) setSettings({ audioEnabled: patch.audio });
        if (patch.fog !== undefined) setSettings({ fogEnabled: patch.fog });
        if (patch.demoFastClock !== undefined) tweakState.demoFastClock = patch.demoFastClock;
    };

    // Panel uses a flat `screen` string; translate it into a nav action.
    const screen: Screen = 'home'; // panel doesn't introspect this — only compares in button highlight
    const setScreen = (s: Screen) => {
        switch (s) {
            case 'welcome':
                return nav('/onboarding/welcome');
            case 'names':
                return nav('/onboarding/names');
            case 'crew':
                return nav('/onboarding/crew');
            case 'home':
                return nav('/home');
            case 'drive':
                return nav('/drive/active');
            case 'spyglass':
                return nav('/drive/spyglass');
            case 'reveal':
                return nav('/drive/reveal');
            case 'map':
                return nav('/map');
            case 'gate':
                return nav('/settings/gate');
            case 'settings':
                return nav('/settings');
        }
    };

    return (
        <TweaksPanel
            bridge={{
                values,
                setValues,
                screen,
                setScreen,
                setMinutes: (m) => useDrivesStore.getState().setMinutes(m),
                setActive: (a) => useDrivesStore.getState().setActive(a),
                setCurrentIdx: (i) => useDrivesStore.getState().setCurrentIdx(i),
                setLatestUnlock: (i) => useDrivesStore.getState().setLatestUnlock(i),
                setLatestFind: (f) => useDrivesStore.getState().setLatestFind(f),
                unlockedIslandIds,
                setUnlockedIslandIds: (ids) =>
                    useDrivesStore.getState().setUnlockedIslandIds(ids),
                pirates,
                drives,
            }}
        />
    );
}
