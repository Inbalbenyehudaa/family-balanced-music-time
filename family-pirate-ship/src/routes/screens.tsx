/**
 * Route-level screen wrappers.
 *
 * Each wrapper adapts a v2 screen (which takes callbacks + local state via
 * props) to the v3 world (which reads/writes stores and navigates). The v2
 * components themselves stay untouched.
 */

import { useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { usePiratesStore } from '../store/piratesStore';
import { useDrivesStore } from '../store/drivesStore';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore } from '../store/authStore';
import { ScreenWelcome, ScreenNames, ScreenCrewReady } from '../screens/Onboarding';
import { ScreenHome } from '../screens/Home';
import { ScreenRollCall } from '../screens/RollCall';
import { ScreenDrive } from '../screens/Drive';
import { ScreenSpyglass } from '../screens/Spyglass';
import { ScreenReveal } from '../screens/Reveal';
import { ScreenMap } from '../screens/Map';
import { ScreenIslandDetail } from '../screens/IslandDetail';
import { ConfirmEnd } from '../screens/ConfirmEnd';
import { ScreenMathGate, ScreenSettings } from '../screens/Settings';
import { SignInScreen } from '../screens/SignIn';
import { AuthCallbackScreen } from '../screens/AuthCallback';
import { FamilyNamingScreen } from '../screens/FamilyNaming';
import { AuthDebugScreen } from '../screens/AuthDebug';
import { InviteAcceptScreen } from '../screens/InviteAccept';
import {
    createInvite,
    listPendingInvites,
    removeMember,
    revokeInvite,
} from '../api/invites';
import type { Island, PendingInvite } from '../types';

// ─── Onboarding ───────────────────────────────────────────────

export function WelcomeRoute() {
    const nav = useNavigate();
    return <ScreenWelcome onNext={() => nav('/onboarding/names')} />;
}

export function NamesRoute() {
    const nav = useNavigate();
    const pirates = usePiratesStore((s) => s.pirates);
    const setPirates = usePiratesStore((s) => s.setPirates);
    return (
        <ScreenNames
            pirates={pirates}
            setPirates={setPirates}
            onNext={() => nav('/onboarding/crew')}
            onSkip={() => nav('/onboarding/crew')}
        />
    );
}

export function CrewReadyRoute() {
    const nav = useNavigate();
    const pirates = usePiratesStore((s) => s.pirates);
    return <ScreenCrewReady pirates={pirates} onNext={() => nav('/home')} />;
}

// ─── Home ─────────────────────────────────────────────────────

export function HomeRoute() {
    const nav = useNavigate();
    const pirates = usePiratesStore((s) => s.pirates);
    const unlockedIslandIds = useDrivesStore((s) => s.unlockedIslandIds);

    const startNewVoyage = () => {
        useDrivesStore.getState().setMinutes([0, 0, 0]);
        useDrivesStore.getState().setCurrentIdx(-1);
        nav('/drive/roll-call');
    };

    return (
        <ScreenHome
            pirates={pirates}
            islandsCount={unlockedIslandIds.length}
            onNewVoyage={startNewVoyage}
            onMap={() => nav('/map')}
            onSettings={() => nav('/settings/gate')}
        />
    );
}

// ─── Drive (roll call + active + spyglass + reveal) ───────────

export function RollCallRoute() {
    const nav = useNavigate();
    const pirates = usePiratesStore((s) => s.pirates);
    return (
        <ScreenRollCall
            pirates={pirates}
            onCancel={() => nav('/home')}
            onSetSail={(active) => {
                useDrivesStore.getState().startDrive(active);
                nav('/drive/active');
            }}
        />
    );
}

