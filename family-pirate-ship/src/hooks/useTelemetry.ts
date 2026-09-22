/**
 * Mounts the telemetry channel: global error handlers, the consent mirror,
 * and the flush schedule.
 *
 * Mount once, from the app shell, alongside useDriveSessionPersistence.
 * Nothing else references this module — if it is removed, recording silently
 * stops and no test fails. Same caveat as the drive-session hook.
 */
import { useEffect } from 'react';
import { useDrivesStore } from '../store/drivesStore';
import { useSettingsStore } from '../store/settingsStore';
import { record } from '../telemetry/record';
import { flushTelemetry } from '../telemetry/flush';
import { readConsent, writeConsent } from '../telemetry/consent';
import { clearBuffer } from '../telemetry/buffer';

/** How often to drain the buffer while the app is in the foreground. */
const FLUSH_INTERVAL_MS = 30_000;

export function useTelemetry() {
    useEffect(() => {
        // ── Consent mirror ──────────────────────────────────────────────
        // Only mirror once the server's row has actually landed. Before
        // that, `settings` holds DEFAULT_SETTINGS, whose telemetryEnabled is
        // `true` — a default, not the family's answer, and not a basis for
        // sending anything.
        const mirrorConsent = () => {
            const { settings, hydrated } = useSettingsStore.getState();
            if (!hydrated) return;
            const previous = readConsent();
            if (previous === settings.telemetryEnabled) return;
            writeConsent(settings.telemetryEnabled);
            // Turned off: drop anything already queued rather than letting
            // the next flush carry it.
            if (!settings.telemetryEnabled) clearBuffer();
        };
        mirrorConsent();
        const unsubscribeSettings = useSettingsStore.subscribe(mirrorConsent);

        // ── Global error handlers ───────────────────────────────────────
        const onError = (event: ErrorEvent) => {
            record(
                'unhandled_error',
                { line: event.lineno ?? 0, col: event.colno ?? 0 },
                event.error ?? event.message,
            );
        };
        const onRejection = (event: PromiseRejectionEvent) => {
            record('unhandled_rejection', {}, event.reason);
        };
        window.addEventListener('error', onError);
        window.addEventListener('unhandledrejection', onRejection);

        // ── Session start ───────────────────────────────────────────────
        // `resumedDrive` pairs with drive_resumed: it marks the loads that
        // came back from a discarded tab, which is the signal this whole
        // channel was built to measure.
        record('app_opened', {
            resumedDrive: useDrivesStore.getState().driveInProgress,
        });

        // ── Flush schedule ──────────────────────────────────────────────
        const flush = () => {
            void flushTelemetry();
        };
        // Immediately on mount: this is the one that drains a previous
        // session that died before it could send.
        flush();

        const interval = setInterval(flush, FLUSH_INTERVAL_MS);
        const onVisibility = () => {
            if (document.visibilityState === 'hidden') flush();
        };
        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('pagehide', flush);

        return () => {
            unsubscribeSettings();
            window.removeEventListener('error', onError);
            window.removeEventListener('unhandledrejection', onRejection);
            clearInterval(interval);
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('pagehide', flush);
        };
    }, []);
}
