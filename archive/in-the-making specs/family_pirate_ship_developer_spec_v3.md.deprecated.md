# Family Pirate Ship — Developer Spec v3

A full-stack technical spec for building V1 of the Family Pirate Ship app. Written to be fed into Claude Code for agentic development. Self-contained: behavior rules, types, file structure, algorithms, schema, sync logic, and a phased build plan are all here.

> **v3 note.** This spec extends v2 with a backend: Supabase (Postgres + Google OAuth + RLS), multi-device family accounts with an invite flow, on-open/on-event sync (not real-time), and minimal first-party telemetry. The mechanics, balance math, and during-drive UX from v2 are unchanged. Backend is in from day one — there is no local-only release. A change log lives at §17.
>
> **What's authoritative.** When this spec, the product spec, and the designer spec disagree on a detail, the source of truth is: **product spec for behavior**, **designer spec for visuals**, **this spec for code structure, types, and the data layer**.

---

## 0. What you're building

A Hebrew-first, mobile-first PWA — backed by a Postgres database via Supabase — that tracks who-listens-to-whose-music during car drives. Three "pirates" share music time. The app teaches a 4.5-year-old that *balanced* music time across the family is the goal.

**Account model:**
- Sign-in: Google OAuth via Supabase Auth
- Family-scoped data: a user joins exactly one family; family contains 1–5 members
- Owner + member roles; owner can invite/remove and delete

**Sync model:**
- Server (Supabase Postgres) is source of truth
- Local cache + write-queue on the device
- Sync triggers: app open, drive end, settings change, manual pull-to-refresh
- *Not* real-time — partner's phone updates only on next open/refresh

**Privacy:** strict. No third-party SDKs. EU region. Hashed family ID for telemetry. Hard delete on request.

---

## 1. Tech Stack (decided)

| Concern | Choice | Why |
|---|---|---|
| Build tool | Vite | Fast dev, modern defaults |
| Framework | React 18 + TypeScript | Standard, type-safe |
| Styling | Tailwind CSS + CSS variables | Fast iteration, RTL support |
| Animations | Framer Motion | Reveal sequencing, springs |
| Routing | React Router v6 | Multi-screen nav |
| State | Zustand + persist middleware | Simple stores; persist is now used as a *cache*, not source of truth |
| **Backend** | **Supabase** **[NEW v3]** | Postgres + Auth + RLS, EU region available, no third-party telemetry |
| **Auth** | **Supabase Auth (Google OAuth)** **[NEW v3]** | One-tap sign-in via `@supabase/supabase-js` |
| **Database** | **Postgres (Supabase-managed)** **[NEW v3]** | Family-scoped tables with RLS policies |
| Persistence (local) | localStorage (Zustand persist) | Now a cache, not source of truth |
| Sync queue | IndexedDB via `idb-keyval` **[NEW v3]** | Durable queue across reloads; localStorage too small/fragile for this |
| PWA | vite-plugin-pwa | Installable, offline-capable |
| Audio | HTMLAudioElement | No library |
| Icons | Lucide React + custom SVG | Lightweight |
| Fonts | System font stack | No Google Fonts; matches v2 |
| Date/time | Native `Date` + `Intl.DateTimeFormat` | No library |
| Email (invites) | **Supabase Auth invite emails + a small custom template** **[NEW v3]** | No SendGrid/Mailgun account needed |

**Node version:** 20+. Use `pnpm` if available.

**Env vars** (all `VITE_*`-prefixed for the client):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_TELEMETRY_HASH_SALT` — used to one-way hash family IDs before writing telemetry events. Never logged.

**Supabase project setup (one-time):**
- Region: EU (Frankfurt or Ireland)
- Auth → Providers → Google: enable, configure OAuth consent screen with the production redirect URL
- Auth → URL Configuration → set Site URL and additional redirect URLs
- Database: apply schema migrations (§5)
- Auth → Email Templates → customize the invite email (Hebrew copy in §11)

---

## 2. Architecture

```
[Browser PWA on phone]
    │
    ├── React SPA (single bundle, client-side routing)
    │   ├── React Router (screens including new sign-in & family-management)
    │   ├── Zustand stores (in-memory, persisted to localStorage as CACHE)
    │   │   ├── authStore        — Supabase session, user, family membership
    │   │   ├── piratesStore     — pirate identities (cached from server)
    │   │   ├── drivesStore      — drives, islands, finds (cached from server)
    │   │   ├── settingsStore    — thresholds, audio, fog, telemetry toggle
    │   │   └── syncStore        — sync queue state, online/offline status
    │   ├── Components, lib/, hooks/, etc.
    │   └── Service worker (vite-plugin-pwa)
    │
    └── Supabase (managed; EU region)
        ├── Auth (Google OAuth provider)
        ├── Postgres
        │   ├── Tables (RLS-protected): families, family_members, family_invites,
        │   │                            pirates, drives, drive_participants,
        │   │                            islands_unlocked, coastal_finds_found,
        │   │                            family_settings
        │   ├── Telemetry table (write-only via RPC): events
        │   └── RPC functions: accept_invite(), transfer_ownership(),
        │                       delete_family(), record_event()
        └── Edge Function (optional, only if invite emails need custom template)
