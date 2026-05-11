-- Family Pirate Ship — Row Level Security policies
-- Dev spec v3 §5a

alter table family             enable row level security;
alter table family_member      enable row level security;
alter table family_invite      enable row level security;
alter table pirate             enable row level security;
alter table drive              enable row level security;
alter table drive_participant  enable row level security;
alter table island_unlocked    enable row level security;
alter table coastal_find_found enable row level security;
alter table family_settings    enable row level security;
alter table event              enable row level security;

-- Helper: is the calling user a member of this family?
create or replace function is_family_member(fid uuid) returns boolean
  language sql stable security definer as $$
  select exists(
    select 1 from family_member
    where family_id = fid and user_id = auth.uid()
  );
$$;

-- Helper: is the calling user the owner of this family?
create or replace function is_family_owner(fid uuid) returns boolean
  language sql stable security definer as $$
  select exists(
    select 1 from family_member
    where family_id = fid and user_id = auth.uid() and role = 'owner'
  );
$$;

-- family: members can read; owner can update name; insert/delete via RPC only
create policy family_select on family for select
  using (is_family_member(id));
create policy family_update_owner on family for update
  using (is_family_owner(id))
  with check (is_family_owner(id));

-- family_member: members can read their family's roster; insert/delete via RPC
create policy family_member_select on family_member for select
  using (is_family_member(family_id));

-- family_invite: only family members can see invites for their family;
-- anyone signed in can see their own invites by email
create policy family_invite_select_member on family_invite for select
  using (is_family_member(family_id));
create policy family_invite_select_invitee on family_invite for select
  using (invitee_email = (auth.jwt() ->> 'email'));
create policy family_invite_insert on family_invite for insert
  with check (is_family_member(family_id));

-- pirate: read/update for family members; insert/delete via RPC at family creation
create policy pirate_select on pirate for select using (is_family_member(family_id));
create policy pirate_update on pirate for update using (is_family_member(family_id));

-- drive + participants: read/insert by family members; no update; no client-side delete
create policy drive_select on drive for select using (is_family_member(family_id));
create policy drive_insert on drive for insert with check (is_family_member(family_id));

create policy dp_select on drive_participant for select
  using (exists(select 1 from drive d
                where d.id = drive_participant.drive_id
                  and is_family_member(d.family_id)));
create policy dp_insert on drive_participant for insert
  with check (exists(select 1 from drive d
                     where d.id = drive_participant.drive_id
                       and is_family_member(d.family_id)));

-- island_unlocked / coastal_find_found: read/insert; no update, no delete
create policy iu_select on island_unlocked for select using (is_family_member(family_id));
create policy iu_insert on island_unlocked for insert with check (is_family_member(family_id));

create policy cf_select on coastal_find_found for select using (is_family_member(family_id));
create policy cf_insert on coastal_find_found for insert with check (is_family_member(family_id));

-- family_settings: read for members, update for members
create policy fs_select on family_settings for select using (is_family_member(family_id));
create policy fs_update on family_settings for update using (is_family_member(family_id));

-- events: NO direct policies. All inserts go through record_event RPC.
-- No SELECT policy = no client can read events back.
