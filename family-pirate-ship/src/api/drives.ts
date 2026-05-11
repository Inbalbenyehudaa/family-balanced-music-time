import { supabase } from './client';
import { mapError } from './errors';
import type { Drive, DriveRecord, PirateKind, Tier, TierV3 } from '../types';
import { tierV3ToLegacy } from '../types';

interface DriveRow {
    id: string;
    family_id: string;
    started_at: string;
    ended_at: string;
    biggest_share: number;
    tier: TierV3;
    island_unlocked_id: string | null;
    coastal_find_id: string | null;
    created_at: string;
    created_by_user_id: string;
}

interface ParticipantRow {
    drive_id: string;
    pirate_id: string;
    participated: boolean;
    total_minutes: number;
    total_seconds: number;
    tap_count: number;
}

interface PirateSlotRow {
    id: string;
    slot: PirateKind;
}

/**
 * Insert a completed drive. The server insert is two separate calls — the
 * `drive` row first, then N `drive_participant` rows — because Postgres
 * doesn't support multi-table transactional inserts via PostgREST. If the
 * second call fails, the drive row exists but with no participants; the
 * sync worker's retry will try again. We accept that drift window in
 * exchange for not needing an RPC.
 *
 * Idempotency: `drive.id` is a client-generated UUID, so retrying after a
 * successful first call throws a unique-violation (code 23505), which the
 * sync worker classifies as "already applied" and drops from the queue.
 */
export async function insertDrive(record: DriveRecord): Promise<void> {
    const { error: driveErr } = await supabase.from('drive').insert({
        id: record.id,
        family_id: record.familyId,
        started_at: new Date(record.startedAt).toISOString(),
        ended_at: new Date(record.endedAt).toISOString(),
        biggest_share: record.biggestShare,
        tier: record.tier,
        island_unlocked_id: record.islandUnlockedId ?? null,
        coastal_find_id: record.coastalFindId ?? null,
        created_by_user_id: record.createdByUserId,
    });
    if (driveErr) throw mapError(driveErr);

    const participantRows = record.participants.map((p) => ({
        drive_id: record.id,
        pirate_id: p.pirateId,
        participated: p.participated,
        total_minutes: p.totalMinutes,
        total_seconds: p.totalSeconds,
        tap_count: p.tapCount,
    }));
    if (participantRows.length > 0) {
        const { error: pErr } = await supabase
            .from('drive_participant')
            .insert(participantRows);
        // 23505 here means a retry hit a drive that was already inserted with
        // its participants. Treat as success.
        if (pErr && (pErr as { code?: string }).code !== '23505') throw mapError(pErr);
    }
}

/**
 * Fetch every drive for the family with participants joined. Returns the
 * v2-shaped `Drive` so screens don't change. Server tiers are mapped back
 * to the legacy `fair | coastal | harbor` triple (`solo` folds to `fair`).
 */
export async function listDrives(familyId: string): Promise<Drive[]> {
    const { data: driveData, error } = await supabase
        .from('drive')
        .select('*')
        .eq('family_id', familyId)
        .order('started_at', { ascending: true });
    if (error) throw mapError(error);
    const drives = (driveData ?? []) as DriveRow[];
    if (drives.length === 0) return [];

    const driveIds = drives.map((d) => d.id);
    const { data: partData, error: pErr } = await supabase
        .from('drive_participant')
        .select('*')
        .in('drive_id', driveIds);
    if (pErr) throw mapError(pErr);
    const participants = (partData ?? []) as ParticipantRow[];

    // Fetch the family's pirate slot mapping so we can produce a stable
    // kid/mom/dad-ordered perPirate array. Without this, the history row's
    // "top participant" pointed at whoever Postgres happened to join first.
    const { data: pirateData, error: pirErr } = await supabase
        .from('pirate')
        .select('id, slot')
        .eq('family_id', familyId);
    if (pirErr) throw mapError(pirErr);
    const slotByPirateId = new Map<string, PirateKind>();
    for (const row of (pirateData ?? []) as PirateSlotRow[]) {
        slotByPirateId.set(row.id, row.slot);
    }

    const partsByDrive = new Map<string, ParticipantRow[]>();
    for (const p of participants) {
        const list = partsByDrive.get(p.drive_id) ?? [];
        list.push(p);
        partsByDrive.set(p.drive_id, list);
    }

    return drives.map((d) => toV2Drive(d, partsByDrive.get(d.id) ?? [], slotByPirateId));
}

const SLOT_ORDER: PirateKind[] = ['kid', 'mom', 'dad'];

function toV2Drive(
    d: DriveRow,
    parts: ParticipantRow[],
    slotByPirateId: Map<string, PirateKind>,
): Drive {
    const startedAt = Date.parse(d.started_at);
    const endedAt = Date.parse(d.ended_at);
    // Seconds is the canonical unit from 0005 onwards. Fall back to
    // total_minutes * 60 for rows written before the migration so history
    // for existing users doesn't vanish.
    const secondsOf = (p: ParticipantRow) =>
        p.total_seconds > 0 ? p.total_seconds : p.total_minutes * 60;
    const totalSeconds = parts.reduce((sum, p) => sum + secondsOf(p), 0);
    // Build perPirate in the app's kid/mom/dad order so the Settings
    // history chip ("who had the most time") points at the correct pirate
    // regardless of Postgres join order. Missing participants get 0.
    const byKind: Record<PirateKind, number> = { kid: 0, mom: 0, dad: 0 };
    for (const p of parts) {
        const slot = slotByPirateId.get(p.pirate_id);
        if (slot) byKind[slot] = Math.floor(secondsOf(p) / 60);
    }
    const perPirate = SLOT_ORDER.map((k) => byKind[k]);
    const tier: Tier = tierV3ToLegacy(d.tier);
    return {
        id: d.id,
        startedAt,
        endedAt,
        biggestShare: d.biggest_share,
        date: new Date(startedAt).toLocaleDateString('he-IL'),
        totalMin: Math.floor(totalSeconds / 60),
        perPirate,
        tier,
        islandId: d.island_unlocked_id ?? undefined,
        coastalFindId: d.coastal_find_id ?? undefined,
    };
}
