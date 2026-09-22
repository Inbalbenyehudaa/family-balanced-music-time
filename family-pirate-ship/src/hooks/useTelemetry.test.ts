import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';
import { useTelemetry } from './useTelemetry';
import { useSettingsStore } from '../store/settingsStore';
import { readConsent } from '../telemetry/consent';
import { appendToBuffer, readBuffer, resetBufferStateForTests } from '../telemetry/buffer';
import * as telemetryApi from '../api/telemetry';
import { DEFAULT_SETTINGS } from '../types';
import type { DiagnosticRecord } from '../telemetry/codes';

function rec(): DiagnosticRecord {
    return {
        session_id: 'old-session',
        seq: 0,
        level: 'error',
        code: 'unhandled_error',
        detail: null,
        context: null,
        app_version: '0.1.0+test',
        platform: 'android-chrome',
        occurred_at: Date.now(),
        family_id_hash: null,
    };
}

beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    resetBufferStateForTests();
    useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS }, hydrated: false });
    vi.spyOn(telemetryApi, 'recordDiagnostics').mockResolvedValue(undefined);
});

afterEach(() => {
    cleanup(); // vitest runs with globals:false — no automatic cleanup
    vi.restoreAllMocks();
});

describe('consent mirroring', () => {
    it('writes no consent before the server settings have landed', () => {
        // DEFAULT_SETTINGS.telemetryEnabled is `true`, but that is a default,
        // not the family's answer. Treating it as consent would mean sending
        // telemetry on the strength of a value nobody chose.
        expect(DEFAULT_SETTINGS.telemetryEnabled).toBe(true);

        renderHook(() => useTelemetry());

        expect(readConsent()).toBeNull();
    });

    it('mirrors consent once settings are hydrated from the server', () => {
        renderHook(() => useTelemetry());

        useSettingsStore
            .getState()
            .hydrateSettings({ ...DEFAULT_SETTINGS, telemetryEnabled: true });

        expect(readConsent()).toBe(true);
    });

    it('mirrors a family who has telemetry switched off', () => {
        renderHook(() => useTelemetry());

        useSettingsStore
            .getState()
            .hydrateSettings({ ...DEFAULT_SETTINGS, telemetryEnabled: false });

        expect(readConsent()).toBe(false);
    });

    it('drops anything already buffered when consent is withdrawn', () => {
        useSettingsStore
            .getState()
            .hydrateSettings({ ...DEFAULT_SETTINGS, telemetryEnabled: true });
        renderHook(() => useTelemetry());
        appendToBuffer(rec());

        useSettingsStore.getState().hydrateSettings({
            ...DEFAULT_SETTINGS,
            telemetryEnabled: false,
        });

        expect(readConsent()).toBe(false);
        expect(readBuffer()).toEqual([]);
    });

    it('picks up a hydrated setting present before mount', () => {
        useSettingsStore
            .getState()
            .hydrateSettings({ ...DEFAULT_SETTINGS, telemetryEnabled: true });

        renderHook(() => useTelemetry());

        expect(readConsent()).toBe(true);
    });
});

describe('session and error capture', () => {
    it('records app_opened on mount', () => {
        renderHook(() => useTelemetry());

        const opened = readBuffer().filter((r) => r.code === 'app_opened');
        expect(opened).toHaveLength(1);
        expect(opened[0].context).toEqual({ resumedDrive: false });
    });

    it('records an unhandled error', () => {
        renderHook(() => useTelemetry());

        window.dispatchEvent(
            new ErrorEvent('error', {
                message: 'boom',
                lineno: 42,
                colno: 7,
                error: new Error('boom'),
            }),
        );

        const entry = readBuffer().find((r) => r.code === 'unhandled_error');
        expect(entry).toBeDefined();
        expect(entry!.level).toBe('error');
        expect(entry!.context).toEqual({ line: 42, col: 7 });
        expect(entry!.detail).toBe('Error: boom');
    });

    it('records an unhandled promise rejection', () => {
        renderHook(() => useTelemetry());

        // jsdom does not construct PromiseRejectionEvent, so stand in an
        // event carrying the same field the handler reads.
        const event = new Event('unhandledrejection') as Event & { reason: unknown };
        event.reason = new Error('nope');
        window.dispatchEvent(event);

        const entry = readBuffer().find((r) => r.code === 'unhandled_rejection');
        expect(entry).toBeDefined();
        expect(entry!.detail).toBe('Error: nope');
    });

    it('stops capturing once unmounted', () => {
        const { unmount } = renderHook(() => useTelemetry());
        unmount();

        // With our handler gone nothing else claims the event, and jsdom
        // escalates it to an uncaught exception that fails the whole run.
        // Swallow it for the length of the dispatch.
        const swallow = (e: Event) => e.preventDefault();
        window.addEventListener('error', swallow);
        window.dispatchEvent(
            new ErrorEvent('error', { message: 'after', error: new Error('after') }),
        );
        window.removeEventListener('error', swallow);

        expect(readBuffer().find((r) => r.code === 'unhandled_error')).toBeUndefined();
    });
});
