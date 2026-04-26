# Akshara-Flow — System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser / PWA)                       │
│                                                                       │
│   React 18 + TypeScript + Vite                                       │
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  AuthContext  │  │LevelConfig   │  │  ProfileSetupContext      │  │
│  │  (Supabase   │  │  Provider    │  │  (onboarding state)       │  │
│  │   OAuth)     │  │  (session +  │  │                           │  │
│  │              │  │  letter      │  │                           │  │
│  │              │  │  progression)│  │                           │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                    React Router v7 (15 routes)                  │  │
│  │  /  /welcome  /user-type  /profile/*  /resume                  │  │
│  │  /animation  /pronunciation  /example-words                    │  │
│  │  /game  /tracing  /reward  /progress  /transition              │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌─────────────────────┐       ┌─────────────────────────────────┐  │
│  │  useSessionTracker  │       │  Supabase Client (direct DB)    │  │
│  │  (in-memory attempt │       │  - user_profiles                │  │
│  │   recording)        │       │  - letter_progress              │  │
│  │                     │       │  (client reads these directly)  │  │
│  └─────────────────────┘       └─────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┬──────────┘
                                                            │ HTTP
                                                            │ (Bearer JWT)
┌───────────────────────────────────────────────────────────▼──────────┐
│                      BACKEND (Flask / Python)                         │
│                           port 5050                                   │
│                                                                       │
│  ┌────────────────────────────┐  ┌──────────────────────────────┐   │
│  │  POST /analyze_session     │  │  GET /progress_report        │   │
│  │  (analyze.py blueprint)    │  │  (progress.py blueprint)     │   │
│  └────────────┬───────────────┘  └──────────────┬───────────────┘   │
│               │                                  │                    │
│  ┌────────────▼───────────┐    ┌────────────────▼──────────────┐    │
│  │   DiagnosisAgent       │    │  _build_letter_stats()         │    │
│  │   (rule-based,         │    │  (aggregates per-letter        │    │
│  │    deterministic)      │    │   error trends, confusion)     │    │
│  └────────────┬───────────┘    └────────────────┬──────────────┘    │
│               │                                  │                    │
│  ┌────────────▼───────────┐    ┌────────────────▼──────────────┐    │
│  │   LevelGeneratorAgent  │    │  Progress LLM prompt           │    │
│  │   (LLM-powered,        │    │  (parent-facing insights)      │    │
│  │    personalised)       │    │                                │    │
│  └────────────┬───────────┘    └────────────────┬──────────────┘    │
│               │                                  │                    │
│  ┌────────────▼──────────────────────────────────▼──────────────┐    │
│  │                    LLMProviderRouter                          │    │
│  │  1. VertexAI (gemini-2.0-flash, enterprise, GCP)             │    │
│  │  2. GeminiAPI (gemini-3.1-flash-lite-preview, free tier)     │    │
│  │  3. GeminiAPI (gemini-2.5-flash-lite, fallback)              │    │
│  │  4. GeminiAPI (gemini-2.0-flash, last resort)                │    │
│  │  5. Hard-coded fallback (never crashes)                      │    │
│  └───────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐    │
│  │                       db.py helpers                           │    │
│  │  verify_jwt | load_user_history | get_latest_cognitive_state  │    │
│  │  load_all_sessions | load_letter_progress | save_session      │    │
│  └───────────────────────────────┬───────────────────────────────┘    │
└───────────────────────────────────┼───────────────────────────────────┘
                                    │ Supabase REST (PostgREST)
                                    │ (user JWT → RLS enforced)
┌───────────────────────────────────▼───────────────────────────────────┐
│                        Supabase (PostgreSQL)                           │
│                                                                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────────┐   │
│  │  user_profiles   │  │ learning_sessions │  │  letter_progress  │   │
│  │  - id (PK→auth)  │  │  - user_id (FK→  │  │  - user_id (FK→   │   │
│  │  - display_name  │  │    user_profiles) │  │    user_profiles) │   │
│  │  - age           │  │  - letter         │  │  - letter         │   │
│  │  - avatar        │  │  - session_number │  │  - letter_index   │   │
│  │  - profile_      │  │  - cognitive_     │  │  - mastered       │   │
│  │    complete      │  │    state          │  │  - sessions_count │   │
│  └──────────────────┘  │  - distractor_    │  │  - last_cognitive │   │
│                         │    pool           │  │    _state         │   │
│  RLS: auth.uid() = id  │  - scaffold_      │  │  - last_avg_      │   │
│                         │    intensity      │  │    latency_ms     │   │
│                         │  - error_rate_pct │  └───────────────────┘   │
│                         │  - avg_latency_ms │                          │
│                         │  - confused_pairs │  RLS: auth.uid() =       │
│                         │  - provider_used  │       user_id            │
│                         └──────────────────┘                          │
│                                                                        │
│  FK chain: user_profiles.id ← learning_sessions.user_id               │
│            user_profiles.id ← letter_progress.user_id                 │
│  (Cascade delete: deleting user_profiles row removes both)            │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Context Layer
Three React Contexts manage global state, wrapped from outermost to innermost:

```
App
└── AuthProvider           — Supabase session, user object, login/logout
    └── ProfileSetupProvider — Temporary onboarding state (name/age/avatar)
        └── LevelConfigProvider — Current letter, session number, level config
            └── RouterProvider — All screen components
```

**Why three separate contexts instead of one?**
- `AuthContext` has lifecycle (auth state changes, token refresh) independent of everything else
- `ProfileSetupContext` is ephemeral — only needed during onboarding, discarded afterward
- `LevelConfigProvider` is the most frequently updated — isolating it prevents auth-state changes from re-rendering every screen

### Hook Architecture

**`useSessionTracker`**
This is the most critical hook. It is the bridge between individual question answers (GameScreen) and the backend analysis pipeline.

```
GameScreen
  ├── recordAttempt() → stores in-memory QuestionAttempt
  ├── recordGuidedWin() → stores guided win attempt
  ├── markAudioEnd() → timestamps audio completion
  └── getConsecutiveFails() → tracks fail streak

RewardScreen
  └── endLevel() → serialises all attempts → POST /analyze_session → returns LevelConfig
```

The hook key pattern `${userId}::${targetAlphabet}::${sessionNumber}` ensures that each distinct session has its own tracker state, preventing cross-contamination when letters advance.

### State Flow: Session Lifecycle

```
ResumeScreen
  └── handleContinue()
        POST /analyze_session (attempts: [], initialisation call)
        → receives LevelConfig for current cognitive state
        → navigate('/animation')

AnimationScreen (3s) → PronunciationScreen → ExampleWordsScreen
        → (input_mode === 'trace') ? '/tracing' : '/game'

GameScreen
  ├── useMemo: shuffle correct + 3 distractors from distractor_pool
  ├── useEffect: hesitation timers (stage1, stage2, stage3)
  ├── handleOptionClick: recordAttempt / recordGuidedWin
  └── correct answer → navigate('/reward')

RewardScreen
  └── useEffect (once, apiCalled guard)
        tracker.endLevel()
          → POST /analyze_session (real attempts)
          → returns LevelConfig + letter_mastered
        save to learning_sessions (Supabase direct)
        upsert to letter_progress (Supabase direct)
        → set nextConfigReady = true
        → show mastery choice or practice button
```

---

## Backend Architecture

### Agent Pattern

The backend uses a two-agent pipeline. The agents are independent classes with clear single responsibilities:

```
SessionPayload
      ↓
┌─────────────────────┐
│  DiagnosisAgent     │  ← Pure function: data in, CognitiveState out
│  (diagnosis_agent.py)│  ← No LLM, no I/O, fully deterministic
└──────────┬──────────┘
           │ (state, reasoning)
           ↓
┌─────────────────────┐
│  LevelGeneratorAgent│  ← LLM call: personalises distractor pool,
│  (level_generator.py)│    feature_to_highlight, scaffold intensity
└──────────┬──────────┘
           │ LevelConfig
           ↓
        Response
```

### LLM Abstraction (llm_provider.py)

The `LLMProviderRouter` implements a **priority chain with graceful degradation**:

```
Try: VertexAIProvider (GCP enterprise, no rate limits)
  Fail? Try: GeminiAPIProvider("gemini-3.1-flash-lite-preview")
    Fail? Try: GeminiAPIProvider("gemini-2.5-flash-lite")
      Fail? Try: GeminiAPIProvider("gemini-2.0-flash")
        Fail? → Hard-coded fallback (never raises exception)
```

Both providers use `temperature=0.2` and `response_mime_type="application/json"` to force structured, consistent output. Low temperature is critical here because the output (distractor pool, feature key) must be precisely valid, not creative.

### Route Blueprints

Both routes are registered as Flask Blueprints:

```python
app.register_blueprint(analyze_bp)   # POST /analyze_session
app.register_blueprint(progress_bp)  # GET /progress_report
```

CORS headers are applied globally via `@app.after_request`, allowing any origin. In production this would be restricted to the specific frontend domain.

### Database Access Pattern (db.py)

Two client types are used:

1. **`_get_base()`** — Anon client used only for `verify_jwt()`. Uses the public anon key.
2. **`_authed(user_jwt)`** — Per-request client with `postgrest.auth(user_jwt)`. This makes PostgreSQL's `auth.uid()` resolve to the correct user, so Supabase RLS policies enforce data isolation automatically.

Every DB query that reads or writes user data uses `_authed()`. This means even if the backend has a bug and tries to read another user's data, Supabase's RLS policy will return an empty result.

---

## Data Model

### `user_profiles`
One row per authenticated user. Stores onboarding data separately from Supabase auth metadata because Google OAuth re-login can overwrite `raw_user_meta_data`.

```sql
CREATE TABLE user_profiles (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name     TEXT,
  age              INT,
  avatar           TEXT,
  profile_complete BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
```

### `learning_sessions`
One row per completed learning session. This is the primary data source for AI personalisation — the `LevelGeneratorAgent` reads the last 5 sessions per letter before generating a new config.

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

### `letter_progress`
One row per (user, letter). Used by the ResumeScreen to restore the child's last-known position. The `UNIQUE(user_id, letter)` constraint allows upsert-based updates.

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

---

## Security Model

### Row Level Security (RLS)
Every table has RLS enabled. Policies ensure users can only access their own data:

```sql
-- user_profiles
CREATE POLICY "users_own_profile" ON user_profiles
  FOR ALL USING (auth.uid() = id);

-- learning_sessions
CREATE POLICY "users_own_sessions" ON learning_sessions
  FOR ALL USING (auth.uid() = user_id);

-- letter_progress
CREATE POLICY "users_own_progress" ON letter_progress
  FOR ALL USING (auth.uid() = user_id);
```

### Backend JWT Verification
The Flask backend verifies every JWT via Supabase's `auth.get_user(token)` before performing any database operations. If verification fails, all DB calls use the `verified_user_id = None` path (no persistence).

### Cascade Delete
Deleting a `user_profiles` row automatically cascades to `learning_sessions` and `letter_progress` via foreign key constraints with `ON DELETE CASCADE`. This ensures GDPR-compliant data deletion.

---

## Fallback Strategy

The system has three levels of fallback, ensuring the app always works even if the backend or LLM is unavailable:

### Level 1: LLM fallback (backend)
If all Gemini providers fail, `LevelGeneratorAgent._hard_fallback()` returns hardcoded distractor pools from `FALLBACK_DISTRACTORS` dict, appropriate for the current cognitive state.

### Level 2: API fallback (frontend)
If the backend is unreachable, `analyzeSession()` in `client.ts` returns `makeFallbackResponse()` — a static `LevelConfig` based on the last-known target alphabet and `insufficient_data` state.

### Level 3: Auth fallback
If JWT verification fails, the backend still processes the session using the `user_id` from the request body (unauthenticated mode). The session is analysed and a level config returned, but nothing is persisted to Supabase.

This means a child can continue learning even in offline/degraded mode — they just won't have their progress saved.

---

## Environment Variables

### Backend (`backend/.env`)
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_KEY=eyJ...  (anon key)
GEMINI_API_KEY=AIza... (from aistudio.google.com)
GOOGLE_CLOUD_PROJECT=your-gcp-project  (optional, Vertex AI)
GOOGLE_CLOUD_LOCATION=us-central1      (optional, Vertex AI)
```

### Frontend (`src/.env` or `.env.local`)
```
VITE_API_URL=http://localhost:5050  (or production backend URL)
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## Key Architectural Invariants

1. **Diagnosis is never done by LLM.** It is deterministic rule-based classification. This is non-negotiable for reliability.

2. **LevelConfig is the single source of truth for a session.** Every screen reads from `useLevelConfig()`. Nothing is duplicated.

3. **Session tracking is entirely in-memory until `endLevel()`.** Intermediate attempts are never persisted. Only the complete session is sent to the backend.

4. **The frontend never writes directly to `learning_sessions`.** It calls the backend, which validates and writes. However, `letter_progress` is written directly by the frontend (RewardScreen) for latency reasons — the backend also writes it for consistency.

5. **Every LLM call has a hard-coded fallback.** The app never crashes due to API unavailability.

6. **RLS is the last line of defence.** Even if the application code has a data-access bug, Supabase's RLS prevents cross-user data leakage.
