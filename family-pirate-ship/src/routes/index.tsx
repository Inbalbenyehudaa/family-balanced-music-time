import { Navigate, Route, Routes } from 'react-router-dom';
import { RedirectIfAuthed, RequireAuth, RequireFamily } from './guards';
import {
    AuthCallbackRoute,
    AuthDebugRoute,
    CrewReadyRoute,
    DriveRoute,
    FamilyNamingRoute,
    HomeRoute,
    InviteAcceptRoute,
    MapRoute,
    MathGateRoute,
    NamesRoute,
    RevealRoute,
    RollCallRoute,
    SettingsRoute,
    SignInRoute,
    SpyglassRoute,
    WelcomeRoute,
} from './screens';

/**
 * Route map per dev spec v3 §8. Phase 1 guards are permissive — Phase 2
 * replaces the auth-check inside RequireAuth/RequireFamily with real
 * Supabase-session checks and wires up the OAuth callback.
 */
export function AppRoutes() {
    return (
        <Routes>
            <Route
                path="/"
                element={
                    <RedirectIfAuthed>
                        <SignInRoute />
                    </RedirectIfAuthed>
                }
            />

            <Route path="/auth/callback" element={<AuthCallbackRoute />} />
            {/* Invite acceptance. The screen itself renders a four-state
                flow (valid / mismatch / invalid / accepted) and handles
                the need-sign-in redirect via sessionStorage.returnTo. */}
            <Route path="/invite/:inviteId" element={<InviteAcceptRoute />} />
            {/* Diagnostic — public, unauthenticated users can open it too so
                we can see what the server knows about their session. */}
            <Route path="/debug/auth" element={<AuthDebugRoute />} />

            <Route
                path="/onboarding/family"
                element={
                    <RequireAuth>
                        <FamilyNamingRoute />
                    </RequireAuth>
                }
            />
            <Route
                path="/onboarding/welcome"
                element={
                    <RequireFamily>
                        <WelcomeRoute />
                    </RequireFamily>
                }
            />
            <Route
                path="/onboarding/names"
                element={
                    <RequireFamily>
                        <NamesRoute />
                    </RequireFamily>
                }
            />
            <Route
                path="/onboarding/crew"
                element={
                    <RequireFamily>
                        <CrewReadyRoute />
                    </RequireFamily>
                }
            />

            <Route
                path="/home"
                element={
                    <RequireFamily>
                        <HomeRoute />
                    </RequireFamily>
                }
            />
            <Route
                path="/drive/roll-call"
                element={
                    <RequireFamily>
                        <RollCallRoute />
                    </RequireFamily>
                }
            />
            <Route
                path="/drive/active"
                element={
                    <RequireFamily>
                        <DriveRoute />
                    </RequireFamily>
                }
            />
            <Route
                path="/drive/spyglass"
                element={
                    <RequireFamily>
                        <SpyglassRoute />
                    </RequireFamily>
                }
            />
            <Route
                path="/drive/reveal"
                element={
                    <RequireFamily>
                        <RevealRoute />
                    </RequireFamily>
                }
            />
            <Route
                path="/map"
                element={
                    <RequireFamily>
                        <MapRoute />
                    </RequireFamily>
                }
            />

            <Route
                path="/settings/gate"
                element={
                    <RequireFamily>
                        <MathGateRoute />
                    </RequireFamily>
                }
            />
            <Route
                path="/settings"
                element={
                    <RequireFamily>
                        <SettingsRoute />
                    </RequireFamily>
                }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
