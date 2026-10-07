-- Akshara-Flow — Supabase Schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query)

-- ── user_profiles ────────────────────────────────────────────────────────────
-- One row per user. Stores onboarding data (name, age, avatar).
-- Separate from auth.users so it survives OAuth re-logins.
CREATE TABLE IF NOT EXISTS user_profiles (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name     TEXT,
  age              INT,
  avatar           TEXT,
  profile_complete BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_profile" ON user_profiles
  FOR ALL USING (auth.uid() = id);

-- ── learning_sessions ─────────────────────────────────────────────────────────
-- One row per completed level. Used to build user history for LLM personalisation.
CREATE TABLE IF NOT EXISTS learning_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  letter              TEXT NOT NULL,
  session_number      INT  NOT NULL DEFAULT 1,
  cognitive_state     TEXT NOT NULL,
  distractor_pool     TEXT[] NOT NULL DEFAULT '{}',
  scaffold_intensity  FLOAT NOT NULL DEFAULT 0.5,
  error_rate_pct      FLOAT NOT NULL DEFAULT 0.0,
  avg_latency_ms      FLOAT NOT NULL DEFAULT 0.0,
  confused_pairs      JSONB NOT NULL DEFAULT '[]',
  provider_used       TEXT  DEFAULT 'fallback',
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── letter_progress ───────────────────────────────────────────────────────────
-- One row per (user, letter). Tracks mastery and last-known timing for each letter.
CREATE TABLE IF NOT EXISTS letter_progress (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  letter                  TEXT  NOT NULL,
  letter_index            INT   NOT NULL,
  mastered                BOOLEAN DEFAULT FALSE,
  sessions_count          INT   DEFAULT 0,
  last_cognitive_state    TEXT  DEFAULT 'insufficient_data',
  last_scaffold_intensity FLOAT DEFAULT 0.55,
  last_avg_latency_ms     FLOAT DEFAULT 6000,
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, letter)
);

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE letter_progress   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_sessions" ON learning_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_progress" ON letter_progress
  FOR ALL USING (auth.uid() = user_id);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sessions_user_letter
  ON learning_sessions(user_id, letter, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_progress_user
  ON letter_progress(user_id);
