import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hashFamilyId } from './hash';

const FAMILY_A = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';
const FAMILY_B = '9c858901-8a57-4791-81fe-4c455b099bc9';

beforeEach(() => {
    // Never depend on the ambient .env.local — this must behave identically
    // on a fresh clone and in CI.
    vi.stubEnv('VITE_TELEMETRY_HASH_SALT', 'salt-for-tests');
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('hashFamilyId', () => {
    it('produces a 64-char hex digest', async () => {
        await expect(hashFamilyId(FAMILY_A)).resolves.toMatch(/^[0-9a-f]{64}$/);
    });

    it('never leaks the id it hashed', async () => {
        const hash = await hashFamilyId(FAMILY_A);
        expect(hash).not.toContain(FAMILY_A);
        expect(hash).not.toContain('3f2504e0');
    });

    it('is stable for the same family — that is what makes it useful', async () => {
        expect(await hashFamilyId(FAMILY_A)).toBe(await hashFamilyId(FAMILY_A));
    });

    it('separates different families', async () => {
        expect(await hashFamilyId(FAMILY_A)).not.toBe(await hashFamilyId(FAMILY_B));
    });

    it('returns null without a salt, rather than hashing unsalted', async () => {
        // An unsalted SHA-256 of a UUID is just the UUID to anyone holding
        // the table and a rainbow table. Better to send no family id at all.
        vi.stubEnv('VITE_TELEMETRY_HASH_SALT', '');
        await expect(hashFamilyId(FAMILY_B)).resolves.toBeNull();
    });

    it('returns null for an empty id', async () => {
        await expect(hashFamilyId('')).resolves.toBeNull();
    });

    it('folds the salt into the digest', async () => {
        // The in-module cache is keyed by family id alone, so a salt change
        // isn't observable within one session — consistent with the README's
        // "generate once, never rotate". Reset the module graph to see the
        // salt actually participate.
        const id = '11111111-1111-4111-8111-111111111111';

        vi.stubEnv('VITE_TELEMETRY_HASH_SALT', 'salt-one');
        vi.resetModules();
        const one = await (await import('./hash')).hashFamilyId(id);

        vi.stubEnv('VITE_TELEMETRY_HASH_SALT', 'salt-two');
        vi.resetModules();
        const two = await (await import('./hash')).hashFamilyId(id);

        expect(one).toMatch(/^[0-9a-f]{64}$/);
        expect(one).not.toBe(two);
    });
});
