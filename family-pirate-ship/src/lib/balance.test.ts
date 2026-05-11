import { describe, expect, it } from 'vitest';
import { calculateBalance } from './balance';

const DEFAULTS = {
    fairWindsThreshold: 0.6,
    harborThreshold: 0.75,
    minimumDriveMinutes: 2,
};

describe('calculateBalance', () => {
    it('returns harbor when nobody participated', () => {
        const r = calculateBalance({
            totalsSeconds: [0, 0, 0],
            active: [true, true, true],
            ...DEFAULTS,
        });
        expect(r).toEqual({ tier: 'harbor', biggestShare: 0 });
    });

    it('returns harbor below the minimum drive length', () => {
        // 60s total, well under 2 min threshold — doesn't earn an unlock.
        const r = calculateBalance({
            totalsSeconds: [20, 20, 20],
            active: [true, true, true],
            ...DEFAULTS,
        });
        expect(r.tier).toBe('harbor');
    });

    it('returns solo when only one pirate sailed', () => {
        const r = calculateBalance({
            totalsSeconds: [300, 0, 0],
            active: [true, false, false],
            ...DEFAULTS,
        });
        expect(r.tier).toBe('solo');
        expect(r.biggestShare).toBe(1);
    });

    it('returns fair_winds at exactly the threshold', () => {
        // kid 60%, mom 20%, dad 20%, total 300s → biggest share = 0.6 (≤ threshold)
        const r = calculateBalance({
            totalsSeconds: [180, 60, 60],
            active: [true, true, true],
            ...DEFAULTS,
        });
        expect(r.tier).toBe('fair_winds');
        expect(r.biggestShare).toBeCloseTo(0.6, 5);
    });

    it('returns coastal between fair-winds and harbor thresholds', () => {
        // kid 70%, mom/dad 15% each → 0.6 < 0.7 ≤ 0.75 → coastal
        const r = calculateBalance({
            totalsSeconds: [210, 45, 45],
            active: [true, true, true],
            ...DEFAULTS,
        });
        expect(r.tier).toBe('coastal');
        expect(r.biggestShare).toBeCloseTo(0.7, 5);
    });

    it('returns harbor when the biggest share exceeds harborThreshold', () => {
        // kid 80%, mom 10%, dad 10%
        const r = calculateBalance({
            totalsSeconds: [240, 30, 30],
            active: [true, true, true],
            ...DEFAULTS,
        });
        expect(r.tier).toBe('harbor');
        expect(r.biggestShare).toBeCloseTo(0.8, 5);
    });

    it('ignores seconds from pirates who sat out', () => {
        // kid 180, mom 60 active; dad was inactive but has residual 999 → should be dropped
        const r = calculateBalance({
            totalsSeconds: [180, 60, 999],
            active: [true, true, false],
            ...DEFAULTS,
        });
        // Now considered set is [180, 60], biggest = 180/240 = 0.75
        expect(r.tier).toBe('coastal'); // 0.75 ≤ 0.75 → coastal, not harbor
        expect(r.biggestShare).toBeCloseTo(0.75, 5);
    });

    it('respects custom thresholds (stricter fair-winds)', () => {
        // With stricter threshold 0.5, 60% biggest share no longer earns fair_winds
        const r = calculateBalance({
            totalsSeconds: [180, 60, 60],
            active: [true, true, true],
            fairWindsThreshold: 0.5,
            harborThreshold: 0.75,
            minimumDriveMinutes: 2,
        });
        expect(r.tier).toBe('coastal');
    });

    it('is harbor at exactly 1 minute even if perfectly balanced', () => {
        // Minimum drive length takes priority over balance.
        const r = calculateBalance({
            totalsSeconds: [20, 20, 20], // 60 seconds total = 1 min
            active: [true, true, true],
            ...DEFAULTS,
        });
        expect(r.tier).toBe('harbor');
    });

    it('passes minimum length at exactly the threshold', () => {
        // 2 minutes exactly, perfectly balanced → fair_winds
        const r = calculateBalance({
            totalsSeconds: [40, 40, 40], // 120s = 2 min
            active: [true, true, true],
            ...DEFAULTS,
        });
        expect(r.tier).toBe('fair_winds');
    });
});
