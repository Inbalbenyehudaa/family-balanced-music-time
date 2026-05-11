import { supabase } from './client';
import { mapError } from './errors';
import type { Family, FamilyMember, Role } from '../types';

interface FamilyRow {
    id: string;
    name: string;
    owner_user_id: string;
    created_at: string;
    updated_at: string;
}

function toFamily(r: FamilyRow): Family {
    return {
        id: r.id,
        name: r.name,
        ownerUserId: r.owner_user_id,
        createdAt: Date.parse(r.created_at),
        updatedAt: Date.parse(r.updated_at),
    };
}

/**
 * Create a family via the `create_family` RPC. The RPC:
 * - Enforces one-family-per-user
 * - Inserts a family row
 * - Adds the caller as owner in family_member
 * - Seeds 3 default pirates
 * - Seeds default settings
 *
 * Returns the new family's ID.
 */
export async function createFamily(name: string): Promise<string> {
    const { data, error } = await supabase.rpc('create_family', { family_name: name });
    if (error) throw mapError(error);
    return data as string;
}

/**
 * Resolve the calling user's family (if any). Returns null when the user
 * has no family_member row yet — caller routes them to onboarding.
 *
 * Filters explicitly by `user_id = auth.uid()` rather than relying on the
 * RLS policy to scope rows. The RLS policy returns *every* family_member
 * row for any family you belong to (including, in a multi-member family,
 * your partner's row), which would break `.single()`. Being explicit here
 * means the query works correctly in both solo and multi-member families.
 */
export async function getMyFamily(): Promise<Family | null> {
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) throw mapError(userErr);
    const uid = userData.user?.id;
    if (!uid) return null;

    const { data, error } = await supabase
        .from('family_member')
        .select('role, family:family_id(id, name, owner_user_id, created_at, updated_at)')
        .eq('user_id', uid)
        .maybeSingle();
    if (error) throw mapError(error);
    if (!data) return null;
    const famAny = (data as { family: FamilyRow | FamilyRow[] | null }).family;
    const fam = Array.isArray(famAny) ? famAny[0] : famAny;
    return fam ? toFamily(fam) : null;
}

/** Optional helper — fetch the family alongside the caller's role. */
export async function getMyFamilyAndRole(): Promise<{ family: Family; role: Role } | null> {
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) throw mapError(userErr);
    const uid = userData.user?.id;
    if (!uid) return null;

    const { data, error } = await supabase
        .from('family_member')
        .select('role, family:family_id(id, name, owner_user_id, created_at, updated_at)')
        .eq('user_id', uid)
        .maybeSingle();
    if (error) throw mapError(error);
    if (!data) return null;
    const famAny = (data as { family: FamilyRow | FamilyRow[] | null }).family;
    const fam = Array.isArray(famAny) ? famAny[0] : famAny;
    if (!fam) return null;
    return { family: toFamily(fam), role: (data as { role: Role }).role };
}

interface MemberRow {
    user_id: string;
    role: Role;
    joined_at: string;
}

/**
 * Wipe a family's user-generated state: drives (participants cascade),
 * unlocked islands, coastal finds. Pirate names and settings are reset
 * to defaults by the caller via the existing update paths.
 *
 * Goes through the `reset_family_data` security-definer RPC — the RLS
 * policies in 0002 deny client-side DELETE on these tables, so direct
 * DELETEs would silently match zero rows and the UI would re-hydrate
 * the old data on the next pull. The RPC checks caller ownership
 * server-side and derives the family id from auth.uid(), so the
 * `familyId` argument is informational only (kept for the callsite).
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function wipeFamilyData(_familyId: string): Promise<void> {
    const { error } = await supabase.rpc('reset_family_data');
    if (error) throw mapError(error);
}

export async function listMembers(familyId: string): Promise<FamilyMember[]> {
    // Phase 2 only needs user_id + role + joined_at. Email/displayName come from
    // auth.users which isn't readable from the client — Phase 4 (invites)
    // will use an RPC to return that richer shape. For now we return what RLS
    // allows.
    const { data, error } = await supabase
        .from('family_member')
        .select('user_id, role, joined_at')
        .eq('family_id', familyId);
    if (error) throw mapError(error);
    return (data as MemberRow[]).map((r) => ({
        userId: r.user_id,
        email: '',
        displayName: '',
        role: r.role,
        joinedAt: Date.parse(r.joined_at),
    }));
}