```

**State flow during a drive (offline-tolerant):**
1. `DuringDriveScreen` mounts → starts 1Hz interval timer (unchanged from v2)
2. `activePirateId` defaults to `null` (unchanged from v2 — no auto-glow)
3. Tap → `recordTap()` → swaps active pirate locally
4. Each tick increments local accumulator
5. End-voyage → `endDrive()` → balance computed → drive saved to local cache → **drive enqueued in syncStore for upload**
6. Reveal animation plays from local data (no server round-trip)
7. Background: `syncWorker` flushes the queue when online

---

## 3. Project Structure **[EXPANDED v3]**

```
family-pirate-ship/
├── public/
│   ├── manifest.webmanifest
│   ├── icons/
│   ├── audio/
│   └── images/
├── supabase/                        # [NEW v3]
│   ├── migrations/                  # SQL migrations, applied via Supabase CLI
│   │   ├── 0001_init.sql
│   │   ├── 0002_rls_policies.sql
│   │   └── 0003_rpc_functions.sql
│   ├── seed.sql                     # optional: seed island/coastalFind reference rows
│   └── README.md                    # how to apply migrations locally + in prod
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── routes.tsx
│   ├── strings/he.ts
│   ├── store/
│   │   ├── authStore.ts             # [NEW v3]
│   │   ├── piratesStore.ts
│   │   ├── drivesStore.ts
│   │   ├── settingsStore.ts
│   │   └── syncStore.ts             # [NEW v3]
│   ├── api/                         # [NEW v3] thin wrappers around supabase-js
│   │   ├── client.ts                # creates the supabase client
│   │   ├── auth.ts                  # signInWithGoogle, signOut, onAuthChange
│   │   ├── families.ts              # createFamily, getMyFamily, updateFamily
│   │   ├── members.ts               # listMembers, removeMember, transferOwnership, leaveFamily
│   │   ├── invites.ts               # createInvite, acceptInvite, listPendingInvites
│   │   ├── pirates.ts               # listPirates, updatePirate
│   │   ├── drives.ts                # listDrives, insertDrive
│   │   ├── islands.ts               # listUnlocked, recordUnlock
│   │   ├── settings.ts              # getSettings, updateSettings
│   │   ├── telemetry.ts             # recordEvent (calls RPC)
│   │   └── deletion.ts              # deleteFamily (RPC)
│   ├── sync/                        # [NEW v3]
│   │   ├── queue.ts                 # IndexedDB-backed durable queue
│   │   ├── worker.ts                # flush logic with exponential backoff
│   │   ├── pull.ts                  # full-state pull (used on app open)
│   │   └── conflicts.ts             # last-write-wins resolution helpers
│   ├── components/
│   │   ├── PirateButton.tsx
│   │   ├── ShipPreview.tsx
│   │   ├── CargoStack.tsx
│   │   ├── Crate.tsx
│   │   ├── Spyglass.tsx
│   │   ├── StatusBanner.tsx
│   │   ├── WoodPlankButton.tsx
│   │   ├── PirateAvatar.tsx
│   │   ├── FlagBadge.tsx
│   │   ├── MusicBarEQ.tsx
│   │   ├── Modal.tsx
│   │   ├── ParchmentCard.tsx
│   │   ├── OceanBackground.tsx
│   │   ├── TreasureMapView.tsx
│   │   ├── MapChip.tsx
│   │   ├── OfflineIndicator.tsx     # [NEW v3]
│   │   ├── GoogleSignInButton.tsx   # [NEW v3]
│   │   ├── FamilyMemberRow.tsx      # [NEW v3]
│   │   └── TypedConfirm.tsx         # [NEW v3] "type DELETE to confirm"
│   ├── screens/
│   │   ├── SignInScreen.tsx         # [NEW v3]
│   │   ├── AuthCallbackScreen.tsx   # [NEW v3] handles OAuth redirect
│   │   ├── AcceptInviteScreen.tsx   # [NEW v3]
│   │   ├── FamilyNamingScreen.tsx   # [NEW v3] onboarding step 0
│   │   ├── OnboardingScreen.tsx     # (now post-family-creation)
│   │   ├── HomeScreen.tsx
│   │   ├── RollCallScreen.tsx
│   │   ├── DuringDriveScreen.tsx
│   │   ├── RevealScreen.tsx
│   │   ├── TreasureMapScreen.tsx
│   │   └── settings/
│   │       ├── SettingsScreen.tsx           # the main page
│   │       ├── AccountSection.tsx           # [NEW v3]
│   │       ├── FamilySection.tsx            # [NEW v3]
│   │       ├── TelemetrySection.tsx         # [NEW v3]
│   │       └── DataSection.tsx              # [NEW v3] export + delete
│   ├── lib/
│   │   ├── balance.ts
│   │   ├── islands.ts
│   │   ├── coastalFinds.ts
│   │   ├── audio.ts
│   │   ├── id.ts
│   │   ├── time.ts
│   │   └── hash.ts                  # [NEW v3] one-way hash for family_id_hash
│   ├── types/
│   │   ├── index.ts
│   │   └── db.ts                    # [NEW v3] generated/handwritten types matching DB schema
│   ├── hooks/
│   │   ├── useDriveTimer.ts
│   │   ├── useAuth.ts               # [NEW v3]
│   │   ├── useFamily.ts             # [NEW v3]
│   │   ├── useOnlineStatus.ts       # [NEW v3]
│   │   └── useSyncOnFocus.ts        # [NEW v3]
│   └── styles/
│       ├── globals.css
│       └── tokens.css
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## 4. Data Model — Client TypeScript types **[EXPANDED v3]**

