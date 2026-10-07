# Migrations

Applied in filename order, by hand, in the Supabase SQL editor. There is no
migration runner — this file is the record of what has been applied, so keep it
honest.

| File | Applies | Status |
|---|---|---|
| `000_init.sql` | `user_profiles`, `learning_sessions`, `letter_progress`; RLS policies on all three | **applied** |
| `001_session_model.sql` | 10 columns on `learning_sessions`: `session_id`, `status`, `started_at`, `ended_at`, `duration_ms`, `activities`, `metrics`, `level_config`, `schema_version` | **not applied** |

## Why 001 matters

Until it is applied, `session_id` does not exist in the database. The client
mints one at session start and is the single writer of session rows
(`src/app/lib/sessionStore.ts`), so with the column missing the Supabase mirror
cannot store it — sessions live in `localStorage` only and the parent report is
built entirely on-device.

This is the one live blocker in the project. Tracked as TODO 7.8.

## Applying one

1. Supabase dashboard → SQL Editor → paste the file → Run.
2. Update the Status column above in the same commit as any code that depends on it.

`000_init.sql` was `backend/supabase_schema.sql` until 2026-10-07. It was renamed
so that the base schema and the migration that extends it sit in one ordered
place; nothing about its contents changed.
