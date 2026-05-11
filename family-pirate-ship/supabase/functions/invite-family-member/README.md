# invite-family-member Edge Function

Server-side invite sender. The admin SDK call to `auth.admin.inviteUserByEmail`
needs the `service_role` key, which can't ship to the browser — hence the
Edge Function.

## Secrets

Set these in the Supabase Dashboard → Project Settings → Edge Functions →
Secrets:

- `SUPABASE_SERVICE_ROLE_KEY` — Project Settings → API → `service_role` key
- `PUBLIC_APP_URL` — origin of the app, no trailing slash. Used to build
  the accept link inside the invite email, e.g. `https://family-pirate-ship.vercel.app`
  for prod or `http://localhost:5173` for local dev.

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are automatically injected by the
Edge runtime.

## Deploy

```bash
supabase functions deploy invite-family-member
```

## Request shape

```
POST /functions/v1/invite-family-member
Authorization: Bearer <user-access-token>
Content-Type: application/json

{ "email": "spouse@example.com", "familyId": "<uuid>" }
```

Returns `200 { inviteId, resent }` on success, or a `4xx`/`5xx` with
`{ error, code }`. Error codes the UI branches on:

- `ALREADY_MEMBER` — invitee is already in this family
- `IN_OTHER_FAMILY` — invitee belongs to a different family
- `FAMILY_FULL` — 5-member cap reached
- `INVITE_SELF` — owner tried to invite their own email
- `INVALID_EMAIL` / `BAD_REQUEST`
- `NOT_OWNER` — caller is not the owner of `familyId`
- `RATE_LIMITED` — Supabase auth email rate limit tripped
- `SEND_FAILED` — generic email-send failure
- `DB_ERROR` / `MISCONFIGURED` / `UNAUTHENTICATED`

## Rate limits

Free-tier Supabase caps auth emails at ~30/hour. Plenty for a family-of-two
app, but surfaces a clean `RATE_LIMITED` code if it ever trips.