```typescript
// src/types/index.ts

export type FlagColor = 'red' | 'green' | 'purple';
export type AvatarKey = 'kid' | 'mom' | 'dad';
export type Tier = 'fair_winds' | 'coastal' | 'harbor' | 'solo';
export type Role = 'owner' | 'member';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

export interface Family {
  id: string;
  name: string;
  ownerUserId: string;
  createdAt: number;
  updatedAt: number;
}

export interface FamilyMember {
  userId: string;
  email: string;
  displayName: string;
  role: Role;
  joinedAt: number;
}

export interface FamilyInvite {
  id: string;
  familyId: string;
  inviteeEmail: string;
  invitedByUserId: string;
  expiresAt: number;
  acceptedAt?: number;
}

export interface Pirate {
  id: string;
  familyId: string;
  slot: AvatarKey;          // 'kid' | 'mom' | 'dad'
  name: string;
  flagColor: FlagColor;
  updatedAt: number;
}

export interface DriveParticipant {
  pirateId: string;
  participated: boolean;
  totalSeconds: number;
  totalMinutes: number;
  tapEvents: number[];
}

export interface Drive {
  id: string;
  familyId: string;
  startedAt: number;
  endedAt: number;
  participants: DriveParticipant[];
  biggestShare: number;
  tier: Tier;
  islandUnlockedId?: string;
  coastalFindId?: string;
  createdByUserId: string;
}

export interface Island {
  id: string;
  name: string;
  customName?: string;
  illustrationKey: string;
  description: string;
  creatureName: string;
  unlockedAt?: number;
  unlockedFromDriveId?: string;
}

export interface CoastalFind {
  id: string;
  name: string;
  illustrationKey: string;
  foundAt?: number;
}

export interface Settings {
  fairWindsThreshold: number;
  harborThreshold: number;
  audioEnabled: boolean;
  fogEnabled: boolean;
  minimumDriveMinutes: number;
  telemetryEnabled: boolean;        // [NEW v3] default true
}

// --- Sync queue ---

export type QueuedWriteKind =
  | 'insert_drive'
  | 'update_pirate'
  | 'update_settings'
  | 'unlock_island'
  | 'find_coastal'
  | 'rename_island';

export interface QueuedWrite {
  id: string;                  // local UUID
  kind: QueuedWriteKind;
  payload: unknown;            // shape depends on kind
  createdAt: number;
  attempts: number;
  lastError?: string;
}

// --- Stores ---

export interface AuthStore {
  user: AuthUser | null;
  family: Family | null;
  members: FamilyMember[];
  role: Role | null;            // null until loaded
  pendingInvite: FamilyInvite | null;  // if user lands via invite link
  isLoading: boolean;

  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshFamily: () => Promise<void>;
}

export interface DrivesStore {
  drives: Drive[];
  islands: Island[];
  coastalFinds: CoastalFind[];
  currentDrive: Drive | null;
  activePirateId: string | null;

  startDrive: (participatingPirateIds: string[]) => void;
  recordTap: (pirateId: string) => void;
  tickActivePirate: () => void;
  endDrive: () => Promise<Drive | null>;
  cancelDrive: () => void;

  pullFromServer: () => Promise<void>;       // [NEW v3]

  unlockedIslandIds: string[];
  totalDrivesLogged: number;
}

export interface SyncStore {
  queue: QueuedWrite[];
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt?: number;
  enqueue: (kind: QueuedWriteKind, payload: unknown) => void;
  flush: () => Promise<void>;
  clear: () => void;            // used on sign-out
}
```

---

## 5. Database Schema (Supabase / Postgres) **[NEW v3]**

The schema lives in `supabase/migrations/0001_init.sql`. It's intentionally minimal — no audit columns, no soft-delete columns, no extras.

```sql
-- supabase/migrations/0001_init.sql

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

-- Cap of 5 enforced via trigger (see 0003)
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
  family_id_hash  text not null,        -- one-way hashed; cannot be reversed
  event_name      text not null check (event_name in (
                    'app_opened', 'drive_started', 'drive_ended',
                    'island_unlocked', 'coastal_found',
                    'invite_sent', 'invite_accepted', 'member_left'
                  )),
  occurred_at     timestamptz not null default now()
);

create index event_name_time_idx on event(event_name, occurred_at desc);
```

### 5a. RLS Policies **[NEW v3]**

```sql
-- supabase/migrations/0002_rls_policies.sql

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
```

### 5b. RPC Functions **[NEW v3]**

These wrap multi-row operations and enforce business rules that RLS alone can't.

```sql
-- supabase/migrations/0003_rpc_functions.sql

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

  -- Cascade does the rest
  delete from family where id = fid;
end;
$$;

-- Telemetry: insert one event with hashed family_id, no payload, no PII
create or replace function record_event(
  family_id_hash text,
  event_name text
) returns void language plpgsql security definer as $$
begin
  -- Validate against the CHECK constraint via insert
  insert into event(family_id_hash, event_name) values (family_id_hash, event_name);
end;
$$;
```

**Why RPC for telemetry:** the client computes the hash locally (using `VITE_TELEMETRY_HASH_SALT`) and passes only the hash. There's no SELECT policy on `event`, so the client can't read events back even though it can write them. The hash is one-way; the developer queries aggregate counts via Supabase Studio without ever seeing identifiable family IDs.

---

## 6. Client API Layer **[NEW v3]**

Thin wrappers around `@supabase/supabase-js`. Each function returns a typed result and translates Supabase errors into a small set of app-level error codes (`UNAUTHENTICATED`, `NETWORK`, `CONFLICT`, `NOT_FOUND`, `FORBIDDEN`, `UNKNOWN`).

```typescript
// src/api/client.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/db';

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
```

```typescript
// src/api/auth.ts
import { supabase } from './client';

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export function onAuthChange(cb: (user: User | null) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    cb(session?.user ?? null);
  });
}
```

```typescript
// src/api/families.ts
export async function createFamily(name: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_family', { family_name: name });
  if (error) throw mapError(error);
  return data;
}

export async function getMyFamily(): Promise<Family | null> {
  // family_member RLS lets us see only our own row; join to family
  const { data, error } = await supabase
    .from('family_member')
    .select('family:family_id(*), role')
    .eq('user_id', (await supabase.auth.getUser()).data.user!.id)
    .maybeSingle();
  if (error) throw mapError(error);
  return data?.family ?? null;
}
```

(Other modules — `members.ts`, `invites.ts`, `pirates.ts`, `drives.ts`, `islands.ts`, `settings.ts`, `telemetry.ts`, `deletion.ts` — follow the same pattern.)

