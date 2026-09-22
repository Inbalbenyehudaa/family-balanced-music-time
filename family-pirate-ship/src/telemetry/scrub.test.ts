import { describe, expect, it } from 'vitest';
import { MAX_DETAIL_LENGTH, scrubDetail, scrubError } from './scrub';

// The real thing: Hebrew kid names, as they appear in piratesStore.
const NAMES = { pirates: ['יונתן', 'מאיה', 'אבא'], family: 'משפחת ים' };

describe('scrubDetail', () => {
    it('returns null for empty input', () => {
        expect(scrubDetail(null)).toBeNull();
        expect(scrubDetail(undefined)).toBeNull();
        expect(scrubDetail('')).toBeNull();
        expect(scrubDetail('   ')).toBeNull();
    });

    it('strips email addresses', () => {
        const out = scrubDetail('invite failed for parent@example.co.il');
        expect(out).toBe('invite failed for [email]');
        expect(out).not.toContain('example');
    });

    it('strips UUIDs — family, user, drive and pirate ids all share the shape', () => {
        const out = scrubDetail(
            'insert failed for drive 3f2504e0-4f89-11d3-9a0c-0305e82c3301',
        );
        expect(out).toBe('insert failed for drive [id]');
    });

    it('strips JWTs', () => {
        const out = scrubDetail(
            'auth rejected eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc123def',
        );
        expect(out).toContain('[token]');
        expect(out).not.toContain('eyJ');
    });

    it('strips long hex runs, including our own family_id_hash', () => {
        const out = scrubDetail(
            'duplicate for a3f9c2b18e4d5a6790bc1d2e3f4a5b6c7d8e9f0a1b2c3d4e',
        );
        expect(out).toBe('duplicate for [hash]');
    });

    it('strips pirate names — these are children', () => {
        const out = scrubDetail('failed to save pirate יונתן', NAMES);
        expect(out).toBe('failed to save pirate [name]');
        expect(out).not.toContain('יונתן');
    });

    it('strips every pirate name in one message, and the family name too', () => {
        const out = scrubDetail('מאיה and יונתן in משפחת ים', NAMES);
        expect(out).not.toContain('מאיה');
        expect(out).not.toContain('יונתן');
        expect(out).not.toContain('משפחת ים');
    });

    it('strips names case-insensitively for latin-script names', () => {
        const out = scrubDetail('save failed for MAYA', { pirates: ['Maya'] });
        expect(out).toBe('save failed for [name]');
    });

    it('skips names too short to match safely', () => {
        // A one- or two-character name would shred every message into
        // [name]s and redact more than it protects.
        const out = scrubDetail('an error occurred', { pirates: ['א', 'בו'] });
        expect(out).toBe('an error occurred');
    });

    it('survives a name containing regex metacharacters', () => {
        const out = scrubDetail('failed for a.b*c', { pirates: ['a.b*c'] });
        expect(out).toBe('failed for [name]');
        // And does not treat the dot as a wildcard against other text.
        expect(scrubDetail('failed for axbxc', { pirates: ['a.b*c'] })).toBe(
            'failed for axbxc',
        );
    });

    it('truncates to the maximum length', () => {
        const out = scrubDetail('x'.repeat(1000));
        expect(out).toHaveLength(MAX_DETAIL_LENGTH);
    });

    it('coerces non-string input rather than throwing', () => {
        expect(scrubDetail(42)).toBe('42');
        expect(scrubDetail({ a: 1 })).toBe('[object Object]');
    });

    it('applies every rule to one hostile message', () => {
        const out = scrubDetail(
            'sync failed: mom@example.com / family 3f2504e0-4f89-11d3-9a0c-0305e82c3301 / pirate מאיה',
            NAMES,
        );
        expect(out).not.toContain('@example.com');
        expect(out).not.toContain('3f2504e0');
        expect(out).not.toContain('מאיה');
    });
});

describe('scrubError', () => {
    it('keeps the error name and scrubs the message', () => {
        const err = new TypeError('cannot read name of יונתן');
        expect(scrubError(err, NAMES)).toBe('TypeError: cannot read name of [name]');
    });

    it('returns just the name when the message is empty', () => {
        expect(scrubError(new RangeError(''))).toBe('RangeError');
    });

    it('drops stack traces entirely', () => {
        const err = new Error('boom');
        const out = scrubError(err);
        expect(out).toBe('Error: boom');
        // Minified frames with no published source maps carry nothing a
        // human can use; the breadcrumb trail replaces them.
        expect(out).not.toContain('at ');
        expect(out).not.toContain('.js:');
    });

    it('handles non-Error throws', () => {
        expect(scrubError('plain string')).toBe('plain string');
        expect(scrubError(null)).toBeNull();
    });
});
