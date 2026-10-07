-- Akshara — migration 001: the session model
--
-- Run AFTER supabase_schema.sql, in the Supabase SQL editor.
-- Safe to run more than once.
--
-- Why this exists
-- ---------------
-- A session used to have no identity. `session_id` was generated on the client,
-- POSTed to /analyze_session, parsed, and then dropped, because there was no
-- column to put it in. The row was written once, at the very end of the flow,
-- so a child who stopped early left no record at all, and five of the eight
-- activities were never measured.
--
-- These columns give a session an identity, a lifecycle, and room for what each
-- activity produced.

ALTER TABLE learning_sessions
  -- Stable identity, minted on the client before the first activity.
  ADD COLUMN IF NOT EXISTS session_id     UUID,
  -- in_progress | completed | abandoned. Existing rows are all finished ones.
  ADD COLUMN IF NOT EXISTS status         TEXT DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS started_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ended_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS duration_ms    INTEGER,
  -- Ordered per-activity records: what was shown, traced, matched, answered.
  ADD COLUMN IF NOT EXISTS activities     JSONB DEFAULT '[]'::jsonb,
  -- Rescue rate, gross-shape vs feature-level split, latency spread.
  ADD COLUMN IF NOT EXISTS metrics        JSONB,
  -- The config that drove the session, so the report can explain itself.
  ADD COLUMN IF NOT EXISTS level_config   JSONB,
  -- 1 = written before this model existed and carries no activity detail.
  ADD COLUMN IF NOT EXISTS schema_version INTEGER DEFAULT 1;

-- JSONB rather than a child table: the payload is read whole and never queried
-- by field, and keeping it in one row means the browser's local store and the
-- database hold exactly the same shape.

-- One row per session. Partial, so the legacy rows (session_id IS NULL) do not
-- collide with each other.
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_session_id
  ON learning_sessions (session_id)
  WHERE session_id IS NOT NULL;

-- The report reads newest-first per child.
CREATE INDEX IF NOT EXISTS idx_sessions_user_started
  ON learning_sessions (user_id, started_at DESC);

-- Backfill: existing rows predate the session model. Give them a start time so
-- ordering works, and leave schema_version at 1 so the report labels them
-- "recorded by an earlier version" instead of rendering rows of dashes.
UPDATE learning_sessions
   SET started_at = COALESCE(started_at, created_at),
       status     = COALESCE(status, 'completed')
 WHERE started_at IS NULL;

-- Row Level Security already covers this table via "users_own_sessions"
-- (auth.uid() = user_id), and the new columns inherit it. Nothing to add.
