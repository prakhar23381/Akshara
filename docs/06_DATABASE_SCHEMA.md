# Akshara-Flow — Database Schema & Supabase Configuration

## Overview

Akshara-Flow uses Supabase (PostgreSQL) for all persistent storage. Three tables store user data, with Row Level Security (RLS) enforcing complete isolation between users at the database layer.

The full schema is in `backend/supabase_schema.sql`.

---

## Table: `user_profiles`

One row per authenticated user. Stores onboarding data separately from Supabase auth metadata.

**Why a separate table and not `auth.users.raw_user_meta_data`?**
Google OAuth can overwrite `raw_user_meta_data` on every re-login. If the child's avatar was stored there, it would be erased the next time a parent signs in on a new device. The `user_profiles` table is under the application's control and survives OAuth re-logins.

```sql
CREATE TABLE user_profiles (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name     TEXT,
  age              INT,
  avatar           TEXT,        -- emoji string, e.g. "🐻"
  profile_complete BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
```

| Column | Type | Purpose |
|---|---|---|
| `id` | UUID | Primary key, foreign key to `auth.users.id` |
| `display_name` | TEXT | Child's name (from onboarding ProfileNameScreen) |
| `age` | INT | Child's age 5–10 |
| `avatar` | TEXT | Emoji character for the child's animal avatar |
| `profile_complete` | BOOLEAN | Set to `true` after ProfileAvatarScreen completes |
| `created_at` | TIMESTAMPTZ | Row creation time |
| `updated_at` | TIMESTAMPTZ | Last update time (updated on each upsert) |

**RLS policy:**
```sql
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_profile" ON user_profiles
  FOR ALL USING (auth.uid() = id);
```

Users can only SELECT, INSERT, UPDATE, DELETE their own row.

---

## Table: `learning_sessions`

One row per completed game session. This is the primary training data used by the AI agents.

```sql
CREATE TABLE learning_sessions (
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
```

| Column | Type | Purpose |
|---|---|---|
| `id` | UUID | Auto-generated primary key |
| `user_id` | UUID | FK → user_profiles(id), cascades on delete |
| `letter` | TEXT | Target Hindi letter, e.g. "म" |
| `session_number` | INT | 1-indexed session count for this letter |
| `cognitive_state` | TEXT | State at end of session: gross_shape_blindness / feature_neglect / visual_mastery / insufficient_data |
| `distractor_pool` | TEXT[] | Array of distractor letters used in this session |
| `scaffold_intensity` | FLOAT | 0.0–1.0 scaffold level for this session |
| `error_rate_pct` | FLOAT | Percentage of wrong answers in session |
| `avg_latency_ms` | FLOAT | Average response time in milliseconds |
| `confused_pairs` | JSONB | `{"confused_pairs": [["म","भ"], ["म","ध"], ...]}` |
| `provider_used` | TEXT | "vertex_ai" | "gemini_api" | "fallback" |
| `created_at` | TIMESTAMPTZ | Session completion timestamp |

**JSONB `confused_pairs` format:**
```json
{
  "confused_pairs": [
    ["म", "भ"],
    ["म", "ध"],
    ["म", "भ"]
  ]
}
```

Each entry is `[target_letter, selected_letter]`. Repeated entries reflect multiple confusions of the same pair.

**Index:**
```sql
CREATE INDEX idx_sessions_user_letter
  ON learning_sessions(user_id, letter, created_at DESC);
```
Optimises the most common query pattern: `WHERE user_id = $1 AND letter = $2 ORDER BY created_at DESC`.

**RLS policy:**
```sql
ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_sessions" ON learning_sessions
  FOR ALL USING (auth.uid() = user_id);
```

---

## Table: `letter_progress`

One row per (user, letter) pair. Tracks mastery status and last-known performance metrics for each letter. Used by `ResumeScreen` to restore the child's position.

```sql
CREATE TABLE letter_progress (
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
```

| Column | Type | Purpose |
|---|---|---|
| `user_id` | UUID | FK → user_profiles(id), cascades on delete |
| `letter` | TEXT | Hindi letter |
| `letter_index` | INT | Position in LETTER_SEQUENCE (0–4) |
| `mastered` | BOOLEAN | `true` when backend returns `letter_mastered: true` |
| `sessions_count` | INT | Total sessions completed for this letter |
| `last_cognitive_state` | TEXT | Most recent cognitive state for this letter |
| `last_scaffold_intensity` | FLOAT | Most recent scaffold intensity |
| `last_avg_latency_ms` | FLOAT | Used to seed hesitation timers on resume |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |
| UNIQUE | (user_id, letter) | Enables `ON CONFLICT` upsert |