```typescript
// src/api/telemetry.ts
import { supabase } from './client';
import { hashFamilyId } from '../lib/hash';

export async function recordEvent(familyId: string, eventName: string) {
  const settings = useSettingsStore.getState().settings;
  if (!settings.telemetryEnabled) return; // opt-out respected client-side
  const hash = await hashFamilyId(familyId);
  // Fire-and-forget. Failures are silent.
  supabase.rpc('record_event', { family_id_hash: hash, event_name: eventName })
    .then(() => {}, () => {});
}
```

---

## 7. Sync Layer **[NEW v3]**

The sync layer has two halves: **pull** (fetch latest server state into local cache, on app open / focus) and **push** (flush queued local writes to the server).

### 7.1 Pull

```typescript
// src/sync/pull.ts

export async function pullFamilyState(familyId: string): Promise<void> {
  // Fetch in parallel
  const [pirates, drives, islands, finds, settings] = await Promise.all([
    listPirates(familyId),
    listDrives(familyId),
    listUnlocked(familyId),
    listCoastalFinds(familyId),
    getSettings(familyId),
  ]);

  // Reconcile with local cache:
  //  - drives is append-only on server; if a queued local drive isn't on server yet,
  //    keep it in the queue
  //  - pirates and settings: take whichever has newer updated_at
  //  - islands/finds: union (both sides are append-only)

  reconcile({ pirates, drives, islands, finds, settings });
}
```

**When pull runs:**
- App open (after auth resolved)
- Window regains focus (`useSyncOnFocus`)
- Manual pull-to-refresh on home / treasure map / drive history
- After sign-in
- After accepting an invite

### 7.2 Push (the queue + worker)

```typescript
// src/sync/queue.ts
import { get, set, del } from 'idb-keyval';

const QUEUE_KEY = 'pirate-ship-sync-queue-v1';

export async function readQueue(): Promise<QueuedWrite[]> {
  return (await get(QUEUE_KEY)) ?? [];
}

export async function writeQueue(q: QueuedWrite[]): Promise<void> {
  await set(QUEUE_KEY, q);
}

export async function enqueue(kind: QueuedWriteKind, payload: unknown) {
  const q = await readQueue();
  q.push({ id: crypto.randomUUID(), kind, payload, createdAt: Date.now(), attempts: 0 });
  await writeQueue(q);
}

export async function clearQueue() {
  await del(QUEUE_KEY);
}
```

```typescript
// src/sync/worker.ts

const BACKOFF = [0, 2_000, 5_000, 15_000, 60_000, 300_000];

export async function flushQueue(): Promise<void> {
  if (!navigator.onLine) return;
  if (useSyncStore.getState().isSyncing) return;
  useSyncStore.getState().setSyncing(true);

  try {
    let q = await readQueue();
    let i = 0;
    while (i < q.length) {
      const item = q[i];
      try {
        await dispatch(item);
        q.splice(i, 1);                  // success
      } catch (err) {
        item.attempts += 1;
        item.lastError = String(err);
        if (isPermanentFailure(err)) {
          q.splice(i, 1);                // drop bad write (e.g. RLS rejected)
          // TODO: surface to user via "sync error" notice
        } else {
          // Stop on first transient failure to preserve order
          break;
        }
      }
    }
    await writeQueue(q);
  } finally {
    useSyncStore.getState().setSyncing(false);
  }
}

async function dispatch(w: QueuedWrite) {
  switch (w.kind) {
    case 'insert_drive':     return drivesApi.insertDrive(w.payload as Drive);
    case 'update_pirate':    return piratesApi.updatePirate(w.payload as PirateUpdate);
    case 'update_settings':  return settingsApi.updateSettings(w.payload as Partial<Settings>);
    case 'unlock_island':    return islandsApi.recordUnlock(w.payload as UnlockPayload);
    case 'find_coastal':     return islandsApi.recordCoastalFind(w.payload as FindPayload);
    case 'rename_island':    return islandsApi.renameIsland(w.payload as RenamePayload);
  }
}

function isPermanentFailure(err: unknown): boolean {
  // RLS rejection, schema violation, etc. — retrying won't help.
  // Network errors / 5xx are transient.
  // (Detail: introspect error.code from supabase-js.)
  return /* ... */ false;
}
```

**Flush triggers:** drive end, settings change, app open (after pull), `online` event, every 60s while app is open and online (heartbeat).

**Backoff:** the worker stops on the first transient failure and the next flush retries — Supabase calls aren't retried inside a single flush. The retry happens on the next trigger, with the queue still intact.

**The "queued drives indicator" from the product spec:** when `queue.length >= 3`, show a banner in parent settings: "X drives haven't synced. [Retry now]". Tap → `flushQueue()`.

### 7.3 Conflict resolution

Most cases are trivial because of the schema:

- **Drives**: insert-only on server, every drive has a unique client-generated UUID. No conflict. The unique-constraint on `drive(id)` makes inserts idempotent — if a retry happens after a successful insert, the second attempt fails with a unique-violation, which the worker treats as already-applied.
- **Islands and coastal finds**: append-only with `(family_id, island_id)` primary key. Same idempotency rule.
- **Pirate names** and **settings**: last-write-wins. The client compares `updated_at` from server vs. local during pull; whichever is newer wins. On push, the server's `updated_at` is set to `now()` by the API call, so push always wins until the next pull.

There is no need for a CRDT, a merge resolver, or a 3-way diff. Document this explicitly so a future contributor doesn't try to build one.

---

## 8. Auth Flow & Routing **[NEW v3]**

**Route guards:**

```
/ (sign-in)              → public
/auth/callback           → public; handles OAuth redirect, then routes by state
/invite/:inviteId        → public; if signed-in & email matches → accept screen, else sign-in
/onboarding/family       → requires auth, no family yet
/onboarding/pirates      → requires auth, family exists, pirates have default names
/home                    → requires auth + family
/drive/*                 → requires auth + family
/map                     → requires auth + family
/settings/*              → requires auth + family (math-gated for kid)
```

