import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { record } from './record';
import { readBuffer, resetBufferStateForTests } from './buffer';
import { usePiratesStore } from '../store/piratesStore';
import { useAuthStore } from '../store/authStore';
import type { Pirate } from '../types';

const PIRATES: Pirate[] = [
    { kind: 'kid', role: 'kid', name: 'יונתן', color: '#E63946', serverId: 'p-kid' },
    { kind: 'mom', role: 'mom', name: 'מאיה', color: '#2A9D8F', serverId: 'p-mom' },
    { kind: 'dad', role: 'dad', name: 'אבא', color: '#7B4B94', serverId: 'p-dad' },
];

beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    resetBufferStateForTests();
    usePiratesStore.setState({ pirates: PIRATES });
    useAuthStore.setState({
        family: {
            id: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
            name: 'משפחת ים',
            ownerUserId: 'u1',
            createdAt: 0,
            updatedAt: 0,
        },
    });
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('record', () => {
    it('writes to the buffer with the level declared for the code', () => {
        record('drive_resumed', { gapSec: 300, totalSec: 120 });

        const [entry] = readBuffer();
        expect(entry.code).toBe('drive_resumed');
        expect(entry.level).toBe('warn');
        expect(entry.context).toEqual({ gapSec: 300, totalSec: 120 });
    });

    it('stamps the build id, so a row can say which build produced it', () => {
        record('app_opened', { resumedDrive: false });
        expect(readBuffer()[0].app_version).toMatch(/^\d+\.\d+\.\d+\+/);
    });

    it('stamps a session id and an increasing sequence', () => {
        record('app_opened', { resumedDrive: false });
        record('drive_started', { participantCount: 2 });

        const buf = readBuffer();
        expect(buf[0].session_id).toBe(buf[1].session_id);
        expect(buf[1].seq).toBeGreaterThan(buf[0].seq);
    });

    it('leaves family_id_hash for flush time', () => {
        record('app_opened', { resumedDrive: false });
        // Hashing is async; the family often has not resolved when the
        // interesting events fire.
        expect(readBuffer()[0].family_id_hash).toBeNull();
    });

    it('records no detail when none is given', () => {
        record('pull_failed', {});
        expect(readBuffer()[0].detail).toBeNull();
    });

    it('scrubs pirate names out of a detail — these are children', () => {
        record('family_lookup_failed', {}, new Error('could not load יונתן'));

        const { detail } = readBuffer()[0];
        expect(detail).toBe('Error: could not load [name]');
        expect(detail).not.toContain('יונתן');
    });

    it('scrubs the family name and raw ids too', () => {
        record(
            'pull_failed',
            {},
            new Error('משפחת ים / 3f2504e0-4f89-11d3-9a0c-0305e82c3301 failed'),
        );

        const { detail } = readBuffer()[0];
        expect(detail).not.toContain('משפחת ים');
        expect(detail).not.toContain('3f2504e0');
    });

    it('normalises an empty context to null rather than {}', () => {
        record('pull_failed', {});
        expect(readBuffer()[0].context).toBeNull();
    });

    it('never throws, even when storage is broken', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('QuotaExceededError');
        });
        // A diagnostics channel that can break the app it reports on is a
        // liability.
        expect(() => record('app_opened', { resumedDrive: true })).not.toThrow();
    });

    it('never throws when the stores cannot be read', () => {
        vi.spyOn(usePiratesStore, 'getState').mockImplementation(() => {
            throw new Error('store exploded');
        });
        expect(() =>
            record('render_error', { stackDepth: 3 }, new Error('boom')),
        ).not.toThrow();
        // The regex rules still ran even though names were unavailable.
        expect(readBuffer()[0].detail).toBe('Error: boom');
    });
});
