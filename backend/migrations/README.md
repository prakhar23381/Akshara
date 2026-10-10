# Migrations

Applied in filename order, by hand, in the Supabase SQL editor. There is no
migration runner — this file is the record of what has been applied, so keep it
honest.

| File | Applies | Status |
|---|---|---|
| `000_init.sql` | `user_profiles`, `learning_sessions`, `letter_progress`; RLS policies on all three | **applied** |
| `001_session_model.sql` | 9 columns on `learning_sessions` (`session_id`, `status`, `started_at`, `ended_at`, `duration_ms`, `activities`, `metrics`, `level_config`, `schema_version`), two indexes, and a backfill of `started_at` on legacy rows | **applied** — verified 2026-10-07 |
| `002_accounts.sql` | Adults own children: `children`, `child_guardians`, `classes`, `class_members`, `class_join_codes`, `child_share_codes`; `role` and `pin_hash` on `user_profiles`; `recorded_by` on `learning_sessions`; foreign keys re-pointed at `children`; guardian policies; seven operations (`create_child`, `create_class`, `join_class`, …); a temporary trigger for the deployed client | **NOT applied.** Tested against real Postgres (56 checks, `tests/test_002.cjs`) |

Companions: `002_verify.sql` (read-only checks with expected results, run after
applying) and `002_rollback.sql` (undoes 002; refuses once the new client has
recorded sessions for a child it created, rather than delete them).

## 002 — what to know before running it

**It changes live data's foreign keys and policies, but rewrites no row.** Every
existing account becomes a parent of one child whose id *is* the account's id,
so `learning_sessions.user_id` and `letter_progress.user_id` already name the
right child. The foreign key on those columns moves from `user_profiles` to
`children`.

**The deployed client keeps working after it runs.** Its writes
(`user_id = auth.uid()`) pass both the old `auth.uid() = user_id` policies, which
002 keeps, and the new guardian ones. A sign-up on the old client after 002 gets
its 1:1 child from the temporary `trg_legacy_profile_child` trigger.

**Order:** run 002 → run `002_verify.sql` → test the W5 preview → merge. The new
client depends on 002; 002 does not depend on the new client.

**003 (not written yet)** will drop the trigger and the old `users_own_*`
policies once no deployed client predates 002.

### Testing it locally

```bash
mkdir -p /tmp/pglite && (cd /tmp/pglite && npm i --ignore-scripts @electric-sql/pglite@0.5.8)
node backend/migrations/tests/test_002.cjs /tmp/pglite backend/migrations
# RESULT 56 passed, 0 failed
```

PGlite is real Postgres compiled to WebAssembly, so PL/pgSQL, triggers, roles and
row-level security all behave as they do on Supabase. It is deliberately not a
project dependency.

## Why 001 matters

`session_id` is what gives a session an identity. The client mints one at session
start and is the single writer of session rows (`src/app/lib/sessionStore.ts`);
without the column, the Supabase mirror had nowhere to put it, so sessions lived
in `localStorage` only. With 001 applied, the mirror can store the full session
model and the parent report has a server-side copy to fall back on.

## Verifying applied state

Columns can be checked with the anon key alone, because PostgREST rejects an
unknown column with `42703` *before* RLS is evaluated — so a `200` proves the
column exists even when RLS returns `[]`:

```bash
curl -s -H "apikey: $VITE_SUPABASE_KEY" \
  "$VITE_SUPABASE_URL/rest/v1/learning_sessions?select=session_id&limit=1"
# [] → the column exists.   {"code":"42703",...} → it does not.
```

Indexes and the backfill need catalog access, so check those in the SQL editor:

```sql
SELECT indexname FROM pg_indexes
 WHERE tablename = 'learning_sessions'
   AND indexname IN ('idx_sessions_session_id', 'idx_sessions_user_started');

SELECT count(*) AS rows_missing_started_at
  FROM learning_sessions WHERE started_at IS NULL;   -- expect 0
```

## Applying one

1. Supabase dashboard → SQL Editor → paste the file → Run.
2. Update the Status column above in the same commit as any code that depends on it.

`000_init.sql` was `backend/supabase_schema.sql` until 2026-10-07. It was renamed
so that the base schema and the migration that extends it sit in one ordered
place; nothing about its contents changed.
