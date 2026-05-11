// Edge Function: invite-family-member
//
// POST /functions/v1/invite-family-member
// Body: { email: string, familyId: string }
//
// Flow:
//   1. Authenticate the caller via the request's Authorization header and
//      derive their user id.
//   2. Verify the caller is the owner of `familyId`.
//   3. Validate invariants using service-role DB access:
//        - 5-member cap not exceeded
//        - email is not already a family_member of any family
//        - email has no pending invite to this family
//   4. Insert a row into `family_invite` with a 7-day expiry.
//   5. Call supabase.auth.admin.inviteUserByEmail with `redirectTo` set to
//      `${PUBLIC_APP_URL}/invite/<invite_id>` so the magic-link lands on
//      our accept screen.
//
// Returns 200 with { inviteId, resent: boolean } on success.
// Returns 4xx with { error: string, code: string } on validation/auth errors.
//
// Secrets expected (via Supabase function secrets):
//   - SUPABASE_URL                 (automatically provided by Edge runtime)
//   - SUPABASE_SERVICE_ROLE_KEY
//   - PUBLIC_APP_URL               (e.g. https://family-pirate-ship.vercel.app
//                                   or http://localhost:5173 for local dev)

// @ts-expect-error  Deno runtime — types not available in tsconfig
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
// @ts-expect-error  Deno runtime — types not available in tsconfig
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// @ts-expect-error  Deno runtime — types not available in tsconfig
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
// @ts-expect-error  Deno runtime — types not available in tsconfig
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
// @ts-expect-error  Deno runtime — types not available in tsconfig
const PUBLIC_APP_URL = Deno.env.get('PUBLIC_APP_URL') ?? '';
// @ts-expect-error  Deno runtime — types not available in tsconfig
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
}

function normalizeEmail(e: string): string {
    return e.trim().toLowerCase();
}

function isEmail(e: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: CORS_HEADERS });
    }
    if (req.method !== 'POST') {
        return json(405, { error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
    }

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !PUBLIC_APP_URL) {
        return json(500, {
            error: 'Server is not configured',
            code: 'MISCONFIGURED',
        });
    }

    // 1. Authenticate the caller.
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.toLowerCase().startsWith('bearer ')) {
        return json(401, { error: 'Missing bearer token', code: 'UNAUTHENTICATED' });
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
        return json(401, { error: 'Invalid session', code: 'UNAUTHENTICATED' });
    }
    const caller = userData.user;

    // 2. Parse + validate body.
    let payload: { email?: unknown; familyId?: unknown };
    try {
        payload = await req.json();
    } catch {
        return json(400, { error: 'Invalid JSON body', code: 'BAD_REQUEST' });
    }
    const email = typeof payload.email === 'string' ? normalizeEmail(payload.email) : '';
    const familyId =
        typeof payload.familyId === 'string' ? payload.familyId.trim() : '';

    if (!email || !isEmail(email)) {
        return json(400, { error: 'Invalid email address', code: 'INVALID_EMAIL' });
    }
    if (!familyId) {
        return json(400, { error: 'Missing familyId', code: 'BAD_REQUEST' });
    }
    if (email === normalizeEmail(caller.email ?? '')) {
        return json(400, {
            error: 'You cannot invite yourself',
            code: 'INVITE_SELF',
        });
    }

    // 3. Service-role client for admin operations + server-side validation.
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    // 3a. Caller is owner of the family?
    const { data: ownerRow, error: ownerErr } = await admin
        .from('family_member')
        .select('user_id, role, family:family_id(id, name)')
        .eq('family_id', familyId)
        .eq('user_id', caller.id)
        .maybeSingle();
    if (ownerErr) {
        return json(500, { error: ownerErr.message, code: 'DB_ERROR' });
    }
    if (!ownerRow || ownerRow.role !== 'owner') {
        return json(403, {
            error: 'Only the family owner can send invites',
            code: 'NOT_OWNER',
        });
    }

    // 3b. 5-member cap.
    const { count: memberCount, error: countErr } = await admin
        .from('family_member')
        .select('*', { count: 'exact', head: true })
        .eq('family_id', familyId);
    if (countErr) {
        return json(500, { error: countErr.message, code: 'DB_ERROR' });
    }
    if ((memberCount ?? 0) >= 5) {
        return json(409, {
            error: 'Family is already at the 5-member cap',
            code: 'FAMILY_FULL',
        });
    }

    // 3c. Is the invitee already a member of any family? Use the
    // `find_family_for_email` RPC — PostgREST doesn't reliably expose
    // auth.users even to the service role, so a direct join would be
    // fragile across Supabase versions.
    const { data: existingFamilyId, error: lookupErr } = await admin.rpc(
        'find_family_for_email',
        { p_email: email },
    );
    if (lookupErr) {
        return json(500, { error: lookupErr.message, code: 'DB_ERROR' });
    }
    if (existingFamilyId) {
        if (existingFamilyId === familyId) {
            return json(409, {
                error: 'This person is already in your family',
                code: 'ALREADY_MEMBER',
            });
        }
        return json(409, {
            error: 'This email is already part of another Pirate Ship family',
            code: 'IN_OTHER_FAMILY',
        });
    }

    // 3d. Existing pending invite for this email → this family?
    const { data: existingInvite, error: inviteErr } = await admin
        .from('family_invite')
        .select('id, expires_at, accepted_at')
        .eq('family_id', familyId)
        .eq('invitee_email', email)
        .is('accepted_at', null)
        .maybeSingle();
    if (inviteErr) {
        return json(500, { error: inviteErr.message, code: 'DB_ERROR' });
    }

    let inviteId: string;
    let resent = false;

    if (existingInvite) {
        // Reuse the row. Extend the expiry so a stale pending invite
        // doesn't ship a dead link.
        inviteId = existingInvite.id as string;
        const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const { error: updErr } = await admin
            .from('family_invite')
            .update({ expires_at: newExpiry })
            .eq('id', inviteId);
        if (updErr) {
            return json(500, { error: updErr.message, code: 'DB_ERROR' });
        }
        resent = true;
    } else {
        // 4. Insert a fresh invite row.
        const { data: inserted, error: insErr } = await admin
            .from('family_invite')
            .insert({
                family_id: familyId,
                invitee_email: email,
                invited_by_user: caller.id,
            })
            .select('id')
            .single();
        if (insErr || !inserted) {
            return json(500, {
                error: insErr?.message ?? 'Failed to create invite',
                code: 'DB_ERROR',
            });
        }
        inviteId = inserted.id as string;
    }

    // 5. Send the invite email. The magic link lands on /invite/<inviteId>
    // after Supabase processes the handshake.
    const redirectTo = `${PUBLIC_APP_URL.replace(/\/$/, '')}/invite/${inviteId}`;
    const { error: sendErr } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
    });
    if (sendErr) {
        // If we just created this row, don't leave an orphan pending
        // invite behind on a delivery failure. Resend case already had
        // a row, so leave it.
        if (!resent) {
            await admin.from('family_invite').delete().eq('id', inviteId);
        }
        const msg = sendErr.message ?? 'Failed to send invite email';
        const code = /rate|too many/i.test(msg) ? 'RATE_LIMITED' : 'SEND_FAILED';
        return json(502, { error: msg, code });
    }

    return json(200, { inviteId, resent });
});
