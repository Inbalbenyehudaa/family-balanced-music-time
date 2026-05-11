import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { readPendingInvite } from '../lib/pendingInvite';
import { findPendingInviteForMe } from '../api/invites';

const RETURN_TO_KEY = 'auth.returnTo';

function popReturnTo(): string | null {
    try {
        const v = sessionStorage.getItem(RETURN_TO_KEY);
        if (v) sessionStorage.removeItem(RETURN_TO_KEY);
        return v && v.startsWith('/') && !v.startsWith('//') ? v : null;
    } catch {
        return null;
    }
}

/**
 * Lands on `/auth/callback` after Google OAuth redirects back. By the time
 * React mounts, Supabase's `detectSessionInUrl: true` has already parsed
 * the hash fragment and persisted the session, which makes
 * `useAuthBootstrap` fire with the new user.
 *
 * If the sign-in screen stashed a `returnTo` in sessionStorage (e.g. for
 * a deep-link into /invite/:token), we honor that over the default
 * /home or /onboarding routing.
 */
export function AuthCallbackScreen() {
    const nav = useNavigate();
    const isLoading = useAuthStore((s) => s.isLoading);
    const user = useAuthStore((s) => s.user);
    const family = useAuthStore((s) => s.family);
    const familyError = useAuthStore((s) => s.familyError);
    const [failedTries, setFailedTries] = useState(0);

    useEffect(() => {
        if (isLoading) return;
        if (!user) {
            if (failedTries < 10) {
                const t = setTimeout(() => setFailedTries((n) => n + 1), 200);
                return () => clearTimeout(t);
            }
            nav('/', { replace: true });
            return;
        }

        let cancelled = false;
        (async () => {
            // Honor a stashed returnTo before the default routing. The invite
            // flow depends on this — a signed-out hit to /invite/:token bounces
            // through /?returnTo=/invite/:token, then back here.
            const returnTo = popReturnTo();
            if (returnTo) {
                if (!cancelled) nav(returnTo, { replace: true });
                return;
            }
            // Sessionstorage latch (best-effort, set by InviteAccept on mount).
            const latched = readPendingInvite();
            if (latched) {
                if (!cancelled) nav(`/invite/${latched}`, { replace: true });
                return;
            }
            // Server-side authoritative check. This is what catches the
            // "wrong email template" case where Supabase sent a magic link
            // that redirected to /auth/callback (no latch ever set). If
            // there's a pending invite for this user's email, divert to it.
            if (!family) {
                try {
                    const pending = await findPendingInviteForMe();
                    if (cancelled) return;
                    if (pending) {
                        nav(`/invite/${pending.id}`, { replace: true });
                        return;
                    }
                } catch {
                    /* fall through to default routing */
                }
            }
            if (cancelled) return;
            if (family) {
                nav('/home', { replace: true });
                return;
            }
            if (familyError) {
                nav('/home', { replace: true });
                return;
            }
            nav('/onboarding/family', { replace: true });
        })();

        return () => {
            cancelled = true;
        };
    }, [isLoading, user, family, familyError, failedTries, nav]);

    return (
        <div className="flex min-h-[100dvh] items-center justify-center bg-sand-cream">
            <div className="text-center">
                <div
                    className="mx-auto mb-4 h-10 w-10 rounded-full border-[3px] border-[rgba(93,63,42,0.2)] border-t-wood-deep"
                    style={{ animation: 'spin 1s linear infinite' }}
                />
                <p className="font-body text-sm text-text-secondary">רגע אחד...</p>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
