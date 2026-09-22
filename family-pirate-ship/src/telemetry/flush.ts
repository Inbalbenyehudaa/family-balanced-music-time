/**
 * Moves buffered diagnostics off the device.
 *
 * Separated from record.ts because the two have different obligations.
 * Recording must be synchronous, total and instant. Sending is async, gated
 * on consent, allowed to fail, and must never interfere with the sync queue
 * that carries real drives — a failed diagnostics write must not be able to
 * poison the queue holding a family's voyage.
 */
import { useAuthStore } from '../store/authStore';
import { hashFamilyId } from '../lib/hash';
import { recordDiagnostics } from '../api/telemetry';
import { clearBuffer, drainBuffer } from './buffer';
import { readConsent } from './consent';

/** Guards against a visibilitychange and the interval firing together. */
let inFlight = false;

/**
 * Send whatever is buffered.
 *
 * Consent is three-state (see consent.ts):
 *   true     send
 *   false    drop the buffer unsent
 *   unknown  keep buffering, send nothing
 *
 * Resolves to the number of records delivered. Never rejects.
 */
export async function flushTelemetry(): Promise<number> {
    if (inFlight) return 0;

    const consent = readConsent();
    if (consent === false) {
        // Consent was withdrawn, or was off all along and we only just found
        // out. Anything buffered under the unknown state goes unsent.
        clearBuffer();
        return 0;
    }
    if (consent !== true) return 0;

    inFlight = true;
    try {
        // Stamped here rather than at record time because hashing is async
        // and the family usually hasn't resolved when the interesting events
        // fire. Records from before the family loaded travel with a null
        // hash, which is correct — they genuinely have no family yet.
        const family = useAuthStore.getState().family;
        const hash = family ? await hashFamilyId(family.id) : null;

        return await drainBuffer(async (records) => {
            await recordDiagnostics(
                hash ? records.map((r) => ({ ...r, family_id_hash: hash })) : records,
            );
        });
    } catch {
        // drainBuffer already leaves the batch in place on failure; this is
        // belt-and-braces so a hashing or store failure can't reject either.
        return 0;
    } finally {
        inFlight = false;
    }
}
