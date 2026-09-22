import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushTelemetry } from './flush';
import { appendToBuffer, readBuffer, resetBufferStateForTests } from './buffer';
import { clearConsent, writeConsent } from './consent';
import { useAuthStore } from '../store/authStore';
import * as telemetryApi from '../api/telemetry';
import type { DiagnosticRecord } from './codes';

function rec(over: Partial<DiagnosticRecord> = {}): DiagnosticRecord {
    return {
        session_id: 's1',
        seq: 0,
        level: 'error',
        code: 'unhandled_error',
        detail: 'Error: boom',
        context: { line: 1, col: 2 },
        app_version: '0.1.0+test',
        platform: 'android-chrome',
        occurred_at: Date.now(),
        family_id_hash: null,
        ...over,
    };
}

const FAMILY = {
    id: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
    name: 'Fam',
    ownerUserId: 'u1',
    createdAt: 0,
    updatedAt: 0,
};

beforeEach(() => {
    // Never depend on the ambient .env.local — the hashing assertions below
    // must behave identically on a fresh clone and in CI.
    vi.stubEnv('VITE_TELEMETRY_HASH_SALT', 'salt-for-tests');
    localStorage.clear();
    sessionStorage.clear();
    resetBufferStateForTests();
    useAuthStore.setState({ family: null, user: null, isLoading: false });
});

afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

describe('flushTelemetry consent gating', () => {
    it('sends nothing while consent is unknown, and keeps buffering', async () => {
        clearConsent();
        appendToBuffer(rec());
        const send = vi.spyOn(telemetryApi, 'recordDiagnostics');

        expect(await flushTelemetry()).toBe(0);
        expect(send).not.toHaveBeenCalled();
        // Retained: if consent resolves to true later, a first-run crash is
        // still explainable.
        expect(readBuffer()).toHaveLength(1);
    });

    it('drops the buffer unsent when consent is false', async () => {
        writeConsent(false);
        appendToBuffer(rec());
        const send = vi.spyOn(telemetryApi, 'recordDiagnostics');

        expect(await flushTelemetry()).toBe(0);
        expect(send).not.toHaveBeenCalled();
        expect(readBuffer()).toEqual([]);
    });

    it('sends when consent is true', async () => {
        writeConsent(true);
        appendToBuffer(rec({ seq: 0 }));
        appendToBuffer(rec({ seq: 1 }));
        const send = vi
            .spyOn(telemetryApi, 'recordDiagnostics')
            .mockResolvedValue(undefined);

        expect(await flushTelemetry()).toBe(2);
        expect(send).toHaveBeenCalledOnce();
        expect(readBuffer()).toEqual([]);
    });
});

describe('flushTelemetry family hashing', () => {
    it('stamps a hash — never the raw family id — when a family is loaded', async () => {
        writeConsent(true);
        useAuthStore.setState({ family: FAMILY });
        appendToBuffer(rec());
        const send = vi
            .spyOn(telemetryApi, 'recordDiagnostics')
            .mockResolvedValue(undefined);

        await flushTelemetry();

        const sent = send.mock.calls[0][0];
        const hash = sent[0].family_id_hash;
        // jsdom provides Web Crypto, so this is the real digest.
        expect(hash).toMatch(/^[0-9a-f]{64}$/);
        expect(hash).not.toContain(FAMILY.id);
        expect(JSON.stringify(sent)).not.toContain(FAMILY.id);
    });

    it('sends a null hash when no family has resolved yet', async () => {
        writeConsent(true);
        appendToBuffer(rec());
        const send = vi
            .spyOn(telemetryApi, 'recordDiagnostics')
            .mockResolvedValue(undefined);

        await flushTelemetry();

        // Correct, not a bug: early-startup events genuinely have no family.
        expect(send.mock.calls[0][0][0].family_id_hash).toBeNull();
    });
});

describe('flushTelemetry failure handling', () => {
    it('never rejects when the send fails, and keeps the batch for a retry', async () => {
        writeConsent(true);
        appendToBuffer(rec());
        vi.spyOn(telemetryApi, 'recordDiagnostics').mockRejectedValue(
            new Error('offline'),
        );

        await expect(flushTelemetry()).resolves.toBe(0);
        expect(readBuffer()).toHaveLength(1);
    });

    it('does not run two flushes concurrently', async () => {
        writeConsent(true);
        appendToBuffer(rec());

        let resolveSend: () => void = () => {};
        const send = vi.spyOn(telemetryApi, 'recordDiagnostics').mockImplementation(
            () =>
                new Promise<void>((resolve) => {
                    resolveSend = resolve;
                }),
        );

        const first = flushTelemetry();
        // A visibilitychange landing on top of the interval must not double-send.
        expect(await flushTelemetry()).toBe(0);

        resolveSend();
        await first;
        expect(send).toHaveBeenCalledOnce();
    });
});
