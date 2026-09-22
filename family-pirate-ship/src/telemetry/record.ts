/**
 * The one way to record a diagnostic.
 *
 * `record` is total: it never throws, never awaits, and never blocks the
 * caller. A diagnostics channel that can break the app it is reporting on is
 * a liability, so every failure inside here is swallowed. The cost of a lost
 * breadcrumb is far below the cost of a crash in the crash reporter.
 *
 * Writes go to the local ring buffer only. Sending happens later, in
 * flush.ts, and is gated on consent — see consent.ts for why the two are
 * separated.
 */
import { useAuthStore } from '../store/authStore';
import { usePiratesStore } from '../store/piratesStore';
import { CODE_LEVELS, detectPlatform } from './codes';
import type { ContextFor, DiagnosticCode, DiagnosticRecord } from './codes';
import { appendToBuffer, nextSeq, sessionId } from './buffer';
import { scrubError, type ScrubNames } from './scrub';

/**
 * Names to redact out of `detail`. Read from the stores at record time
 * rather than injected, so scrubbing works by default and cannot be
 * disabled by forgetting to wire something up — the failure mode of an
 * un-wired name source would be children's names in the database.
 *
 * Store access is deferred to call time, so the static imports above don't
 * form a module cycle with stores that record diagnostics of their own.
 */
function scrubNames(): ScrubNames {
    try {
        return {
            pirates: usePiratesStore.getState().pirates.map((p) => p.name),
            family: useAuthStore.getState().family?.name ?? null,
        };
    } catch {
        // If the stores can't be read we must still redact *something*, and
        // the regex-based rules (emails, ids, tokens) run regardless.
        return {};
    }
}

function appVersion(): string {
    try {
        return __APP_VERSION__;
    } catch {
        return 'unknown';
    }
}

/**
 * Record one diagnostic.
 *
 * @param code    a member of the closed set in codes.ts
 * @param context numbers and enums only — the type for this code
 * @param detail  optional free text or caught error; scrubbed before storage
 */
export function record<C extends DiagnosticCode>(
    code: C,
    context: ContextFor<C>,
    detail?: unknown,
): void {
    try {
        const entry: DiagnosticRecord = {
            session_id: sessionId(),
            seq: nextSeq(),
            level: CODE_LEVELS[code],
            code,
            detail: detail === undefined ? null : scrubError(detail, scrubNames()),
            context: Object.keys(context ?? {}).length
                ? (context as Record<string, unknown>)
                : null,
            app_version: appVersion(),
            platform: detectPlatform(),
            occurred_at: Date.now(),
            // Stamped at flush time: hashing is async, and the family often
            // hasn't resolved yet when the interesting events fire.
            family_id_hash: null,
        };
        appendToBuffer(entry);
    } catch {
        /* diagnostics must never break the caller */
    }
}
