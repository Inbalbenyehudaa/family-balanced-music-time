import type { PostgrestError, AuthError } from '@supabase/supabase-js';

export type AppErrorCode =
    | 'UNAUTHENTICATED'
    | 'NETWORK'
    | 'CONFLICT'
    | 'NOT_FOUND'
    | 'FORBIDDEN'
    | 'UNKNOWN';

export class AppError extends Error {
    constructor(
        public code: AppErrorCode,
        message: string,
        public cause?: unknown,
    ) {
        super(message);
        this.name = 'AppError';
    }
}

/**
 * Translate Supabase errors into a small, app-level error code so screens
 * don't have to branch on PostgREST/PgRST codes directly. This is not
 * exhaustive — we add codes as we encounter them.
 */
export function mapError(err: PostgrestError | AuthError | unknown): AppError {
    if (err && typeof err === 'object' && 'code' in err) {
        const code = (err as PostgrestError).code;
        const message = (err as PostgrestError).message ?? String(err);

        // Postgres / PostgREST codes we care about
        if (code === '23505') return new AppError('CONFLICT', message, err); // unique violation
        if (code === 'PGRST116') return new AppError('NOT_FOUND', message, err); // no row found
        if (code === '42501') return new AppError('FORBIDDEN', message, err); // permission denied
    }

    const msg = err instanceof Error ? err.message : String(err);
    if (/network|fetch|failed to fetch/i.test(msg))
        return new AppError('NETWORK', msg, err);
    if (/unauth|jwt/i.test(msg)) return new AppError('UNAUTHENTICATED', msg, err);

    return new AppError('UNKNOWN', msg, err);
}

/**
 * Classify an error as transient (retry makes sense) vs. permanent (don't
 * bother retrying — RLS rejection, schema violation, etc.). Used by the
 * Phase 3 sync worker to decide what to do with a failing write.
 */
export function isTransient(err: AppError): boolean {
    return err.code === 'NETWORK' || err.code === 'UNKNOWN';
}
