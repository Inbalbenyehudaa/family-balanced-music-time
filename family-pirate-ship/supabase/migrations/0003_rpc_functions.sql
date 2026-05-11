-- Family Pirate Ship — RPC functions + triggers
-- Dev spec v3 §5b

-- Cap families at 5 members
create or replace function check_family_member_cap() returns trigger
  language plpgsql as $$
begin
  if (select count(*) from family_member where family_id = new.family_id) >= 5 then
    raise exception 'Family is full (max 5 members)';
  end if;
  return new;
end;
$$;

create trigger family_member_cap_trigger
  before insert on family_member
  for each row execute function check_family_member_cap();

-- Create a family + auto-add caller as owner + create 3 default pirates + default settings
create or replace function create_family(family_name text)
  returns uuid language plpgsql security definer as $$
declare
  new_family_id uuid;
begin
  if exists(select 1 from family_member where user_id = auth.uid()) then
    raise exception 'User already belongs to a family';
  end if;

  insert into family(name, owner_user_id) values (family_name, auth.uid())
    returning id into new_family_id;

  insert into family_member(family_id, user_id, role)
    values (new_family_id, auth.uid(), 'owner');

  insert into pirate(family_id, slot, name, flag_color) values
    (new_family_id, 'kid', 'קפטן ילד',     'red'),
    (new_family_id, 'mom', 'אמא־פיראטית',  'green'),
    (new_family_id, 'dad', 'אבא־פיראט',    'purple');

  insert into family_settings(family_id) values (new_family_id);

  return new_family_id;
end;
$$;

-- Accept an invite by ID; returns the family the user joined
create or replace function accept_invite(invite_id uuid)
  returns uuid language plpgsql security definer as $$
declare
  inv family_invite%rowtype;
begin
  select * into inv from family_invite where id = invite_id;
  if not found then raise exception 'Invite not found'; end if;
  if inv.accepted_at is not null then raise exception 'Invite already used'; end if;
  if inv.expires_at < now() then raise exception 'Invite expired'; end if;
  if inv.invitee_email <> (auth.jwt() ->> 'email') then
    raise exception 'Invite is for a different email';
  end if;
  if exists(select 1 from family_member where user_id = auth.uid()) then
    raise exception 'You already belong to a family';
  end if;

  insert into family_member(family_id, user_id, role)
    values (inv.family_id, auth.uid(), 'member');
  update family_invite set accepted_at = now() where id = invite_id;

  return inv.family_id;
end;
$$;

-- Transfer ownership; only current owner can call
create or replace function transfer_ownership(target_user_id uuid)
  returns void language plpgsql security definer as $$
declare
  fid uuid;
begin
  select family_id into fid from family_member
    where user_id = auth.uid() and role = 'owner';
  if not found then raise exception 'You are not an owner'; end if;

  if not exists(select 1 from family_member
                where family_id = fid and user_id = target_user_id) then
    raise exception 'Target is not a family member';
  end if;

  update family_member set role = 'member'
    where family_id = fid and user_id = auth.uid();
  update family_member set role = 'owner'
    where family_id = fid and user_id = target_user_id;
  update family set owner_user_id = target_user_id, updated_at = now()
    where id = fid;
end;
$$;

-- Hard-delete a family and all its data; only owner can call
create or replace function delete_family()
  returns void language plpgsql security definer as $$
declare
  fid uuid;
begin
  select family_id into fid from family_member
    where user_id = auth.uid() and role = 'owner';
  if not found then raise exception 'You are not an owner'; end if;

  -- Cascade does the rest (family_member, pirate, drive, etc. all ON DELETE CASCADE)
  delete from family where id = fid;
end;
$$;

-- Telemetry: insert one event with hashed family_id, no payload, no PII
-- The client computes the hash locally with VITE_TELEMETRY_HASH_SALT.
create or replace function record_event(
  family_id_hash text,
  event_name text
) returns void language plpgsql security definer as $$
begin
  insert into event(family_id_hash, event_name) values (family_id_hash, event_name);
end;
$$;
