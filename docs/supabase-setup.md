# Turning on cross-device links (Supabase)

**Status: BLOCKED.** The schema, policies, API routes and client code exist, but they have never been run against a real project. Nothing in this document has been verified yet.

## What it does

1. **Sender identity.** A sender gets a minimal Supabase *anonymous* account. Recipients never sign in.
2. **Upload.** When the sender taps **Make a link**, the frozen snapshot's photos and voice note upload to the private bucket `postcard-media`, under `<user id>/<snapshot id>/…`. Storage policies only allow writes in your own folder.
3. **Publish.** `POST /api/publish` (server, service-role key):
   - verifies the sender's session token;
   - re-validates every field and limit;
   - checks that every media path is in the sender's own folder and exists;
   - stores the snapshot as an immutable row (a database trigger forbids content changes);
   - mints a 256-bit random token and stores only its SHA-256 hash.

   This step is idempotent on (sender, snapshot), so a double tap or a retry never creates a second card.
4. **Open.** `/p/<token>` hashes the token, looks up an active link, and renders the postcard with signed media URLs that expire after **1 hour**.
5. **Revoke.** `POST /api/links/revoke` marks the link revoked. New visits see "This postcard is no longer available."

**What revocation guarantees:** after revoking, nobody can load the page again. A signed media URL already handed to an open browser keeps working until it expires, which is at most one hour. Someone who already saved the photos keeps them.

## Steps

1. Create a project at supabase.com.
2. In **Authentication → Providers**, enable **Anonymous sign-ins**.
3. Apply the migration: paste `supabase/migrations/0001_init.sql` into the SQL editor, or run `supabase db push`. This creates the tables, the row-level-security policies, the immutability trigger, and the private bucket with its storage policies.
4. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Project settings → API)
   - `SUPABASE_SERVICE_ROLE_KEY` (server only; never prefix it with `NEXT_PUBLIC_`)
   - `PUBLIC_SITE_URL`, e.g. `https://your-app.vercel.app`. It's used for share links and QR codes.
5. Restart the app. **Make a link** now appears where the "Sending links isn't switched on" note was.
6. Run the real-backend tests. They don't mock publication or media endpoints:
   ```bash
   npx playwright test tests/e2e/publish.spec.ts
   ```
   These cover publishing in browser A, opening the link in a fresh context B with real images, refreshing, revoking, and checking that unauthenticated requests get 401.

## Still to verify once configured

- [ ] Publish, open in a fresh browser on another device, refresh.
- [ ] Revocation, including the 1-hour signed-URL window.
- [ ] A second sender account cannot revoke or read the first sender's card. This needs a two-account test.
- [ ] Double-submit produces a single row (`unique (owner_id, client_snapshot_id)`).
- [ ] Upload interruption and retry (uploads use `upsert`).
- [ ] Clean-up of abandoned uploads. Not implemented server-side yet; a scheduled job should delete folders with no `postcards` row after 24 hours.
- [ ] Drafts migrating into an upgraded (email) account. Anonymous accounts can be linked to an email later; that isn't built.
