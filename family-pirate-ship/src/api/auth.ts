import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './client';
import type { AuthUser } from '../types';

/**
 * Kick off Google OAuth. The browser navigates away from the SPA to
 * Google's consent screen; Google redirects back to
 * `${origin}/auth/callback`, Supabase consumes the hash fragment, and
 * `onAuthChange` fires with the new session.
 */
export async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${window.location.origin}/auth/callback`,
        },
    });
    if (error) throw error;
}

export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

/**
 * Subscribe to auth changes. Returns an unsubscribe function.
 * Fires immediately with the current session on subscribe.
 */
export function onAuthChange(cb: (user: AuthUser | null, session: Session | null) => void) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        cb(toAuthUser(session?.user ?? null), session);
    });
    return () => data.subscription.unsubscribe();
}

/** Fetch the current session (for bootstrap on app open). */
export async function getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return { session: data.session, user: toAuthUser(data.session?.user ?? null) };
}

function toAuthUser(u: User | null): AuthUser | null {
    if (!u) return null;
    return {
        id: u.id,
        email: u.email ?? '',
        displayName:
            (u.user_metadata?.full_name as string | undefined) ??
            (u.user_metadata?.name as string | undefined) ??
            (u.email ?? ''),
    };
}
