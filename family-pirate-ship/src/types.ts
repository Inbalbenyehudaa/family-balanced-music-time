// ─────────────────────────────────────────────────────────────
// Domain shapes shared between v2 screens and v3 stores.
// ─────────────────────────────────────────────────────────────

export type PirateKind = 'kid' | 'mom' | 'dad';
export type FlagColor = 'red' | 'green' | 'purple';
export type Role = 'owner' | 'member';

// ---------- v2 legacy shapes (still used by screens) ----------

export interface Pirate {
    kind: PirateKind;
    role: string;
    name: string;
    color: string;
    /**
     * Server UUID — populated once we've fetched the family's pirate rows.
     * Undefined for DEFAULT_PIRATES prior to sign-in (local-only state).
     */
    serverId?: string;
}

export interface Island {
    id: string;
    name: string;
    description: string;
}

export interface CoastalFind {
    id: string;
    name: string;
}

/**
 * Legacy v2 tier values, used by v2 screens that render the banner and
 * determine which reveal branch to play. Kept for back-compat.
 */
export type Tier = 'fair' | 'coastal' | 'harbor';

/**
 * Server-shaped tier. `calculateBalance` returns this; the server's
 * `drive.tier` column uses these exact strings. The "solo" case (only one
 * pirate participated) doesn't exist in v2 and folds to `'fair'` visually.
 */
export type TierV3 = 'fair_winds' | 'coastal' | 'harbor' | 'solo';

export function tierV3ToLegacy(t: TierV3): Tier {
    if (t === 'fair_winds' || t === 'solo') return 'fair';
    return t;
}

/** v2 drive shape kept on the drives store for back-compat with screens. */
export interface Drive {
    date: string;
    totalMin: number;
    perPirate: number[];
    tier: Tier;
    islandId?: string;
    coastalFindId?: string;
    /**
     * Optional server-side identity — present on drives that have been
     * inserted into / fetched from the server. Missing drives are purely
     * local (queued for sync or pre-auth).
     */
    id?: string;
    startedAt?: number;
    endedAt?: number;
    biggestShare?: number;
}

/**
 * Server-shaped drive record. The sync worker serializes this into
 * `drive` + `drive_participant` rows. Each participant is keyed by its
 * server `pirate.id`, not by PirateKind — the server doesn't have the
 * concept of "slot index" at query time.
 */
export interface DriveRecord {
    id: string; // client-generated UUID, becomes drive.id on server
    familyId: string;
    startedAt: number;
    endedAt: number;
    biggestShare: number;
    tier: TierV3;
    islandUnlockedId?: string;
    coastalFindId?: string;
    createdByUserId: string;
    participants: Array<{
        pirateId: string;
        participated: boolean;
        totalMinutes: number;
        totalSeconds: number;
        tapCount: number;
    }>;
}

// ---------- Dev tweaks panel ----------

export interface TweakValues {
    fairThreshold: number;
    harborThreshold: number;
    audio: boolean;
    fog: boolean;
    demoFastClock: boolean;
}

export type Screen =
    | 'welcome'
    | 'names'
    | 'crew'
    | 'home'
    | 'drive'
    | 'spyglass'
    | 'reveal'
    | 'map'
    | 'gate'
    | 'settings';

// ─────────────────────────────────────────────────────────────
// v3 auth + family shapes (server-aligned)
// ─────────────────────────────────────────────────────────────

export interface AuthUser {
    id: string;
    email: string;
    displayName: string;
}

export interface Family {
    id: string;
    name: string;
    ownerUserId: string;
    createdAt: number;
    updatedAt: number;
}

export interface FamilyMember {
    userId: string;
    email: string;
    displayName: string;
    role: Role;
    joinedAt: number;
}

export interface FamilyInvite {
    id: string;
    familyId: string;
    inviteeEmail: string;
    invitedByUserId: string;
    expiresAt: number;
    acceptedAt?: number;
}

/**
 * Shape returned by the `list_pending_invites` RPC — owner-only view of
 * invite rows where `accepted_at IS NULL` and `expires_at > now()`.
 */
export interface PendingInvite {
    id: string;
    inviteeEmail: string;
    expiresAt: number;
    createdAt: number;
}

// ─────────────────────────────────────────────────────────────
// v3 settings (server-backed)
// ─────────────────────────────────────────────────────────────

export interface Settings {
    fairWindsThreshold: number;
    harborThreshold: number;
    audioEnabled: boolean;
    fogEnabled: boolean;
    minimumDriveMinutes: number;
    telemetryEnabled: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
    fairWindsThreshold: 0.6,
    harborThreshold: 0.75,
    audioEnabled: true,
    fogEnabled: true,
    minimumDriveMinutes: 2,
    telemetryEnabled: true,
};

// ─────────────────────────────────────────────────────────────
// v3 sync queue
// ─────────────────────────────────────────────────────────────

export type QueuedWriteKind =
    | 'insert_drive'
    | 'update_pirate'
    | 'update_settings'
    | 'unlock_island'
    | 'find_coastal'
    | 'rename_island';

export interface QueuedWrite {
    id: string;
    kind: QueuedWriteKind;
    payload: unknown;
    createdAt: number;
    attempts: number;
    lastError?: string;
}
