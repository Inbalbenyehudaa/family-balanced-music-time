/**
 * The closed set of diagnostic codes, with the shape of each one's context.
 *
 * This file is the enforcement point for the privacy rule. `record()` takes a
 * `DiagnosticCode` and the matching `ContextFor<C>`, so there is no free-form
 * logging path — you cannot write `record('debug', { state })`, because no
 * such code exists and no context type permits arbitrary strings.
 *
 * Context values are numbers, booleans and fixed enums only. Never user data:
 * pirate names are children's names, and a diagnostics table is not where
 * they go. Anything string-shaped that must travel goes through `detail`,
 * which is scrubbed (see scrub.ts).
 *
 * Codes are grounded in seams this codebase actually has — most of them sit
 * next to a `console.warn` that today tells nobody anything.
 */

export type DiagnosticLevel = 'error' | 'warn' | 'info';

/** Coarse platform bucket. Never the raw user-agent string. */
export type Platform =
    | 'android-chrome'
    | 'android-other'
    | 'ios-safari'
    | 'ios-other'
    | 'desktop'
    | 'unknown';

export interface DiagnosticContexts {
    // ── Errors: the unknown-unknowns ────────────────────────────────────
    /** window.onerror */
    unhandled_error: { line: number; col: number };
    /** unhandledrejection */
    unhandled_rejection: Record<string, never>;
    /** ErrorBoundary.componentDidCatch */
    render_error: { stackDepth: number };

    // ── Drive lifecycle integrity ───────────────────────────────────────
    // The failure class that has bitten twice. Both shipped bugs were silent
    // state loss, not exceptions — no error handler would have caught either.
    drive_started: { participantCount: number };
    drive_ended: { durationSec: number; tier: string; participantCount: number };
    /**
     * A voyage rebuilt from the localStorage snapshot after the OS discarded
     * the tab. `gapSec` is how long the tab was gone — the single most useful
     * number in this whole channel, because it measures how often eviction
     * actually happens in the wild and validates the fix that addressed it.
     */
    drive_resumed: { gapSec: number; totalSec: number };
    /** Snapshot found but older than RESUME_MAX_GAP_MS, so it was discarded. */
    drive_snapshot_dropped: { gapSec: number };
    /** Landed on /drive/active with nothing to resume; guard sent us home. */
    drive_guard_redirect: Record<string, never>;

    // ── Breaks ──────────────────────────────────────────────────────────
    // Deliberately NOT named drive_resumed: that code means "voyage rebuilt
    // from the snapshot after the OS discarded the tab", and it is the signal
    // this whole channel was built to produce. Colliding on the name would
    // poison it.
    /** A break started — the timer stopped, crediting nobody. */
    drive_break_started: Record<string, never>;
    /**
     * A break ended, with how long the timer was stopped. A
     * drive_break_started with no drive_break_ended after it is a voyage that
     * was ended — or discarded — while still on a break, which is the case
     * worth watching for.
     */
    drive_break_ended: { breakSec: number };

    // ── Storage ─────────────────────────────────────────────────────────
    /** localStorage rejected a write — quota, or Safari private mode. */
    storage_write_failed: { key: 'drive_session' | 'telemetry' | 'settings_mirror' };
    /** IndexedDB rejected a sync-queue write. */
    idb_write_failed: { op: 'read' | 'write' | 'clear' };

    // ── Sync health ─────────────────────────────────────────────────────
    sync_flush_failed: { queueDepth: number };
    sync_queue_backlog: { depth: number };
    pull_failed: Record<string, never>;

    // ── Auth seams ──────────────────────────────────────────────────────
    /** refreshFamily hit a stale JWT and force-signed-out. */
    stale_jwt_signout: Record<string, never>;
    family_lookup_failed: Record<string, never>;

    // ── Session ─────────────────────────────────────────────────────────
    app_opened: { resumedDrive: boolean };
}

export type DiagnosticCode = keyof DiagnosticContexts;

export type ContextFor<C extends DiagnosticCode> = DiagnosticContexts[C];

/**
 * The level each code reports at. Kept beside the context types so adding a
 * code without classifying it is a type error rather than a silent 'info'.
 */
export const CODE_LEVELS: Record<DiagnosticCode, DiagnosticLevel> = {
    unhandled_error: 'error',
    unhandled_rejection: 'error',
    render_error: 'error',

    drive_started: 'info',
    drive_ended: 'info',
    drive_resumed: 'warn',
    drive_snapshot_dropped: 'warn',
    drive_guard_redirect: 'warn',

    drive_break_started: 'info',
    drive_break_ended: 'info',

    storage_write_failed: 'error',
    idb_write_failed: 'error',

    sync_flush_failed: 'warn',
    sync_queue_backlog: 'warn',
    pull_failed: 'warn',

    stale_jwt_signout: 'warn',
    family_lookup_failed: 'error',

    app_opened: 'info',
};

/** One buffered, not-yet-sent diagnostic. */
export interface DiagnosticRecord {
    session_id: string;
    seq: number;
    level: DiagnosticLevel;
    code: DiagnosticCode;
    detail: string | null;
    context: Record<string, unknown> | null;
    app_version: string;
    platform: Platform;
    /** Epoch millis on the client clock; serialised to ISO at send time. */
    occurred_at: number;
    /**
     * Filled in at flush time, not record time: hashing is async and the
     * family may not have resolved yet when an event is recorded.
     */
    family_id_hash: string | null;
}

/**
 * Coarse platform bucket from the user-agent. Deliberately lossy — enough to
 * tell an Android Chrome eviction from an iOS Safari suspension, and nothing
 * more. The raw UA never leaves the device.
 */
export function detectPlatform(ua: string = navigator.userAgent): Platform {
    if (/Android/i.test(ua)) {
        return /Chrome|CriOS/i.test(ua) ? 'android-chrome' : 'android-other';
    }
    if (/iPhone|iPad|iPod/i.test(ua)) {
        // Every iOS browser is WebKit, but Safari proper is the one whose
        // suspension behaviour we care about.
        return /CriOS|FxiOS|EdgiOS/i.test(ua) ? 'ios-other' : 'ios-safari';
    }
    if (/Mozilla|Chrome|Safari|Firefox/i.test(ua)) return 'desktop';
    return 'unknown';
}
