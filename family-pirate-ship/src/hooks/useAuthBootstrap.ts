import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import * as authApi from '../api/auth';
import { hydrateSyncQueue, useSyncStore } from '../store/syncStore';
import { pullFamilyState } from '../sync/pull';
import type { AuthUser } from '../types';

/**
 * One-time app bootstrap: resolve the session, then stay in sync with
 * auth changes.
 *
 * Race gotcha I hit earlier: `supabase.auth.onAuthStateChange` fires an
 * `INITIAL_SESSION` event immediately on subscribe, *before* `getSession()`
 * has finished. If both paths race to `setLoading(false)`, the one that
 * returns early (no-op because user hasn't changed) will flip the flag
 * before refreshFamily has completed, and guards redirect to onboarding
 * with `family: null`. Fix: funnel every path through `resolveUser` so
 * loading only ends after family has actually been fetched.
 */
export function useAuthBootstrap() {
    useEffect(() => {
        let mounted = true;
        const authStore = useAuthStore.getState();

        hydrateSyncQueue().catch(() => {});

        /** Populate user + family, then end the loading state. */
        const resolveUser = async (user: AuthUser | null) => {
            if (!mounted) return;
            authStore.setUser(user);
            if (user) {
                try {
                    await authStore.refreshFamily();
                    // refreshFamily can force-sign-out on stale JWT. If it did,
                    // the user is now null and we should stop here.
                    if (!useAuthStore.getState().user) {
                        return;
                    }
                    await pullFamilyState();
                    useSyncStore.getState().flush().catch(() => {});
                } catch (err) {
                    console.warn('[bootstrap] family load failed', err);
                }
            } else {
                authStore.clearAll();
            }
            if (mounted) authStore.setLoading(false);
        };

        // Kick off the initial resolve. We don't `await` the promise chain
        // here because this is inside useEffect; the async function handles
        // ordering internally.
        (async () => {
            try {
                const { user } = await authApi.getSession();
                await resolveUser(user);
            } catch (err) {
                console.warn('[bootstrap] getSession failed', err);
                if (mounted) authStore.setLoading(false);
            }
        })();

        // Subscribe for future changes. Any auth-state change (sign-in on
        // another tab, token refresh, sign-out) runs through the same
        // resolver so the ordering contract holds.
        let lastUserId: string | undefined;
        const unsubscribe = authApi.onAuthChange((user) => {
            if (!mounted) return;
            // Supabase fires onAuthStateChange for every token refresh too
            // (every ~55 minutes). Skip the refresh if it's the same user —
            // no need to re-pull.
            if (user?.id === lastUserId) return;
            lastUserId = user?.id;
            resolveUser(user);
        });

        return () => {
            mounted = false;
            unsubscribe();
        };
    }, []);
}
