import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client. Uses the anon key, which is safe to ship to the
 * browser — all sensitive operations are gated by RLS policies on the
 * database side.
 *
 * `detectSessionInUrl: true` lets Supabase auto-consume the `#access_token`
 * hash that Google OAuth returns after redirect, which is what powers the
 * /auth/callback flow.
 */
export const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
        },
    },
);
