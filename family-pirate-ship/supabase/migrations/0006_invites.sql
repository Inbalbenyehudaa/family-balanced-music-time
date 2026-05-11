-- Family Pirate Ship — invite flow additions
--
-- What this migration adds:
--   1. family_invite DELETE policy — owner can revoke pending invites.
--   2. family_invite UPDATE policy — invitee can stamp accepted_at when they
--      accept via client-side RPC (accept_invite is security-definer and
--      doesn't need it, but the policy lets direct updates work if we ever
--      need them).
--   3. revoke_invite(invite_id) — security-definer RPC that deletes a
--      pending invite row after verifying the caller is the owner of the
--      invite's family.
--   4. remove_family_member(target_user_id) — owner-only RPC that removes
--      a non-owner family_member row. Historical drives stay attached via
--      drive.created_by_user_id.
--   5. list_family_members_with_profile() — returns member roster with
--      display_name + email from auth.users. Client-side RLS can't see
--      auth.users so we have to surface this through a security-definer
--      function that only returns rows for the caller's family.
--   6. list_pending_invites() — returns pending invites for the caller's
--      family (owner-only view — members don't need it).

-- ─── 1. Owner can DELETE invites (revoke) ────────────────────────────
create policy family_invite_delete_owner on family_invite for delete
  using (is_family_owner(family_id));

-- ─── 2. Invitee can UPDATE their own invite (stamp accepted_at) ──────
create policy family_invite_update_invitee on family_invite for update
  using (invitee_email = (auth.jwt() ->> 'email'))
  with check (invitee_email = (auth.jwt() ->> 'email'));

-- ─── 3. revoke_invite ────────────────────────────────────────────────
create or replace function revoke_invite(invite_id uuid)
  returns void language plpgsql security definer as $$
declare
  inv family_invite%rowtype;
begin
  select * into inv from family_invite where id = invite_id;
  if not found then
    -- idempotent: revoking an already-deleted invite is a no-op
    return;
  end if;
  if not is_family_owner(inv.family_id) then
    raise exception 'Only the owner can revoke invites';
  end if;
  if inv.accepted_at is not null then
    raise exception 'Invite was already accepted';
  end if;
  delete from family_invite where id = invite_id;
end;
$$;

revoke execute on function revoke_invite(uuid) from public;
grant  execute on function revoke_invite(uuid) to authenticated;

-- ─── 4. remove_family_member ─────────────────────────────────────────
-- Owner-only. Deletes a member's family_member row. Cannot target self
-- (owner removal == delete_family). Historical drives remain attached
-- via drive.created_by_user_id because auth.users rows persist.
create or replace function remove_family_member(target_user_id uuid)
  returns void language plpgsql security definer as $$
declare
  fid uuid;
begin
  select family_id into fid from family_member
    where user_id = auth.uid() and role = 'owner';
  if not found then raise exception 'You are not an owner'; end if;

  if target_user_id = auth.uid() then
    raise exception 'Owner cannot remove self; delete the family instead';
  end if;

  delete from family_member
    where family_id = fid and user_id = target_user_id;
end;
$$;

revoke execute on function remove_family_member(uuid) from public;
grant  execute on function remove_family_member(uuid) to authenticated;

-- ─── 5. list_family_members_with_profile ─────────────────────────────
-- Returns the caller's family roster enriched with email + display_name
-- from auth.users. Security-definer because auth.users is not readable
-- from a normal client session.
create or replace function list_family_members_with_profile()
  returns table (
    user_id       uuid,
    email         text,
    display_name  text,
    role          text,
    joined_at     timestamptz
  ) language plpgsql security definer as $$
declare
  fid uuid;
begin
  select family_id into fid from family_member where user_id = auth.uid();
  if not found then
    return;
  end if;

  return query
    select
      fm.user_id,
      u.email::text,
      coalesce(
        (u.raw_user_meta_data ->> 'full_name'),
        (u.raw_user_meta_data ->> 'name'),
        u.email::text
      ) as display_name,
      fm.role,
      fm.joined_at
    from family_member fm
    join auth.users u on u.id = fm.user_id
    where fm.family_id = fid
    order by fm.joined_at asc;
end;
$$;

revoke execute on function list_family_members_with_profile() from public;
grant  execute on function list_family_members_with_profile() to authenticated;

-- ─── 5a. find_family_for_email ───────────────────────────────────────
-- Helper used by the invite-family-member Edge Function: given an
-- email, return the family_id the email already belongs to, or NULL.
-- Exists because auth.users isn't reliably exposed via PostgREST, so
-- the Edge Function can't join auth.users ↔ family_member directly
-- with its service-role client. Returns null when the email has no
-- Supabase account or isn't in any family.
create or replace function find_family_for_email(p_email text)
  returns uuid language plpgsql security definer as $$
declare
  uid uuid;
  fid uuid;
begin
  select id into uid from auth.users where lower(email) = lower(p_email) limit 1;
  if uid is null then
    return null;
  end if;
  select family_id into fid from family_member where user_id = uid limit 1;
  return fid;
end;
$$;

revoke execute on function find_family_for_email(text) from public;
-- Only the service-role Edge Function needs this. Authenticated users
-- would be able to probe whether any email is in any family otherwise.
grant  execute on function find_family_for_email(text) to service_role;

-- ─── 6. list_pending_invites ─────────────────────────────────────────
-- Owner-only view of pending invites. Members have no reason to see
-- them in MVP.
create or replace function list_pending_invites()
  returns table (
    id             uuid,
    invitee_email  text,
    expires_at     timestamptz,
    created_at     timestamptz
  ) language plpgsql security definer as $$
declare
  fid uuid;
begin
  select family_id into fid from family_member
    where user_id = auth.uid() and role = 'owner';
  if not found then
    return;
  end if;

  return query
    select fi.id, fi.invitee_email, fi.expires_at, fi.created_at
    from family_invite fi
    where fi.family_id = fid
      and fi.accepted_at is null
      and fi.expires_at > now()
    order by fi.created_at desc;
end;
$$;

revoke execute on function list_pending_invites() from public;
grant  execute on function list_pending_invites() to authenticated;
