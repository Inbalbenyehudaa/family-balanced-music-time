import { supabase } from './client';
import { mapError } from './errors';
import type { FamilyMember, PendingInvite, Role } from '../types';

/**
 * Invite-flow client API.
 *
 * The owner-side "create invite" path hits a Supabase Edge Function —
 * inviteUserByEmail requires the service_role key which can't ship to the
 * browser. Everything else (revoke, accept, list) goes through RLS or a
 * security-definer RPC that does its own authorization checks.
 */

export interface CreateInviteResult {
    inviteId: string;
    /** True when the same email already had a pending invite — we re-sent
     * the email and extended the expiry rather than creating a new row. */
    resent: boolean;
}

export interface InviteError {
    code: string;
    message: string;
}

/**
 * Send an invite by calling the `invite-family-member` Edge Function.
 * Returns the invite id on success, throws `AppError` (with the server's
 * error code preserved on `.cause`) on failure so callers can branch on
 * known codes: ALREADY_MEMBER, IN_OTHER_FAMILY, FAMILY_FULL, INVITE_SELF,
 * RATE_LIMITED, SEND_FAILED, NOT_OWNER, INVALID_EMAIL.
 */
export async function createInvite(
    email: string,
    familyId: string,
): Promise<CreateInviteResult> {
    const { data, error } = await supabase.functions.invoke<
        CreateInviteResult | InviteError
    >('invite-family-member', {
        body: { email, familyId },
    });

    if (error) {
        // functions.invoke wraps non-2xx responses in a FunctionsHttpError.
        // The body often still carries our JSON error payload — try to
        // recover it so the caller sees our code, not a generic "non-2xx".
        const bodyText = await tryReadFunctionErrorBody(error);
        if (bodyText) {
            try {
                const parsed = JSON.parse(bodyText) as InviteError;
                throw Object.assign(new Error(parsed.message || parsed.code), {
                    code: parsed.code,
                });
            } catch (e) {
                if (e instanceof Error && 'code' in e) throw e;
            }
        }
        throw mapError(error);
    }

    if (!data || (data as InviteError).code) {
        const payload = data as InviteError | null;
        throw Object.assign(new Error(payload?.message || 'Invite failed'), {
            code: payload?.code ?? 'UNKNOWN',
        });
    }

    return data as CreateInviteResult;
}

/**
 * `functions.invoke` returns a FunctionsHttpError whose `context` carries
 * the original Response. Reading `.text()` pulls out our JSON error body.
 * Returns null when the error doesn't carry a response body.
 */
async function tryReadFunctionErrorBody(err: unknown): Promise<string | null> {
    try {
        const ctx = (err as { context?: Response }).context;
        if (ctx && typeof ctx.text === 'function') {
            return await ctx.text();
        }
    } catch {
        /* ignore */
    }
    return null;
}

/**
 * Accept an invite. Uses the existing `accept_invite` security-definer RPC
 * which:
 *   - Validates the invite hasn't expired / been revoked / been accepted
 *   - Validates the signed-in user's email matches `invitee_email`
 *   - Inserts the family_member row with role 'member'
 *   - Stamps accepted_at
 *
 * Idempotent: if the caller is already a member of the same family, we
 * treat the "already accepted" / unique-violation error as success. That
 * mirrors the UX contract — tapping the link twice shouldn't scare the user.
 *
 * Returns `{ familyId, alreadyMember }` so the caller can skip the toast
 * animation on the idempotent path.
 */
export async function acceptInvite(
    inviteId: string,
): Promise<{ familyId: string; alreadyMember: boolean }> {
    const { data, error } = await supabase.rpc('accept_invite', {
        invite_id: inviteId,
    });

    if (error) {
        const msg = error.message ?? String(error);
        // Idempotent success paths
        if (/already used/i.test(msg) || /already belong/i.test(msg)) {
            // Find out which family the caller is in so the UI can route.
            const { data: memberRow, error: mErr } = await supabase
                .from('family_member')
                .select('family_id')
                .maybeSingle();
            if (mErr) throw mapError(mErr);
            if (memberRow?.family_id) {
                return {
                    familyId: memberRow.family_id as string,
                    alreadyMember: true,
                };
            }
        }
        throw mapError(error);
    }

    return { familyId: data as string, alreadyMember: false };
}

/**
 * Revoke a pending invite. Security-definer RPC verifies the caller owns
 * the invite's family. Idempotent.
 */
export async function revokeInvite(inviteId: string): Promise<void> {
    const { error } = await supabase.rpc('revoke_invite', {
        invite_id: inviteId,
    });
    if (error) throw mapError(error);
}

/**
 * Owner-only: list pending invites for the caller's family. Returns an
 * empty array for members (the RPC returns zero rows when the caller
 * isn't an owner).
 */
export async function listPendingInvites(): Promise<PendingInvite[]> {
    const { data, error } = await supabase.rpc('list_pending_invites');
    if (error) throw mapError(error);
    interface Row {
        id: string;
        invitee_email: string;
        expires_at: string;
        created_at: string;
    }
    return (data as Row[]).map((r) => ({
        id: r.id,
        inviteeEmail: r.invitee_email,
        expiresAt: Date.parse(r.expires_at),
        createdAt: Date.parse(r.created_at),
    }));
}

/**
 * Full-fat member list. Unlike the client-side RLS query in `families.ts`
 * (which can't read auth.users) this goes through a security-definer RPC
 * that surfaces email + display_name alongside user_id/role/joined_at.
 *
 * Used by Settings → Family section to render the crew roster.
 */
export async function listMembersWithProfile(): Promise<FamilyMember[]> {
    const { data, error } = await supabase.rpc('list_family_members_with_profile');
    if (error) throw mapError(error);
    interface Row {
        user_id: string;
        email: string;
        display_name: string;
        role: Role;
        joined_at: string;
    }
    return (data as Row[]).map((r) => ({
        userId: r.user_id,
        email: r.email ?? '',
        displayName: r.display_name ?? r.email ?? '',
        role: r.role,
        joinedAt: Date.parse(r.joined_at),
    }));
}

/**
 * Owner-only: remove a non-owner member from the family. Historical
 * drives remain attached via drive.created_by_user_id.
 */
export async function removeMember(userId: string): Promise<void> {
    const { error } = await supabase.rpc('remove_family_member', {
        target_user_id: userId,
    });
    if (error) throw mapError(error);
}