**Decision tree on `/auth/callback`:**

```
After OAuth redirect, read session:
  user has a family_member row?
    YES → /home
  user has a pending invite for their email?
    YES → /invite/:id  (accept screen)
  else → /onboarding/family  (create family)
```

**Sign-out flow:** clear Supabase session, clear authStore, **clear sync queue** (any unsynced drives are lost — warn the user first), reload to `/`.

**Protected math gate stays in front of parent settings.** On top of that, the **Account → Sign out** button is disabled when `currentDrive !== null`. **Account → Delete account** has a typed-confirmation gate ("type DELETE") in addition to the math gate.

---

## 9. Core Algorithms

### 9.1 Balance calculation

Unchanged from v2. See `lib/balance.ts` and the table-driven test in §13.

### 9.2 Drive timer

Unchanged from v2. `activePirateId` defaults to `null`; the 1Hz tick is a no-op when null. Drive end now also enqueues a sync write — see below.

### 9.3 Drive end (with sync)

```typescript
// drivesStore.endDrive() — v3 version

endDrive: async () => {
  const state = get();
  if (!state.currentDrive) return null;

  // Edge: no taps → discard
  const anyTaps = state.currentDrive.participants.some(p => p.tapEvents.length > 0);
  if (!anyTaps) {
    set({ currentDrive: null, activePirateId: null });
    return null;
  }

  // Compute balance
  const balance = calculateBalance(
    state.currentDrive.participants,
    settings.fairWindsThreshold,
    settings.harborThreshold,
    settings.minimumDriveMinutes
  );

  // Pick island/find if applicable
  const islandToUnlock = balance.tier === 'fair_winds'
    ? pickIslandToUnlock(state.islands, state.unlockedIslandIds)
    : null;
  const coastalFind = balance.tier === 'coastal'
    ? pickCoastalFind(state.coastalFinds, /* ... */)
    : null;

  const finishedDrive: Drive = {
    ...state.currentDrive,
    endedAt: Date.now(),
    biggestShare: balance.biggestShare,
    tier: balance.tier,
    islandUnlockedId: islandToUnlock?.id,
    coastalFindId: coastalFind?.id,
    createdByUserId: useAuthStore.getState().user!.id,
  };

  // Optimistic local write — drive is visible immediately
  set({
    drives: [...state.drives, finishedDrive],
    islands: islandToUnlock
      ? state.islands.map(i => i.id === islandToUnlock.id
          ? { ...i, unlockedAt: finishedDrive.endedAt, unlockedFromDriveId: finishedDrive.id }
          : i)
      : state.islands,
    coastalFinds: coastalFind
      ? state.coastalFinds.map(c => c.id === coastalFind.id
          ? { ...c, foundAt: finishedDrive.endedAt }
          : c)
      : state.coastalFinds,
    currentDrive: null,
    activePirateId: null,
  });

  // Enqueue server writes (drive + unlocks)
  await useSyncStore.getState().enqueue('insert_drive', finishedDrive);
  if (islandToUnlock) {
    await useSyncStore.getState().enqueue('unlock_island', {
      familyId: useAuthStore.getState().family!.id,
      islandId: islandToUnlock.id,
      driveId: finishedDrive.id,
    });
  }
  if (coastalFind) {
    await useSyncStore.getState().enqueue('find_coastal', {
      familyId: useAuthStore.getState().family!.id,
      findId: coastalFind.id,
      driveId: finishedDrive.id,
    });
  }

  // Telemetry (fire-and-forget)
  recordEvent(useAuthStore.getState().family!.id, 'drive_ended');
  if (islandToUnlock)
    recordEvent(useAuthStore.getState().family!.id, 'island_unlocked');
  if (coastalFind)
    recordEvent(useAuthStore.getState().family!.id, 'coastal_found');

  // Try to flush immediately; if offline, the queue worker will handle it later
  useSyncStore.getState().flush();

  return finishedDrive;
}
```

### 9.4 Family ID hashing for telemetry

```typescript
// src/lib/hash.ts

const SALT = import.meta.env.VITE_TELEMETRY_HASH_SALT;

export async function hashFamilyId(familyId: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${SALT}:${familyId}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
```

The salt is a server-known secret — but since this app is client-only, it's a *client* env var. That weakens the hash slightly (anyone with the client bundle can compute the hash for any family ID they know). The protection here is "the developer can't easily de-anonymize their own analytics by querying for a known family's hash" — not "rigorous cryptographic anonymity." Document this honestly.

---

## 10. Persistence (Local) **[CHANGED v3]**

LocalStorage is now a **cache**, not source of truth. Zustand persist still writes to it, with these adjustments:

**Cache invalidation on sign-out:** the `signOut()` flow clears all stores, clears the sync queue (with a "you have unsynced drives — sign out anyway?" warning if non-empty), and removes localStorage keys.

**Cache invalidation on first sign-in:** if any v1/v2 localStorage keys exist (`pirate-ship-pirates-v1`, etc.) AND the user has just authenticated for the first time, show a one-time warning: *"קצת היסטוריה ישנה נמצאה במכשיר הזה. כניסה לחשבון תמחק אותה — להמשיך?"* If the user confirms, wipe local keys and proceed; the server's family state is the new truth.

**Versioning:** the v2 keys (`pirate-ship-pirates-v1`, `pirate-ship-drives-v1`, `pirate-ship-settings-v1`) are migrated to new v3 names (`pirate-ship-cache-v3`) to make the wipe simple. The sync queue lives in IndexedDB under a separate name (`pirate-ship-sync-queue-v1`) since it has different durability needs.

---

## 11. Hebrew & RTL Implementation **[EXPANDED v3]**

New string sections needed for v3 — added to `src/strings/he.ts`:

