import { supabase } from './client';
import { mapError } from './errors';

export interface UnlockPayload {
    familyId: string;
    islandId: string;
    driveId?: string;
}

export interface CoastalFindPayload {
    familyId: string;
    findId: string;
    driveId?: string;
}

export interface RenamePayload {
    familyId: string;
    islandId: string;
    customName: string;
}

/**
 * Record an island unlock. The (family_id, island_id) PK means re-inserting
 * the same pair throws 23505; the sync worker treats that as "already
 * applied" and drops the retry from the queue.
 */
export async function recordUnlock(p: UnlockPayload): Promise<void> {
    const { error } = await supabase.from('island_unlocked').insert({
        family_id: p.familyId,
        island_id: p.islandId,
        drive_id: p.driveId ?? null,
    });
    if (error && (error as { code?: string }).code !== '23505') throw mapError(error);
}

export async function recordCoastalFind(p: CoastalFindPayload): Promise<void> {
    const { error } = await supabase.from('coastal_find_found').insert({
        family_id: p.familyId,
        find_id: p.findId,
        drive_id: p.driveId ?? null,
    });
    if (error && (error as { code?: string }).code !== '23505') throw mapError(error);
}

export async function renameIsland(p: RenamePayload): Promise<void> {
    const { error } = await supabase
        .from('island_unlocked')
        .update({ custom_name: p.customName })
        .eq('family_id', p.familyId)
        .eq('island_id', p.islandId);
    if (error) throw mapError(error);
}

export async function listUnlocked(familyId: string): Promise<string[]> {
    const { data, error } = await supabase
        .from('island_unlocked')
        .select('island_id')
        .eq('family_id', familyId);
    if (error) throw mapError(error);
    return (data ?? []).map((r) => (r as { island_id: string }).island_id);
}

export async function listCoastalFinds(familyId: string): Promise<string[]> {
    const { data, error } = await supabase
        .from('coastal_find_found')
        .select('find_id')
        .eq('family_id', familyId);
    if (error) throw mapError(error);
    return (data ?? []).map((r) => (r as { find_id: string }).find_id);
}
