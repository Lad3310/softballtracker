# Summer Softball Practice Tracker

Mobile-first Next.js app for quick child practice logging and parent review/goal tracking.

## 1. Supabase migration SQL

The standalone migration is:

`supabase/migrations/20260603142307_summer_softball_schema.sql`

It creates the schema, seed drill templates, seed badges, explicit `anon` grants, and explicit permissive RLS policies. RLS is enabled on every public table. Because this family app intentionally has no individual logins, the frontend uses the Supabase publishable/anon key and the `anon` role can read/write the app tables. Adding auth later should be a policy change, not a table redesign.

Apply it with the Supabase CLI after linking a project:

```bash
npx supabase link --project-ref your-project-ref
npx supabase db push
```

You can also review and run the SQL directly in the Supabase SQL editor.

## 2. App code

Install and run:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

Required env vars:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` is also supported for older Supabase projects. Do not expose a service role key in this app.

Without Supabase env vars, the app runs in local demo mode so the UI can be tried on one device.

## Notes

- `APP_TZ` is exported from `src/lib/config.ts` and set to `America/New_York`.
- `WEEK_START_DAY` is exported from `src/lib/config.ts` and set to Monday.
- The database stores UTC `timestamptz`; the app stores `session_date` as the New York calendar date.
- With approval on, child sessions are `pending` and do not count until approved.
- With approval off, child sessions are submitted as `approved` with `approved_by = 'auto'`.
- Offline tolerance is implemented for child practice submits: the session is saved locally immediately, then synced to Supabase when online. Broader parent edits are online-first.

## `// ASSUMPTION:` List

- Local fallback uses the names mentioned in the prompt only when Supabase env vars are missing; the production migration does not seed players.
- Ages are not confirmed, so kid-facing copy stays short with oversized controls for younger elementary readers.
- Rejected sessions do not interrupt the child flow; the dashboard only says they need another try.
- Deleting a player cascade-deletes their sessions and badge rows after a browser confirm.