export function DriveRoute() {
    const nav = useNavigate();
    const pirates = usePiratesStore((s) => s.pirates);
    const active = useDrivesStore((s) => s.active);
    const minutes = useDrivesStore((s) => s.minutes);
    const currentIdx = useDrivesStore((s) => s.currentIdx);
    const setCurrentIdx = useDrivesStore((s) => s.setCurrentIdx);
    const { demoFastClock } = useDevTweaks();
    const [showConfirm, setShowConfirm] = useState(false);

    // Tick interval — replaces the effect that used to live in App.tsx.
    useEffect(() => {
        const id = setInterval(() => {
            const speed = demoFastClock ? 8 : 1;
            useDrivesStore.getState().tick(speed);
        }, 1000);
        return () => clearInterval(id);
    }, [demoFastClock]);

    const elapsed = minutes.reduce((a, b) => a + b, 0);

    return (
        <>
            <ScreenDrive
                pirates={pirates}
                active={active}
                minutes={minutes}
                currentIdx={currentIdx}
                setCurrentIdx={setCurrentIdx}
                elapsed={elapsed}
                onSpyglass={() => nav('/drive/spyglass')}
                onEndVoyage={() => setShowConfirm(true)}
            />
            {showConfirm && (
                <ConfirmEnd
                    onYes={() => {
                        setShowConfirm(false);
                        useDrivesStore.getState().endDrive(pirates);
                        nav('/drive/reveal');
                    }}
                    onNo={() => setShowConfirm(false)}
                />
            )}
        </>
    );
}

export function SpyglassRoute() {
    const nav = useNavigate();
    const pirates = usePiratesStore((s) => s.pirates);
    const active = useDrivesStore((s) => s.active);
    const minutes = useDrivesStore((s) => s.minutes);
    // Spyglass needs the tick to keep running — use the same effect as Drive.
    const { demoFastClock } = useDevTweaks();
    useEffect(() => {
        const id = setInterval(() => {
            const speed = demoFastClock ? 8 : 1;
            useDrivesStore.getState().tick(speed);
        }, 1000);
        return () => clearInterval(id);
    }, [demoFastClock]);

    return (
        <ScreenSpyglass
            pirates={pirates}
            active={active}
            minutes={minutes}
            onClose={() => nav('/drive/active')}
        />
    );
}

export function RevealRoute() {
    const nav = useNavigate();
    const pirates = usePiratesStore((s) => s.pirates);
    const active = useDrivesStore((s) => s.active);
    const minutes = useDrivesStore((s) => s.minutes);
    const latestUnlock = useDrivesStore((s) => s.latestUnlock);
    const latestFind = useDrivesStore((s) => s.latestFind);
    return (
        <ScreenReveal
            pirates={pirates}
            active={active}
            minutes={minutes}
            unlockIsland={latestUnlock}
            coastalFind={latestFind}
            onDone={() => nav('/home')}
        />
    );
}

// ─── Map (+ island detail modal) ──────────────────────────────

export function MapRoute() {
    const nav = useNavigate();
    const unlockedIslandIds = useDrivesStore((s) => s.unlockedIslandIds);
    const drives = useDrivesStore((s) => s.drives);
    const [activeIsland, setActiveIsland] = useState<Island | null>(null);
    return (
        <>
            <ScreenMap
                unlockedIds={unlockedIslandIds}
                drives={drives}
                onBack={() => nav('/home')}
                onIslandTap={(i) => setActiveIsland(i)}
            />
            {activeIsland && (
                <ScreenIslandDetail
                    island={activeIsland}
                    drives={drives}
                    onClose={() => setActiveIsland(null)}
                />
            )}
        </>
    );
}

// ─── Settings (math gate + panel) ─────────────────────────────

export function MathGateRoute() {
    const nav = useNavigate();
    return (
        <ScreenMathGate
            onPass={() => nav('/settings', { replace: true })}
            onCancel={() => nav('/home')}
        />
    );
}

