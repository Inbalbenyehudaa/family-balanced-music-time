/**
 * The on-device holding pen for diagnostics that haven't been sent yet.
 *
 * This is the part that makes a dead session debuggable. Events are written
 * to localStorage synchronously as they happen, so when the OS discards the
 * tab mid-voyage — the exact failure this channel exists to explain — the
 * trail is already on disk. The next load drains it.
 *
 * Same shape of reasoning as driveSession.ts, and for the same reason:
 * synchronous writes land before a tab is destroyed, async IndexedDB
 * transactions may not.
 *
 * Every operation here is best-effort and silent. A diagnostics channel that
 * throws, or that blocks the app to report that the app is broken, is worse
 * than no diagnostics channel.
 */
import type { DiagnosticRecord } from './codes';

export const TELEMETRY_BUFFER_KEY = 'pirate-ship-telemetry-v1';
const SESSION_KEY = 'pirate-ship-telemetry-session-v1';

/**
 * Ring capacity. Small on purpose: this is a breadcrumb trail, not a log.
 * When it overflows the *oldest* entries go, because the events immediately
 * before a failure are the ones that explain it.
 */
export const BUFFER_CAPACITY = 50;

let seqCounter = 0;

/**
 * Per-page-load id, so a flushed batch can be reassembled into one story.
 * Held in sessionStorage rather than memory so a same-tab reload keeps its
 * identity; falls back to a module variable when storage is unavailable.
 */
let memorySessionId: string | null = null;

function randomId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function sessionId(): string {
    if (memorySessionId) return memorySessionId;
    try {
        const existing = sessionStorage.getItem(SESSION_KEY);
        if (existing) {
            memorySessionId = existing;
            return existing;
        }
        const fresh = randomId();
        sessionStorage.setItem(SESSION_KEY, fresh);
        memorySessionId = fresh;
        return fresh;
    } catch {
        memorySessionId = randomId();
        return memorySessionId;
    }
}

/** Monotonic within a session. Device clocks jump; this does not. */
export function nextSeq(): number {
    return seqCounter++;
}

export function readBuffer(): DiagnosticRecord[] {
    let raw: string | null;
    try {
        raw = localStorage.getItem(TELEMETRY_BUFFER_KEY);
    } catch {
        return [];
    }
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as DiagnosticRecord[]) : [];
    } catch {
        // Corrupt buffer helps nobody and would fail forever. Drop it.
        clearBuffer();
        return [];
    }
}

/**
 * Overwrite the buffer.
 *
 * Returns false when the write was rejected (quota, private mode) so callers
 * can decide, but nothing currently needs to care — a lost breadcrumb is not
 * worth surfacing to the user.
 */
export function writeBuffer(records: DiagnosticRecord[]): boolean {
    try {
        localStorage.setItem(TELEMETRY_BUFFER_KEY, JSON.stringify(records));
        return true;
    } catch {
        return false;
    }
}

export function clearBuffer(): void {
    try {
        localStorage.removeItem(TELEMETRY_BUFFER_KEY);
    } catch {
        /* nothing was written either */
    }
}

/** Append one record, evicting the oldest if the ring is full. */
export function appendToBuffer(record: DiagnosticRecord): void {
    const next = readBuffer();
    next.push(record);
    while (next.length > BUFFER_CAPACITY) next.shift();
    writeBuffer(next);
}

/**
 * Hand the buffered records to a sender and clear only what it accepted.
 *
 * Anything recorded *during* the send stays put: the buffer is re-read after
 * the sender resolves and the drained prefix removed by identity, rather than
 * the whole key being cleared. Without that, a diagnostic raised while a
 * flush was in flight would vanish — and those are exactly the interesting
 * ones, since they tend to be network failures.
 */
export async function drainBuffer(
    send: (records: DiagnosticRecord[]) => Promise<void>,
): Promise<number> {
    const batch = readBuffer();
    if (batch.length === 0) return 0;

    try {
        await send(batch);
    } catch {
        // Left in place; the next flush tries again.
        return 0;
    }

    const sent = new Set(batch.map((r) => `${r.session_id}:${r.seq}`));
    const remaining = readBuffer().filter((r) => !sent.has(`${r.session_id}:${r.seq}`));
    if (remaining.length === 0) clearBuffer();
    else writeBuffer(remaining);

    return batch.length;
}

/** Test seam — resets the module-level session id and sequence counter. */
export function resetBufferStateForTests(): void {
    seqCounter = 0;
    memorySessionId = null;
}
