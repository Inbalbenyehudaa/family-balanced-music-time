# Supabase setup — Family Pirate Ship

One-time setup you (the human) need to do before auth code in the app can be tested. Rough effort: ~45 minutes, most of it waiting on Google's OAuth consent screen review.

You'll set up two things:
1. A **Supabase project** (hosts Postgres + Auth + RLS, EU region)
2. A **Google Cloud OAuth client** (Supabase uses this to talk to Google)

Then you'll run three SQL migration files against Supabase and set three env vars in the app.

---

## 1. Create the Supabase project

1. Go to https://supabase.com/dashboard and sign up / sign in.
2. **New project** →
   - Name: `family-pirate-ship` (or anything)
   - Database password: generate a strong one, save it in your password manager
   - **Region: `West EU (Ireland)` or `Central EU (Frankfurt)`** — dev spec requires EU
   - Pricing plan: Free tier is fine for v1
3. Wait ~2 minutes for the project to provision.

Once provisioned, grab these from **Project Settings → API**:

- **Project URL** — looks like `https://abcdefgh.supabase.co`
- **anon / public key** — the long JWT that starts with `eyJ...`

You'll put both in `.env.local` in a moment.

---

## 2. Apply the SQL migrations

Two options. **Dashboard is easier for first-time setup**; CLI is nicer once you have more migrations.

### Option A — Dashboard (one-time, easiest)

For each file in this order, in the Supabase Dashboard → **SQL Editor** → **New query** → paste → **Run**:

1. `supabase/migrations/0001_init.sql` — creates tables
2. `supabase/migrations/0002_rls_policies.sql` — enables row-level security
3. `supabase/migrations/0003_rpc_functions.sql` — creates the 5 RPC functions and the 5-member-cap trigger
4. `supabase/migrations/0004_reset_family_data.sql` — reset-family RPC used by Settings
5. `supabase/migrations/0005_drive_participant_total_seconds.sql` — adds drive_participant.total_seconds
6. `supabase/migrations/0006_invites.sql` — invite policies + RPCs (revoke, remove member, list members/invites with profile)

After each one, you should see "Success. No rows returned." If you see an error, something was applied already — safest fix is Project Settings → Database → **Reset database**, then re-run from 0001.

Verify: **Database → Tables** should now show `family`, `family_member`, `family_invite`, `pirate`, `drive`, `drive_participant`, `island_unlocked`, `coastal_find_found`, `family_settings`, `event`.

### Option B — Supabase CLI (nicer long-term)

```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>   # ref is the abcdefgh part of the URL
supabase db push                                  # applies everything in supabase/migrations/
```

---

## 3. Set up Google OAuth

This is the part with the most clicking. Budget 20 minutes.

### 3a. Create the Google Cloud OAuth client

