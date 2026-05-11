-- Family Pirate Ship — initial schema
-- Dev spec v3 §5

create extension if not exists "uuid-ossp";

-- Families
create table family (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null check (length(name) between 1 and 60),
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table family_member (
  family_id  uuid not null references family(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('owner', 'member')),
  joined_at  timestamptz not null default now(),
  primary key (family_id, user_id)
);

-- A user can only belong to one family at a time
create unique index family_member_one_per_user on family_member(user_id);

create table family_invite (
  id               uuid primary key default uuid_generate_v4(),
  family_id        uuid not null references family(id) on delete cascade,
  invitee_email    text not null,
  invited_by_user  uuid not null references auth.users(id) on delete cascade,
  expires_at       timestamptz not null default (now() + interval '7 days'),
  accepted_at      timestamptz,
  created_at       timestamptz not null default now()
);

create index family_invite_email_idx on family_invite(invitee_email) where accepted_at is null;

-- Pirates: exactly 3 per family, one per slot
create table pirate (
  id          uuid primary key default uuid_generate_v4(),
  family_id   uuid not null references family(id) on delete cascade,
  slot        text not null check (slot in ('kid', 'mom', 'dad')),
  name        text not null check (length(name) between 1 and 40),
  flag_color  text not null check (flag_color in ('red', 'green', 'purple')),
  updated_at  timestamptz not null default now(),
  unique (family_id, slot)
);

-- Drives
create table drive (
  id                 uuid primary key default uuid_generate_v4(),
  family_id          uuid not null references family(id) on delete cascade,
  started_at         timestamptz not null,
  ended_at           timestamptz not null,
  biggest_share      double precision not null check (biggest_share between 0 and 1),
  tier               text not null check (tier in ('fair_winds', 'coastal', 'harbor', 'solo')),
  island_unlocked_id text,
  coastal_find_id    text,
  created_at         timestamptz not null default now(),
  created_by_user_id uuid not null references auth.users(id) on delete restrict
);

create index drive_family_started_idx on drive(family_id, started_at desc);

create table drive_participant (
  drive_id      uuid not null references drive(id) on delete cascade,
  pirate_id     uuid not null references pirate(id) on delete cascade,
  participated  boolean not null,
  total_minutes integer not null check (total_minutes >= 0),
  tap_count     integer not null check (tap_count >= 0),
  primary key (drive_id, pirate_id)
);

-- Per-family unlock state
create table island_unlocked (
  family_id     uuid not null references family(id) on delete cascade,
  island_id     text not null,
  custom_name   text,
  unlocked_at   timestamptz not null default now(),
  drive_id      uuid references drive(id) on delete set null,
  primary key (family_id, island_id)
);

create table coastal_find_found (
  family_id  uuid not null references family(id) on delete cascade,
  find_id    text not null,
  found_at   timestamptz not null default now(),
  drive_id   uuid references drive(id) on delete set null,
  primary key (family_id, find_id)
);

create table family_settings (
  family_id              uuid primary key references family(id) on delete cascade,
  fair_winds_threshold   double precision not null default 0.6,
  harbor_threshold       double precision not null default 0.75,
  audio_enabled          boolean not null default true,
  fog_enabled            boolean not null default true,
  minimum_drive_minutes  integer not null default 2,
  telemetry_enabled      boolean not null default true,
  updated_at             timestamptz not null default now(),
  check (fair_winds_threshold < harbor_threshold)
);

-- Telemetry: write-only from clients via RPC, no SELECT for normal users
create table event (
  id              bigserial primary key,
  family_id_hash  text not null,
  event_name      text not null check (event_name in (
                    'app_opened', 'drive_started', 'drive_ended',
                    'island_unlocked', 'coastal_found',
                    'invite_sent', 'invite_accepted', 'member_left'
                  )),
  occurred_at     timestamptz not null default now()
);

create index event_name_time_idx on event(event_name, occurred_at desc);
