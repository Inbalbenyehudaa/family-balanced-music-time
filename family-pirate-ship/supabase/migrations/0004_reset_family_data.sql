-- Family Pirate Ship — reset_family_data RPC
--
-- Why this exists: the RLS policies in 0002 intentionally deny client-side
-- DELETE on drive, island_unlocked, and coastal_find_found ("no update, no
-- delete"). The Settings screen's "reset data" button needs to wipe those
-- rows, so we expose a security-definer RPC that enforces authorization
-- server-side instead.
--
-- Security properties:
--   - Only authenticated callers (see grant at bottom).
--   - Family id is derived from auth.uid() via family_member — the caller
--     cannot target another family's data by passing an argument.
--   - Only the owner of the family can invoke it.
--   - drive_participant is removed via ON DELETE CASCADE on drive.

create or replace function reset_family_data()
  returns void language plpgsql security definer as $$
declare
  fid uuid;
begin
  select family_id into fid from family_member
    where user_id = auth.uid() and role = 'owner';
  if not found then raise exception 'You are not an owner'; end if;

  delete from drive              where family_id = fid;
  delete from island_unlocked    where family_id = fid;
  delete from coastal_find_found where family_id = fid;
end;
$$;

revoke execute on function reset_family_data() from public;
grant  execute on function reset_family_data() to authenticated;