1. Go to https://console.cloud.google.com/ and create a new project (or reuse one) named `family-pirate-ship`.
2. **APIs & Services → OAuth consent screen**:
   - User type: **External** (unless you have a Google Workspace org)
   - App name: `Family Pirate Ship`
   - User support email: your email
   - Scopes: `openid`, `profile`, `email` (the defaults are fine)
   - Test users: add the Google accounts that will sign in during development (your own, and a second one if you'll test the invite flow)
   - **Save & continue** through each step. Don't publish yet — test-user mode is enough for v1.
3. **APIs & Services → Credentials → + Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - Name: `family-pirate-ship-web`
   - **Authorized redirect URIs** — add **one for each environment you deploy to**. Critical that these match *exactly*, trailing slash and all:
     - Local dev: `https://<your-project-ref>.supabase.co/auth/v1/callback`
     - Production: same (Supabase handles the redirect — the app's own origin goes in Site URL, not here)
   - **Create**.
4. Copy the **Client ID** and **Client secret**.

### 3b. Connect Google to Supabase

1. Supabase Dashboard → **Authentication → Providers → Google**.
2. Toggle **Enable Sign in with Google** on.
3. Paste the **Client ID** and **Client secret** from step 3a.
4. Leave **Skip nonce check** off.
5. **Save**.

### 3c. Configure redirect URLs in Supabase

1. Supabase Dashboard → **Authentication → URL Configuration**.
2. **Site URL** — the origin the app runs on:
   - Local dev: `http://localhost:5173`
   - Staging/prod: whatever you deploy to (e.g. `https://family-pirate-ship.vercel.app`)
3. **Redirect URLs** — add every origin you want to allow redirects back to after OAuth. The app redirects to `/auth/callback` on its own origin, and Supabase has to whitelist each one. Add:
   - `http://localhost:5173/**`
   - `https://family-pirate-ship.vercel.app/**` (or your production domain)
4. **Save**.

---

## 3d. Deploy the invite-family-member Edge Function

The owner-side "send invite" path hits a Supabase Edge Function that uses
the `service_role` key. You can't ship the service key to the browser, so
it lives here.

```bash
supabase functions deploy invite-family-member
```

Set the secrets (Dashboard → Project Settings → Edge Functions → Secrets):

- `SUPABASE_SERVICE_ROLE_KEY` — from Project Settings → API
- `PUBLIC_APP_URL` — origin of the app, no trailing slash. e.g.
  `https://family-pirate-ship.vercel.app` for production,
  `http://localhost:5173` for local dev. This is what gets concatenated
  with `/invite/<id>` to build the accept link in the invite email.

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are auto-injected by the Edge runtime.

## 3e. Invite email allow-list

Supabase Dashboard → **Authentication → URL Configuration → Redirect URLs**
must include every origin the Edge Function might hand to
`inviteUserByEmail` as `redirectTo`. Add the `/invite/**` pattern under
each origin you use:

- `http://localhost:5173/**`
- `https://family-pirate-ship.vercel.app/**`
- any Vercel preview domain you want to test invites from

Without the allow-list entry, Supabase silently refuses to redirect the
magic-link and the spouse lands on a broken page.

## 4. Customize the invite email (optional — defer to v3.1)

Supabase sends the default invite email out of the box. The Hebrew version is in dev spec §11. You can configure it now or defer:

Dashboard → **Authentication → Email Templates → Invite User** → paste the template. The variables `{{ .FamilyName }}` and `{{ .InviterName }}` need custom handling (the built-in template doesn't expose them directly) — if you hit that limitation, an Edge Function is the clean escape hatch. See dev spec §11 for detail.

---

## 5. Set env vars in the app

Create `.env.local` at the repo root (already gitignored via `*.local`):

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_TELEMETRY_HASH_SALT=<a long random string — generate once, never rotate>
```

Generate the salt once:

```bash
node -e "console.log(crypto.randomBytes(32).toString('hex'))"
```

Put the **same** salt in production env vars. If the salt changes, historical telemetry hashes stop correlating — not catastrophic, but annoying.

For Vercel/Netlify: add the same three vars in their dashboard. Do **not** commit `.env.local`.

---

## 6. Verify the setup

Smoke test before writing more app code:

1. `npm run dev`
2. Open browser devtools → Console
3. In console, paste:
   ```js
   const { createClient } = await import('@supabase/supabase-js');
   const s = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
   const { data, error } = await s.from('family').select('*');
   console.log({ data, error });
   ```
4. Expected: `data: []`, `error: null`. (Empty array because no families exist yet; RLS still lets you query your own, you just haven't created one.)

If `error` is non-null with "Invalid API key" → env vars are wrong.
If `error` mentions `permission denied for table family` → RLS policies didn't apply; re-run `0002_rls_policies.sql`.

---

## 7. Two-account test (Phase 4 — invites)

When Phase 4 lands and you need to verify the invite flow:

1. In Google Cloud Console → OAuth consent screen → add a second Google account as a test user.
2. In a different browser profile (or incognito), sign in with account B.
3. From account A's app: invite account B by email.
4. From account B's browser: follow the invite link, sign in with B, confirm join.
5. Both accounts should now see the same family data.

---

## Troubleshooting

**"redirect_uri_mismatch" after Google sign-in.** The redirect URI in Google Cloud doesn't match what Supabase is sending. The Supabase-side URI is always `https://<project-ref>.supabase.co/auth/v1/callback` — not your app's origin. Copy it verbatim.

**"User already belongs to a family" when creating a family.** The `family_member` table has a unique constraint on `user_id`. Either you already created a family with this user, or an old row didn't clean up. In the dashboard SQL Editor: `delete from family where owner_user_id = '<your-auth-user-id>';` — the cascade cleans up the rest.

**RLS seems broken (empty reads when you expect rows).** Three common causes:
- You're querying as the `service_role` key instead of `anon` — that bypasses RLS. In app code always use the anon key.
- The `is_family_member()` helper needs `security definer` — it's set correctly in `0002`, but if you edited the function later and dropped that, RLS breaks silently.
- `auth.uid()` returns null — you're not signed in. Check the session in devtools.

**The EU region is unavailable.** Supabase lists regions by plan. If Free tier only offers `us-east-1` for your account, pick the closest EU option the account supports, or upgrade to Pro.
	