export function SettingsRoute() {
    const nav = useNavigate();
    const pirates = usePiratesStore((s) => s.pirates);
    const savePirates = usePiratesStore((s) => s.savePirates);
    const settings = useSettingsStore((s) => s.settings);
    const setSettings = useSettingsStore((s) => s.setSettings);
    const drives = useDrivesStore((s) => s.drives);

    const family = useAuthStore((s) => s.family);
    const members = useAuthStore((s) => s.members);
    const role = useAuthStore((s) => s.role);
    const user = useAuthStore((s) => s.user);
    const refreshFamily = useAuthStore((s) => s.refreshFamily);
    const isOwner = role === 'owner';

    const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);

    const reloadInvites = useCallback(async () => {
        if (!isOwner) {
            setPendingInvites([]);
            return;
        }
        try {
            const invites = await listPendingInvites();
            setPendingInvites(invites);
        } catch (err) {
            console.warn('[settings] listPendingInvites failed', err);
        }
    }, [isOwner]);

    useEffect(() => {
        reloadInvites();
    }, [reloadInvites]);

    const handleInvite = useCallback(
        async (email: string) => {
            if (!family) throw new Error('No family');
            await createInvite(email, family.id);
            await reloadInvites();
        },
        [family, reloadInvites],
    );

    const handleRevokeInvite = useCallback(
        async (inviteId: string) => {
            await revokeInvite(inviteId);
            await reloadInvites();
        },
        [reloadInvites],
    );

    const handleRemoveMember = useCallback(
        async (userId: string) => {
            await removeMember(userId);
            await refreshFamily();
        },
        [refreshFamily],
    );

    // The v2 ScreenSettings expects a shape that merges settings + pirates +
    // three threshold fields. Adapt v3 -> v2-expected shape.
    const v2Settings = {
        fairThreshold: settings.fairWindsThreshold,
        harborThreshold: settings.harborThreshold,
        audio: settings.audioEnabled,
        fog: settings.fogEnabled,
        demoFastClock: true, // dev-only; screen doesn't render this
        pirates,
    };

    return (
        <ScreenSettings
            onBack={() => nav('/home')}
            settings={v2Settings}
            setSettings={(s) => {
                setSettings({
                    fairWindsThreshold: s.fairThreshold,
                    harborThreshold: s.harborThreshold,
                    audioEnabled: s.audio,
                    fogEnabled: s.fog,
                });
            }}
            drives={drives}
            onReset={async () => {
                const { resetFamilyData } = await import('../sync/resetFamily');
                try {
                    await resetFamilyData();
                } catch (err) {
                    console.warn('[settings] reset failed', err);
                }
            }}
            onSavePirates={(p) => savePirates(p)}
            familySection={
                family && user
                    ? {
                          familyName: family.name,
                          members,
                          currentUserId: user.id,
                          isOwner,
                          pendingInvites,
                          memberCap: 5,
                          onInvite: handleInvite,
                          onRevokeInvite: handleRevokeInvite,
                          onRemoveMember: handleRemoveMember,
                      }
                    : undefined
            }
        />
    );
}

export function InviteAcceptRoute() {
    return <InviteAcceptScreen />;
}

// ─── Sign-in + auth-callback + family-naming ────────────────
// Thin re-exports so the route config sees a consistent *Route naming.

export function SignInRoute() {
    return <SignInScreen />;
}

export function AuthCallbackRoute() {
    return <AuthCallbackScreen />;
}

export function FamilyNamingRoute() {
    return <FamilyNamingScreen />;
}

export function AuthDebugRoute() {
    return <AuthDebugScreen />;
}

// ─── Dev tweaks hook ──────────────────────────────────────────
// The v2 tweaks panel held its own state inside App.tsx. We keep that
// same pattern — a tiny module-scoped object, read by the routes that
// need to adjust tick speed. Phase 2 moves tweaks behind import.meta.env.DEV
// only (already is, in TweaksPanel); here we expose a read helper.

import { tweakState } from './tweakState';
export function useDevTweaks() {
    return tweakState;
}
