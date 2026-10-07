# Migrations

Applied in filename order, by hand, in the Supabase SQL editor. There is no
migration runner — this file is the record of what has been applied, so keep it
honest.

| File | Applies | Status |
|---|---|---|
| `000_init.sql` | `user_profiles`, `learning_sessions`, `letter_progress`; RLS policies on all three | **applied** |
| `001_session_model.sql` | 9 columns on `learning_sessions` (`session_id`, `status`, `started_at`, `ended_at`, `duration_ms`, `activities`, `metrics`, `level_config`, `schema_version`), two indexes, and a backfill of `started_at` on legacy rows | **applied** — verified 2026-10-07 |

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
