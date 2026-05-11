import type { TierV3 } from '../types';

export interface BalanceInput {
    /** Seconds listened per participant (same index order as `active`). */
    totalsSeconds: number[];
    /** Whether each participant is sailing (opted in at roll call). */
    active: boolean[];
    fairWindsThreshold: number;
    harborThreshold: number;
    minimumDriveMinutes: number;
}

export interface BalanceResult {
    tier: TierV3;
    biggestShare: number;
}

/**
 * Compute the tier for a finished drive.
 *
 * Rules:
 * - Drives shorter than `minimumDriveMinutes` are never rewarded → 'harbor'.
 * - If only one pirate participated → 'solo' (acknowledged, no unlock).
 * - Otherwise compare the biggest share of total time to the thresholds.
 */
export function calculateBalance({
    totalsSeconds,
    active,
    fairWindsThreshold,
    harborThreshold,
    minimumDriveMinutes,
}: BalanceInput): BalanceResult {
    const considered = totalsSeconds.filter((_, i) => active[i]);
    const totalSeconds = considered.reduce((a, b) => a + b, 0);

    if (totalSeconds === 0) return { tier: 'harbor', biggestShare: 0 };

    const totalMinutes = totalSeconds / 60;
    if (totalMinutes < minimumDriveMinutes) {
        return { tier: 'harbor', biggestShare: 0 };
    }

    if (considered.length === 1) {
        return { tier: 'solo', biggestShare: 1 };
    }

    const max = Math.max(...considered);
    const biggestShare = max / totalSeconds;

    if (biggestShare <= fairWindsThreshold) return { tier: 'fair_winds', biggestShare };
    if (biggestShare <= harborThreshold) return { tier: 'coastal', biggestShare };
    return { tier: 'harbor', biggestShare };
}

/**
 * Legacy v2-shaped helper: takes minutes (seconds — units were ambiguous in v2
 * because the demo fast-clock stored seconds in the "minutes" array) and
 * returns only the tier with the old tier names for back-compat with existing
 * v2 screens. Prefer `calculateBalance` for new code.
 */
export function computeTier(
    minutes: number[],
    active: boolean[],
    fairThreshold = 0.6,
    harborThreshold = 0.75,
): 'fair' | 'coastal' | 'harbor' {
    const considered = minutes.filter((_, i) => active[i]);
    const total = considered.reduce((a, b) => a + b, 0);
    if (total === 0) return 'harbor';
    const max = Math.max(...considered);
    const share = max / total;
    if (considered.length === 1) return 'fair';
    if (share <= fairThreshold) return 'fair';
    if (share <= harborThreshold) return 'coastal';
    return 'harbor';
}