**Upsert pattern used in RewardScreen:**
```typescript
await supabase.from("letter_progress").upsert(
  {
    user_id:                user.id,
    letter:                 levelConfig.target_alphabet,
    letter_index:           LETTER_SEQUENCE.indexOf(levelConfig.target_alphabet),
    mastered,
    sessions_count:         sessionNumber,
    last_cognitive_state:   newConfig.cognitive_state,
    last_scaffold_intensity:newConfig.scaffold_intensity,
    last_avg_latency_ms:    newLatency,
    updated_at:             new Date().toISOString(),
  },
  { onConflict: "user_id,letter" }
);
```

**Index:**
```sql
CREATE INDEX idx_progress_user ON letter_progress(user_id);
```

**RLS policy:**
```sql
ALTER TABLE letter_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_progress" ON letter_progress
  FOR ALL USING (auth.uid() = user_id);
```

---

## Foreign Key Relationships

```
auth.users (Supabase managed)
    │
    └── user_profiles.id (ON DELETE CASCADE)
              │
              ├── learning_sessions.user_id (ON DELETE CASCADE)
              │
              └── letter_progress.user_id (ON DELETE CASCADE)
```

**Why `user_profiles` as the FK parent (not `auth.users` directly)?**
Originally both `learning_sessions` and `letter_progress` referenced `auth.users` directly. This meant deleting a `user_profiles` row did not cascade to the other tables — they were siblings, not children.

The fix: change FKs to reference `user_profiles(id)`. Now:
1. User is deleted from `auth.users` → `user_profiles` row is deleted (cascade from auth)
2. `user_profiles` deletion → `learning_sessions` rows deleted (cascade)
3. `user_profiles` deletion → `letter_progress` rows deleted (cascade)

This creates a clean deletion hierarchy and enables GDPR-compliant data removal by deleting a single row.

---

## Migration: FK Change

If tables already exist with FKs pointing to `auth.users`, run this migration:

```sql
-- Drop old constraints
ALTER TABLE learning_sessions
  DROP CONSTRAINT IF EXISTS learning_sessions_user_id_fkey;

ALTER TABLE letter_progress
  DROP CONSTRAINT IF EXISTS letter_progress_user_id_fkey;

-- Add new constraints pointing to user_profiles
ALTER TABLE learning_sessions
  ADD CONSTRAINT learning_sessions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

ALTER TABLE letter_progress
  ADD CONSTRAINT letter_progress_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
```

---

## Data Flows

### Session Storage (Backend → Supabase)
Called from `analyze.py` via `db.save_session()`:
```
POST /analyze_session
  → session analysed
  → save_session() called with authenticated client
  → INSERT into learning_sessions
```

### Progress Storage (Frontend → Supabase direct)
Called from `RewardScreen.tsx` directly via Supabase JS client:
```
tracker.endLevel() response received
  → supabase.from("learning_sessions").insert(...)   ← also inserted here
  → supabase.from("letter_progress").upsert(...)     ← upsert on user_id,letter
```

Note: `learning_sessions` is written by BOTH the backend (via `save_session()`) and the frontend (RewardScreen). The backend write includes the `provider_used` field; the frontend write includes debug data. In production this should be consolidated to a single write path.

### Progress Read (Frontend → Supabase direct)
Called from `ResumeScreen.tsx`:
```
loadAll()
  → supabase.from("user_profiles").select(...)    ← display_name, avatar
  → supabase.from("letter_progress").select(...)  ← latest letter_index, mastered
```

### Progress Report (Frontend → Backend → Supabase)
```
fetchProgressReport()
  → GET /progress_report (with JWT)
  → backend: load_all_sessions() + load_letter_progress()
  → aggregate stats + LLM analysis
  → return ProgressReport JSON
```

---

## Supabase Authentication

### Google OAuth Setup
1. In Supabase Dashboard → Authentication → Providers → Google: enable
2. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from Google Cloud Console
3. Add `https://your-supabase-project.supabase.co/auth/v1/callback` to Google OAuth redirect URIs

### JWT Structure
All JWTs are signed by Supabase. The payload contains:
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "app_metadata": { "provider": "google" },
  "user_metadata": { ... }
}
```

The backend verifies JWTs by calling `supabase.auth.get_user(token)` — this is an API call to Supabase's auth server, not local JWT verification. This ensures revoked tokens are rejected.

### Session Persistence
The Supabase JS client stores the session in `localStorage`. On app reload, `supabase.auth.getSession()` retrieves it. Token refresh is automatic.

---

## Environment Setup (Supabase Dashboard)

1. **Create project** at supabase.com
2. **Run schema** from `backend/supabase_schema.sql` in SQL Editor
3. **Enable Google OAuth** in Authentication → Providers
4. **Copy credentials:**
   - `Project URL` → `SUPABASE_URL` (backend) and `VITE_SUPABASE_URL` (frontend)
   - `anon public key` → `SUPABASE_KEY` (backend) and `VITE_SUPABASE_ANON_KEY` (frontend)
5. **Set allowed redirect URLs** in Authentication → URL Configuration:
   - `http://localhost:5173` (Vite dev server)
   - Your production domain
