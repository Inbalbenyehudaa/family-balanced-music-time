import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { readPendingInvite } from '../lib/pendingInvite';

/**
 * When an authed-but-family-less user is about to be bounced to
 * /onboarding/family, check the pending-invite latch first. If
 * `/invite/:id` was the entry point but the session landed late and the
 * spouse got bounced by a guard, this diverts them back to the accept
 * screen instead of letting them create a disconnected duplicate family.
 */
function onboardingOrInvite(): string {
    const pending = readPendingInvite();
    if (pending) return `/invite/${pending}`;
    return '/onboarding/family';
}

/**
 * Phase 2 guards: real session-aware. `isLoading` is true while the
 * bootstrapper is resolving the initial session — during that window we
 * render nothing so a racing redirect doesn't bounce a returning user
 * back to sign-in before their session materializes.
 */

function LoadingShell() {
    return (
        <div className="flex min-h-[100dvh] items-center justify-center bg-sand-cream">
            <div
                className="h-8 w-8 rounded-full border-[3px] border-[rgba(93,63,42,0.2)] border-t-wood-deep"
                style={{ animation: 'spin 1s linear infinite' }}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

function FamilyLookupError({ message }: { message: string }) {
    const retry = async () => {
        useAuthStore.setState({ familyError: null });
        try {
            await useAuthStore.getState().refreshFamily();
        } catch {
            /* refreshFamily already catches; this is belt-and-suspenders */
        }
    };
    const signOut = async () => {
        try {
            await useAuthStore.getState().signOut();
        } finally {
            window.location.href = '/';
        }
    };
    return (
        <div
            dir="rtl"
            className="flex min-h-[100dvh] items-center justify-center bg-sand-cream p-6"
        >
            <div className="w-full max-w-md rounded-2xl border-[1.5px] border-[rgba(93,63,42,0.25)] bg-surface-card p-6 text-center">
                <div className="mb-3 text-3xl">⚠️</div>
                <h3 className="mb-2 font-display text-xl font-bold text-text-primary">
                    לא הצלחנו לטעון את המשפחה
                </h3>
                <p className="mb-4 font-body text-sm text-text-secondary">
                    הרשת אולי פחות טובה כרגע. נסו שוב, ואם זה נמשך — התנתקו והתחברו שוב.
                </p>
                <pre
                    className="mb-4 overflow-x-auto rounded bg-[rgba(93,63,42,0.06)] p-2 text-start text-[11px] text-text-secondary"
                    style={{ direction: 'ltr' }}
                >
                    {message}
                </pre>
                <div className="flex gap-2">
                    <button
                        onClick={retry}
                        className="flex-1 cursor-pointer rounded-lg border-2 border-wood-deep bg-sand-warm px-4 py-2 font-body text-sm font-semibold text-text-primary"
                    >
                        נסה שוב
                    </button>
                    <button
                        onClick={signOut}
                        className="flex-1 cursor-pointer rounded-lg border-2 border-treasure-red bg-transparent px-4 py-2 font-body text-sm font-semibold text-treasure-red"
                    >
                        התנתקות
                    </button>
                </div>
            </div>
        </div>
    );
}

export function RequireAuth({ children }: { children: ReactNode }) {
    const user = useAuthStore((s) => s.user);
    const isLoading = useAuthStore((s) => s.isLoading);
    const location = useLocation();
    if (isLoading) return <LoadingShell />;
    if (!user) return <Navigate to="/" replace state={{ from: location }} />;
    return <>{children}</>;
}

export function RequireFamily({ children }: { children: ReactNode }) {
    const user = useAuthStore((s) => s.user);
    const family = useAuthStore((s) => s.family);
    const isLoading = useAuthStore((s) => s.isLoading);
    const familyError = useAuthStore((s) => s.familyError);
    if (isLoading) return <LoadingShell />;
    if (!user) return <Navigate to="/" replace />;
    if (!family && familyError) return <FamilyLookupError message={familyError} />;
    if (!family) {
        const dest = onboardingOrInvite();
        console.warn('[RequireFamily] no family — routing', {
            dest,
            user,
            familyError,
        });
        return <Navigate to={dest} replace />;
    }
    return <>{children}</>;
}

/**
 * A signed-in user hitting `/` (the sign-in page) should bounce straight
 * to the app rather than see the sign-in button.
 */
export function RedirectIfAuthed({ children }: { children: ReactNode }) {
    const user = useAuthStore((s) => s.user);
    const family = useAuthStore((s) => s.family);
    const isLoading = useAuthStore((s) => s.isLoading);
    const familyError = useAuthStore((s) => s.familyError);
    if (isLoading) return <LoadingShell />;
    if (user && family) return <Navigate to="/home" replace />;
    if (user && !family && familyError) return <FamilyLookupError message={familyError} />;
    if (user && !family) return <Navigate to={onboardingOrInvite()} replace />;
    return <>{children}</>;
}