```typescript
// new sections in he.ts (existing v2 sections unchanged)
auth: {
  signInWithGoogle: 'כניסה עם Google',
  whatDoesThisMean: 'מה זה אומר?',
  signingIn: 'מתחבר...',
  signOutConfirm: 'להתנתק?',
  signOut: 'התנתקות',
  signOutBlockedDuringDrive: 'אי אפשר להתנתק באמצע הפלגה',
},
familyOnboarding: {
  whatsYourFamilyCalled: 'איך קוראים למשפחה שלכם?',
  defaultFamilyNameSuffix: ' המשפחה',  // e.g. "הכהן המשפחה"
  next: 'הלאה',
},
invite: {
  joinTitle: 'להצטרף למשפחת {name}?',
  joinPrimary: 'הצטרפות',
  joinSecondary: 'לא עכשיו',
  expiredTitle: 'ההזמנה פגה',
  wrongEmailTitle: 'ההזמנה שלא לחשבון הזה',
  alreadyInFamilyTitle: 'אתם כבר במשפחה',
  inviteSentBanner: 'ההזמנה נשלחה ל-{email}',
  invalidEmail: 'כתובת לא תקינה',
  emailLabel: 'כתובת אימייל של הפרטנר/ית',
  send: 'שליחת הזמנה',
},
account: {
  title: 'חשבון',
  signedInAs: 'מחובר/ת כ-',
},
family: {
  title: 'המשפחה',
  members: 'חברי המשפחה',
  invitePartner: 'הזמנת פרטנר/ית',
  pendingInvites: 'הזמנות בהמתנה',
  removeMember: 'הסרה מהמשפחה',
  transferOwnership: 'העברת בעלות',
  leaveFamily: 'עזיבת המשפחה',
  leaveFamilyConfirm: 'באמת לעזוב את המשפחה?',
  deleteFamily: 'מחיקת המשפחה',
  deleteFamilyTypedConfirm: 'הקלידו DELETE כדי לאשר',
  ownerCannotLeave: 'בעלים לא יכולים לעזוב — קודם להעביר בעלות או למחוק את המשפחה',
  familyDeleted: 'המשפחה נמחקה',
},
telemetry: {
  title: 'טלמטריה',
  toggleLabel: 'שליחת ספירות אנונימיות לעזרה בשיפור האפליקציה',
  explainer: 'אנחנו סופרים אירועים כלליים בלבד — בלי שמות, בלי תאריכי הפלגות, בלי שום מידע אישי. אפשר לכבות בכל רגע.',
},
data: {
  title: 'הנתונים שלכם',
  exportButton: 'הורדת כל הנתונים (JSON)',
  deleteAccount: 'מחיקת חשבון וכל הנתונים',
  deleteAccountWarning: 'פעולה זו תמחק לצמיתות את כל ההפלגות, האיים והפרטים של המשפחה. אין דרך חזרה.',
},
sync: {
  offlineBanner: 'אופליין — ההפלגה תישמר כשתהיה רשת',
  queuedDrives: '{n} הפלגות מחכות לסנכרון',
  retryNow: 'ניסיון מחדש',
},
firstSignInWipeWarning: {
  title: 'מצאנו נתונים מקומיים',
  body: 'יש על המכשיר הזה היסטוריה ישנה ללא חשבון. כניסה לחשבון תמחק אותה. להמשיך?',
  continue: 'להמשיך — מחק נתונים מקומיים',
  cancel: 'ביטול',
},
```

**Custom invite email template** (configured in Supabase Dashboard → Auth → Email Templates → Invite User):

```
Subject: הוזמנת להצטרף למשפחת {{ .FamilyName }} בספינת השודדים

שלום!
{{ .InviterName }} הזמינו אותך להצטרף למשפחה ב"ספינת השודדים המשפחתית" — אפליקציה שעוקבת אחרי זמן מוזיקה משפחתי בנסיעות.

לחצו כאן כדי להצטרף:
{{ .InviteLink }}

הקישור תקף ל-7 ימים.
```

