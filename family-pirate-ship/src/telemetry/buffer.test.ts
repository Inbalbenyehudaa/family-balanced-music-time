import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    BUFFER_CAPACITY,
    TELEMETRY_BUFFER_KEY,
    appendToBuffer,
    clearBuffer,
    drainBuffer,
    nextSeq,
    readBuffer,
    resetBufferStateForTests,
    sessionId,
    writeBuffer,
} from './buffer';
import type { DiagnosticRecord } from './codes';

function rec(over: Partial<DiagnosticRecord> = {}): DiagnosticRecord {
    return {
        session_id: 's1',
        seq: 0,
        level: 'info',
        code: 'app_opened',
        detail: null,
        context: null,
        app_version: '0.1.0+test',
        platform: 'android-chrome',
        occurred_at: Date.now(),
        family_id_hash: null,
        ...over,
    };
}

beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    resetBufferStateForTests();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('session id and sequence', () => {
    it('is stable within a session', () => {
        expect(sessionId()).toBe(sessionId());
    });

    it('survives a same-tab reload', () => {
        const first = sessionId();
        resetBufferStateForTests(); // simulates a fresh module graph
        expect(sessionId()).toBe(first);
    });

    it('falls back to memory when sessionStorage is unavailable', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('SecurityError');
        });
        expect(sessionId()).toBeTruthy();
        expect(sessionId()).toBe(sessionId());
    });

    it('increments monotonically regardless of the clock', () => {
        expect([nextSeq(), nextSeq(), nextSeq()]).toEqual([0, 1, 2]);
    });
});

describe('buffer', () => {
    it('starts empty', () => {
        expect(readBuffer()).toEqual([]);
    });

    it('appends and reads back', () => {
        appendToBuffer(rec({ seq: 0 }));
        appendToBuffer(rec({ seq: 1 }));
        expect(readBuffer().map((r) => r.seq)).toEqual([0, 1]);
    });

    it('evicts the OLDEST once full — the newest breadcrumbs explain the failure', () => {
        for (let i = 0; i < BUFFER_CAPACITY + 5; i++) appendToBuffer(rec({ seq: i }));

        const buf = readBuffer();
        expect(buf).toHaveLength(BUFFER_CAPACITY);
        expect(buf[0].seq).toBe(5);
        expect(buf[buf.length - 1].seq).toBe(BUFFER_CAPACITY + 4);
    });

    it('survives a reload — this is what makes a dead session debuggable', () => {
        appendToBuffer(rec({ seq: 0, code: 'drive_started' }));
        appendToBuffer(rec({ seq: 1, code: 'unhandled_error', level: 'error' }));

        // The tab is discarded here. Nothing in memory persists; localStorage does.
        resetBufferStateForTests();

        expect(readBuffer().map((r) => r.code)).toEqual([
            'drive_started',
            'unhandled_error',
        ]);
    });

    it('drops a corrupt buffer rather than failing forever', () => {
        localStorage.setItem(TELEMETRY_BUFFER_KEY, '{not json');
        expect(readBuffer()).toEqual([]);
        expect(localStorage.getItem(TELEMETRY_BUFFER_KEY)).toBeNull();
    });

    it('tolerates storage being unavailable', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('QuotaExceededError');
        });
        expect(() => appendToBuffer(rec())).not.toThrow();
        expect(writeBuffer([rec()])).toBe(false);
    });

    it('clears', () => {
        appendToBuffer(rec());
        clearBuffer();
        expect(readBuffer()).toEqual([]);
    });
});

describe('drainBuffer', () => {
    it('sends the batch and clears it', async () => {
        appendToBuffer(rec({ seq: 0 }));
        appendToBuffer(rec({ seq: 1 }));

        const send = vi.fn().mockResolvedValue(undefined);
        const count = await drainBuffer(send);

        expect(count).toBe(2);
        expect(send).toHaveBeenCalledOnce();
        expect(readBuffer()).toEqual([]);
    });

    it('does nothing when empty', async () => {
        const send = vi.fn().mockResolvedValue(undefined);
        expect(await drainBuffer(send)).toBe(0);
        expect(send).not.toHaveBeenCalled();
    });

    it('keeps the batch when the send fails, so the next flush retries', async () => {
        appendToBuffer(rec({ seq: 0 }));
        const send = vi.fn().mockRejectedValue(new Error('offline'));

        expect(await drainBuffer(send)).toBe(0);
        expect(readBuffer()).toHaveLength(1);
    });

    it('preserves records written DURING the send', async () => {
        // A diagnostic raised while a flush is in flight is often the most
        // interesting one — it tends to be the network failing. Clearing the
        // whole key on success would swallow it.
        appendToBuffer(rec({ seq: 0 }));

        const send = vi.fn().mockImplementation(async () => {
            appendToBuffer(rec({ seq: 99, code: 'sync_flush_failed', level: 'warn' }));
        });

        const count = await drainBuffer(send);

        expect(count).toBe(1);
        const left = readBuffer();
        expect(left).toHaveLength(1);
        expect(left[0].seq).toBe(99);
    });
});
