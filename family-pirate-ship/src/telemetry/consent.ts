/**
 * Local mirror of the `telemetryEnabled` family setting.
 *
 * The real flag lives in `family_settings` and is held in memory by
 * settingsStore, hydrated from the server. That leaves a window at every cold
 * start where consent is simply unknown — and that window is precisely where
 * the most interesting failures happen, since it covers bootstrap, auth
 * resolution and the first pull.
 *
 * Mirroring the last known answer to localStorage closes the window. The
 * resulting three-state — true, false, unknown — drives a deliberate policy:
 *
 *   true     send
 *   false    drop the buffer
 *   unknown  keep buffering, send nothing
 *
 * Nothing leaves the device before consent is known. Buffering while unknown
 * costs a localStorage key and means a first-run crash is still explainable
 * once the family turns out to have telemetry on; if it turns out to be off,
 * those records are dropped unsent.
 *
 * One toggle covers both analytics and diagnostics (settled 2026-09-22).
 */

export const TELEMETRY_CONSENT_KEY = 'pirate-ship-telemetry-consent-v1';

export type Consent = boolean | null;

/** null means "not yet known on this device". */
export function readConsent(): Consent {
    try {
        const raw = localStorage.getItem(TELEMETRY_CONSENT_KEY);
        if (raw === 'true') return true;
        if (raw === 'false') return false;
        return null;
    } catch {
        return null;
    }
}

export function writeConsent(enabled: boolean): void {
    try {
        localStorage.setItem(TELEMETRY_CONSENT_KEY, enabled ? 'true' : 'false');
    } catch {
        /* storage disabled — falls back to "unknown", which sends nothing */
    }
}

export function clearConsent(): void {
    try {
        localStorage.removeItem(TELEMETRY_CONSENT_KEY);
    } catch {
        /* nothing to clear */
    }
}