(The dashboard supports `{{ .Variables }}` from the invite payload. The variables for `FamilyName` and `InviterName` need to be passed when creating the invite — for the cleanest path, store those in the invite row itself and have an Edge Function compose the email if Supabase's built-in template doesn't support enough variables. Defer that complexity until v3.1 if it turns out the built-in template isn't enough.)

---

## 12. PWA Configuration

Unchanged from v2 except: workbox `runtimeCaching` should explicitly **not** cache Supabase API responses (those need to hit the network). Add:

```typescript
workbox: {
  globPatterns: ['**/*.{js,css,html,svg,png,mp3}'],
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
      handler: 'NetworkOnly',  // never cache API calls
    },
  ],
},
```

Service worker is fine to cache the app shell aggressively. The app's offline behavior is handled by our own cache + queue, not by service-worker-cached API responses.

---

## 13. Testing Strategy **[EXPANDED v3]**

**Required tests** (Vitest):

1. **`lib/balance.ts`** — full table-driven tests, unchanged from v2.

2. **`store/drivesStore.ts` — v2 active-pirate semantics + v3 enqueue-on-end** **[v3]**:
   - All v2 cases still pass.
   - **New:** `endDrive()` enqueues an `insert_drive` write into the syncStore queue.
   - **New:** `endDrive()` enqueues `unlock_island` when the tier is `fair_winds`.
   - **New:** `endDrive()` does NOT enqueue when zero taps occurred.

3. **`components/ShipPreview.tsx` — RTL alignment regression** **[v2 carry-over]**.

4. **`sync/worker.ts` — flush behavior** **[NEW v3]**:
   - Flush is a no-op when offline.
   - On transient failure, the failing item stays in the queue, attempts increments, subsequent items are NOT attempted in the same flush.
   - On permanent failure (RLS rejection), the failing item is dropped from the queue.
   - Idempotency: re-enqueueing an already-applied drive results in a unique-violation that's treated as success.

5. **`sync/conflicts.ts` — last-write-wins for pirates/settings** **[NEW v3]**:
   - When server `updated_at > local updated_at`, server wins on pull.
   - When local `updated_at > server updated_at`, local stays in queue and pushes on next flush.

6. **`api/auth.ts` and the post-OAuth routing decision tree** **[NEW v3]** — unit-test the decision logic with mocked auth state (has-family / pending-invite / new-user).

7. **End-to-end smoke test** **[NEW v3]** (Playwright, optional but recommended):
   - Sign in (via Supabase test user), create family, name pirates, complete a drive, verify it appears in drive history after a refresh.

**Database tests** (the SQL itself):
- For each RLS policy, write a test in `supabase/tests/` that creates two users in different families and asserts user A cannot read user B's data. Run with `pgtap` or via plain integration tests against a local Supabase instance.

**Manual testing checklist** (in addition to the above):
- Two devices, two Google accounts, one family: sign in on both, create a drive on device A, refresh device B, confirm drive appears.
- Airplane mode mid-drive: confirm reveal still plays, queue grows; turn off airplane mode, confirm queue drains.
- Owner deletes family while member is offline: member reconnects, sees "this family has been deleted" and lands back on sign-in.
- Sign out with non-empty queue: confirm warning appears, confirm cancel/proceed both behave correctly.

---

## 14. Edge Cases & Failure Modes **[UPDATED v3]**

| Scenario | Behavior |
|---|---|
| App closed mid-drive | Auto-save current drive state every 10s to IndexedDB. On reopen, prompt to continue. **[unchanged v2; no server involvement]** |
| Drive ended with 0 taps | Discard, show toast. **[unchanged v2]** |
| All 30 islands unlocked, drive is Fair Winds | Celebratory message, drive logged as Fair Winds, no new island. **[unchanged v2]** |
| **Offline at drive end [v3]** | Reveal plays from local data, drive enqueued, sync on reconnect. |
| **Sync fails repeatedly [v3]** | Queue persists in IndexedDB; backoff retries; banner appears in settings if queue ≥ 3. |
| **Sign-in on device with v1/v2 data [v3]** | Show one-time wipe warning, require explicit confirmation. |
| **Sign out with non-empty queue [v3]** | Warn user, offer "wait for sync then sign out" or "sign out and discard". |
| **Sign out blocked during drive [v3]** | Sign-out button disabled in settings while `currentDrive !== null`. |
| **Owner deletes family while member offline [v3]** | Member's local cache works until they reconnect; on reconnect, RLS rejects all reads, app shows "this family has been deleted" and routes to sign-in. |
| **Both members start drives simultaneously [v3]** | Both end up in history as separate drives; no merge attempted. |
| **Invite expires before acceptance [v3]** | Accept screen shows "invite expired", offers to ask the inviter to resend. |
| **Invitee already in another family [v3]** | RPC rejects with friendly error: "you already belong to a family". |
| **5-member cap reached [v3]** | Invite-creation succeeds but `accept_invite` rejects with "family full". (We allow the invite to be created so the inviter knows; better to fail fast on creation — TBD; pick one and document.) |
| **localStorage full [v3]** | Falls back to in-memory; sync queue still works (it's in IndexedDB, separate from localStorage). |
| **IndexedDB unavailable [v3]** | Sync queue lives in memory only; warn the user that drives done while offline may be lost if the app is closed. |
| **OAuth redirect mismatch [v3]** | Redirect URI must be configured in both Supabase and Google Cloud OAuth consent screen. Document the exact URLs needed. |

---

## 15. What NOT to Build for V1 **[UPDATED v3]**

Don't get pulled into:
- Email/password auth, magic links, social providers other than Google
- Real-time sync between members' phones (Supabase Realtime stays off)
- Multi-family support per user (schema enforces one family per user)
- More than 5 members per family (DB trigger enforces this)
- A stats / trends / streaks dashboard (raw drive history only for v1)
- Third-party analytics (PostHog, Sentry, GA, Amplitude — none of these)
- Soft-delete or data retention windows beyond DB backups
- Server-side rendering or Next.js (this is a client-only SPA; Vite is fine)
- An API layer of your own (talk directly to Supabase via supabase-js + RPCs)
- Tablet landscape, dark mode, avatar customization (carried from v2)
- Mixed cargo primitives, custom font loading, prototype chrome (carried from v2)

---

## 16. Recommended Build Order **[UPDATED v3]**

1. **Phase 0 — Project setup** (~1h). Vite, Tailwind, Supabase project, env vars, RTL, system font stack, empty stubs. Apply migrations to a dev Supabase project. Confirm RLS by hitting the API as two different test users.
2. **Phase 1 — Balance + drive logic** (~2h). `lib/balance.ts` with full tests. `drivesStore` with the v2 active-pirate state machine and tests.
3. **Phase 2 — Auth + family creation** (~3h). Sign-in screen, OAuth callback, `create_family` RPC, family naming step, the 3-pirate onboarding from v2. **Pause and verify**: a fresh user can sign in, create a family, name pirates, land on home — all data visible in Supabase Studio.
4. **Phase 3 — Sync foundation** (~3h). `syncStore`, IndexedDB queue, pull on app open, push on drive end. Wire up `endDrive()` to enqueue. **Pause and verify**: complete a drive offline, reconnect, watch the queue drain.
5. **Phase 4 — Core flow with placeholder visuals** (~3h). RollCall, DuringDrive, Reveal, TreasureMap screens with v2 behaviors but ugly visuals. **Pause and verify**: full happy path works end-to-end with a real Supabase backend.
6. **Phase 5 — Invites + family management** (~3h). Invite flow, accept screen, family settings section (members list, transfer ownership, leave, delete). **Pause and verify**: two Google accounts can join one family, both see the same data after pull.
7. **Phase 6 — Visuals & animations** (~6h). Designer-spec polish: pirate boxes at 150px, cargo crates tinted by flag, Spyglass animations, reveal cinematic.
8. **Phase 7 — Telemetry, polish, edge cases** (~3h). Hashed-id event recording, telemetry toggle, offline indicator, sync retry banner, account deletion flow, data export.
9. **Phase 8 — Audio, PWA install, real-device testing** (~2h). Carried from v2.

**Total: ~26h.** v2's plan was ~10h; the backend roughly doubles the build, which is consistent with the scope change.

---

## 17. Change log — v2 → v3

The v2 dev spec described a local-only PWA. V3 adds the backend, account model, and sync layer. Mechanics are unchanged.

**New tech-stack additions:**
- Supabase (Postgres + Auth + RLS) — only backend dependency.
- `@supabase/supabase-js` for the client.
- `idb-keyval` for the IndexedDB-backed sync queue (a tiny dep).
- Three new env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_TELEMETRY_HASH_SALT`.

**New project structure:**
- `supabase/migrations/` directory with three SQL migrations (init, RLS, RPCs).
- `src/api/` thin wrappers around supabase-js.
- `src/sync/` queue + worker + pull + conflict resolution.
- New stores: `authStore`, `syncStore`.
- New screens: `SignInScreen`, `AuthCallbackScreen`, `AcceptInviteScreen`, `FamilyNamingScreen`, plus four new sections under `screens/settings/`.
- New components: `OfflineIndicator`, `GoogleSignInButton`, `FamilyMemberRow`, `TypedConfirm`.
- New hooks: `useAuth`, `useFamily`, `useOnlineStatus`, `useSyncOnFocus`.
- New lib: `lib/hash.ts` for one-way family-ID hashing.

**Schema (Postgres):**
- 9 tables (`family`, `family_member`, `family_invite`, `pirate`, `drive`, `drive_participant`, `island_unlocked`, `coastal_find_found`, `family_settings`) plus `event` for telemetry.
- RLS policies on every table; `is_family_member()` and `is_family_owner()` helper functions.
- 5 RPCs: `create_family`, `accept_invite`, `transfer_ownership`, `delete_family`, `record_event`.
- Trigger enforcing 5-member family cap.
- Unique constraint enforcing one-family-per-user.

**Behavior changes:**
- `drivesStore.endDrive()` now also enqueues an `insert_drive` write to the sync queue, and (when applicable) `unlock_island` / `find_coastal` writes. Reveal plays from local data; sync is in the background.
- LocalStorage downgraded from source-of-truth to cache. Cache wiped on sign-in if v1/v2 data exists. Cache wiped on sign-out.
- Sign-out is blocked when `currentDrive !== null`.
- Existing v1/v2 localStorage keys (`pirate-ship-pirates-v1`, etc.) are migrated to a single new key (`pirate-ship-cache-v3`) and any old data is wiped on first sign-in.

**Sync model:**
- Pull on app open, on focus regain, after sign-in, on pull-to-refresh.
- Push on drive end, settings change, online event, every 60s heartbeat while online.
- Queue persists in IndexedDB across app reloads.
- Conflict policy: drives are insert-only with idempotent UUIDs; pirates/settings are last-write-wins by `updated_at`; islands/finds are append-only.
- No real-time subscriptions (deliberate; documented).

**Telemetry:**
- Single `event` table with no SELECT policy.
- Client computes SHA-256 hash of `${SALT}:${familyId}` and inserts via `record_event` RPC.
- Allowed event names enforced by CHECK constraint.
- Opt-out toggle in settings, default ON, respected client-side before any event is sent.

**Hebrew copy:**
- New sections added to `he.ts`: auth, familyOnboarding, invite, account, family, telemetry, data, sync, firstSignInWipeWarning. ~25 new strings total. Copy needs a final native pass.

**Tests added:**
- `drivesStore` v3 enqueue-on-end behavior.
- `sync/worker.ts` flush semantics (offline, transient failure, permanent failure, idempotency).
- `sync/conflicts.ts` last-write-wins.
- `api/auth.ts` post-OAuth routing decision tree.
- SQL/RLS tests against a local Supabase instance.

**Build estimate:** ~26h, up from v2's ~10h. The backend is roughly half the work of the app.

---

## 18. Definition of Done (V1)

The app is V1-complete when:

- [ ] All v2 DoD items still pass (balance math, no auto-glow, single crate primitive, RTL alignment, offline reveal, etc.)
- [ ] **Sign in with Google works on first launch and on a fresh device** **[v3]**
- [ ] **A new user creates a family and lands on the existing 3-pirate onboarding** **[v3]**
- [ ] **An invited user (matching email) can accept the invite and join an existing family** **[v3]**
- [ ] **Two Google accounts in one family see the same drives after sign-in / refresh** **[v3]**
- [ ] **A drive completed offline syncs to the server when the device reconnects** **[v3]**
- [ ] **Sign-out is blocked during a drive** **[v3]**
- [ ] **The owner can transfer ownership and leave; the previous owner becomes a member** **[v3]**
- [ ] **Account deletion (typed-confirmation) hard-deletes the family and all rows** **[v3]**
- [ ] **JSON export contains pirates, drives, islands, finds, settings — all family data** **[v3]**
- [ ] **Telemetry toggle works: when OFF, no events are written; when ON, events are written with hashed family ID only** **[v3]**
- [ ] **RLS prevents user A from reading user B's family's data, verified by manual two-account test** **[v3]**
- [ ] **5-member family cap is enforced; 6th invite acceptance is rejected** **[v3]**
- [ ] **Existing v1/v2 localStorage data is wiped on first sign-in with explicit warning** **[v3]**
- [ ] App installs on iOS and Android via "Add to Home Screen"
- [ ] App functions fully during a drive even with no network
- [ ] No console errors during a normal happy-path session
- [ ] Manual test: complete 5 different drives across two devices, verify all sync correctly
