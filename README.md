# training-app

Invite-only, mobile-first Next.js app for multi-sport child practice logging and parent review/goal tracking.

## 1. Supabase migration SQL

The migration files are:

- `supabase/migrations/20260603193334_summer_softball_schema.sql`
- `supabase/migrations/20260603193559_add_parent_auth_family_scoping.sql`
- `supabase/migrations/20260603193711_optimize_softball_rls_indexes.sql`
- `supabase/migrations/20260604103919_fix_softball_membership_rls_recursion.sql`
- `supabase/migrations/20260604152546_add_multi_sport_support.sql`
- `supabase/migrations/20260604201735_invite_only_tracker_access.sql`
- `supabase/migrations/20260604203614_replace_starter_sports_with_hockey.sql`
- `supabase/migrations/20260605111942_restrict_tracker_invitations_to_admin.sql`

The migrations create the original practice schema, add Supabase Auth family scoping and RLS, and then add a backward-compatible multi-sport catalog, child-to-sport assignments, starter plans, and generic season badges.

training-app is designed to share the existing `summerrewardsapp` Supabase project safely. Its tables are still prefixed with `softball_` for backward compatibility, so they do not collide with the rewards app's existing `families`, `family_members`, `badges`, and other tables.

Apply it with the Supabase CLI after linking a project:

```bash
npx supabase link --project-ref your-project-ref
npx supabase db push
```

You can also review and run the SQL directly in the Supabase SQL editor.

Supabase Auth:

- Enable the Email provider in Supabase Auth, including new-user signups.
- The sign-in screen supports one-time email links and password sign-in for
  existing users. Account creation appears only from a private tracker invite
  link created on an existing parent's dashboard.
- This app shares the `summerrewardsapp` Supabase project. Keep the existing
  Summer Rewards production URL as the Auth Site URL unless you intentionally
  want training-app to be the project's default redirect.
- Add both apps' production URLs to the Auth redirect allowlist. For the
  training app, add:
  - `https://softballtracker.vercel.app/**`
  - `https://*-joe-lairds-projects.vercel.app/**`
  - `http://localhost:3000/**`
- Each app must pass its own `redirectTo`/`emailRedirectTo` URL when starting
  an auth flow. training-app does this automatically using its current
  origin.
- Keep email confirmation enabled so new password accounts must confirm their
  email before entering the tracker.
- Only existing tracker parents and invited email addresses can create a
  tracker family workspace. Other users in the shared Supabase Auth project
  cannot enter this app.
- Tracker invite links are copied and shared manually. Configure custom SMTP
  in Supabase before relying on Auth confirmation or magic-link emails for
  external users.
- Kids still do not have individual logins; they use athlete cards after a parent signs in on the shared device.

To preserve data from before the auth migration, create your parent account, create/find its `softball_families.id`, then assign old unscoped rows:

```sql
update public.softball_players
set family_id = '<your-family-id>'
where family_id is null;

insert into public.softball_app_settings (family_id, require_parent_approval)
values ('<your-family-id>', true)
on conflict (family_id) do nothing;
```

## 2. App code

Install and run:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

The softball hitting lesson is available at `/hitting`. The printable poster is
available at `/hitting-chain-poster`, with a static PDF at
`/hitting-chain-poster.pdf`.

Required env vars:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` is also supported for older Supabase projects. Do not expose a service role key in this app.

Without Supabase env vars, the app runs with a local fallback so the UI can be tried on one device.
For a Vercel deployment, add both public Supabase variables to the Vercel project and redeploy; `.env.local` only configures local development. When a parent first signs in after using local fallback, locally saved athletes and sessions are imported into the new Supabase family workspace.

## Notes

- `APP_TZ` is exported from `src/lib/config.ts` and set to `America/New_York`.
- `WEEK_START_DAY` is exported from `src/lib/config.ts` and set to Monday.
- The database stores UTC `timestamptz`; the app stores `session_date` as the New York calendar date.
- With approval on, child sessions are `pending` and do not count until approved.
- With approval off, child sessions are submitted as `approved` with `approved_by = 'auto'`.
- Offline tolerance is implemented for child practice submits: the session is saved locally immediately, then synced to Supabase when online. Broader parent edits are online-first.
- Starter sports are Softball and Hockey. A family can add private custom sports, assign sports to each athlete, and create or edit practice plans and drills.

## `// ASSUMPTION:` List

- Local fallback uses the names mentioned in the prompt only when Supabase env vars are missing; the production migration does not seed players.
- Ages are not confirmed, so kid-facing copy stays short with oversized controls for younger elementary readers.
- Rejected sessions do not interrupt the child flow; the dashboard only says they need another try.
- Deleting an athlete cascade-deletes their sessions and badge rows after a browser confirm.
