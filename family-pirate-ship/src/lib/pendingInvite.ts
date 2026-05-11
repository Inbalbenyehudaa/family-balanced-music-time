/**
 * Pending-invite latch.
 *
 * The `/invite/:id` route stamps the id here on mount. The auth guards
 * and the AuthCallback screen check this stamp before routing a signed-
 * in-but-family-less user to /onboarding/family — if it's set, they
 * divert to /invite/:id instead.
 *
 * Why this exists: after Supabase's magic-link handshake the client
 * does an async code/hash exchange for a session. There's a brief
 * window where `user` is still null but the session is about to land.
 * Without this latch, the invite screen sees `user: null` for a beat,
 * redirects to /, and by the time the session lands the guard on /
 * routes the spouse to onboarding — creating the duplicate-family bug
 * we hit in manual testing.
 */

const KEY = 'pending_invite_id';

export function rememberPendingInvite(id: string): void {
    if (!id) return;
    try {
        sessionStorage.setItem(KEY, id);
    } catch {
        /* sessionStorage may be unavailable; fall back quietly */
    }
}

export function readPendingInvite(): string | null {
    try {
        return sessionStorage.getItem(KEY);
    } catch {
        return null;
    }
}

export function clearPendingInvite(): void {
    try {
        sessionStorage.removeItem(KEY);
    } catch {
        /* ignore */
    }
}

/**
 * True if the current URL contains Supabase's auth artifacts — either the
 * implicit-flow `#access_token=...` hash or the PKCE `?code=...` query
 * param. Callers use this to decide "wait for auth to settle" instead of
 * declaring the user unauthenticated.
 */
export function urlHasAuthInFlight(): boolean {
    if (typeof window === 'undefined') return false;
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    return /(^|[&#])access_token=/.test(hash) || /(^|[&?])code=/.test(search);
}
