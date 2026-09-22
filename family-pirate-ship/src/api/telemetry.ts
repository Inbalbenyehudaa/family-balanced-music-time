/**
 * Supabase wrappers for the two telemetry channels.
 *
 * Both are write-only by design: neither table has a SELECT policy, so these
 * are the only way data moves, and it only moves one direction. Reads happen
 * from the Supabase dashboard or a service-role query.
 *
 * Unlike every other module in src/api, these deliberately do NOT go through
 * `mapError` and do not surface failures to callers. Telemetry is best-effort
 * by construction — see flush.ts.
 */
import { supabase } from './client';
import type { DiagnosticRecord } from '../telemetry/codes';

/** The eight product-analytics events — the pre-existing `event` table. */
export type ProductEventName =
    | 'app_opened'
    | 'drive_started'
    | 'drive_ended'
    | 'island_unlocked'
    | 'coastal_found'
    | 'invite_sent'
    | 'invite_accepted'
    | 'member_left';

/**
 * One product-analytics event. Resolves either way; a dropped analytics
 * event is not worth a retry or a log line.
 */
export async function recordProductEvent(
    familyIdHash: string,
    eventName: ProductEventName,
): Promise<void> {
    try {
        await supabase.rpc('record_event', {
            family_id_hash: familyIdHash,
            event_name: eventName,
        });
    } catch {
        /* best-effort */
    }
}

/**
 * A batch of diagnostics, in one round trip.
 *
 * Throws on failure — the only function in this file that does. drainBuffer
 * needs to distinguish "delivered, safe to drop" from "not delivered, keep
 * for the next flush", and an exception is how that gets back to it.
 */
export async function recordDiagnostics(records: DiagnosticRecord[]): Promise<void> {
    if (records.length === 0) return;

    const rows = records.map((r) => ({
        family_id_hash: r.family_id_hash,
        session_id: r.session_id,
        seq: r.seq,
        level: r.level,
        code: r.code,
        detail: r.detail,
        context: r.context,
        app_version: r.app_version,
        platform: r.platform,
        occurred_at: new Date(r.occurred_at).toISOString(),
    }));

    const { error } = await supabase.rpc('record_diagnostics', { rows });
    if (error) throw error;
}
