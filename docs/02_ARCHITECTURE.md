# Akshara-Flow — System Architecture

*Rewritten 2026-10-07 against the code. The previous version described the
pre-refactor system: nine activity routes, an in-memory session tracker, a
server-rendered parent report and a backend that wrote to the database. All four
are gone. Where this document and the code disagree, the code is right.*

## The one-paragraph version

Akshara-Flow is a **client-owned** application. A child plays one letter through
a sequence of activities at a single URL; the browser owns the session, writes it
to `localStorage` at every step, and mirrors it to Supabase on a best-effort
basis. The adaptive engine and the parent report both run on the device. The
Flask backend is one stateless endpoint that personalises distractors with an
LLM — useful, never required. Pull the plug on the server, the key and the
network, and the app still teaches and still reports.

## High-level architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          CLIENT (browser)                                │
│                    React 18 · TypeScript · Vite 6                        │
│                                                                           │
│  Provider tree (outermost first)                                         │
│  AuthProvider → ProfileSetupProvider → SessionProvider                   │
│                 → LevelConfigProvider → RouterProvider                   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  react-router 7 — onboarding · /roadmap · /play · /report           │ │
│  │  ONE activity URL: /play. The step is derived from the session.      │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ┌──────────────────────┐   ┌────────────────────────────────────────┐   │
│  │  SessionContext      │   │  lib/adaptiveEngine.ts                 │   │
│  │  startSession        │   │  diagnose() · carryForward()           │   │
│  │  beginActivity       │   │  analyzeLocally() — the full engine,   │   │
│  │  completeActivity    │   │  on the device, mirroring the backend  │   │
│  │  recordAttempt       │   └────────────────────────────────────────┘   │
│  │  endSession          │   ┌────────────────────────────────────────┐   │
│  │  abandonSession      │   │  api/client.ts                         │   │
│  └──────────┬───────────┘   │  analyzeSession() → backend or local   │   │
│             │                │  buildProgressReport() — on-device     │   │
│  ┌──────────▼───────────┐   └────────────────────┬───────────────────┘   │
│  │  lib/sessionStore.ts │                        │                        │
│  │  localStorage is the │   ┌────────────────────▼───────────────────┐   │
│  │  SOURCE OF TRUTH     │──▶│  Supabase JS client                    │   │
│  │  write-through at    │   │  best-effort mirror of learning_sessions│   │
│  │  every activity      │   │  + user_profiles / letter_progress     │   │
│  └──────────────────────┘   └────────────────────┬───────────────────┘   │
└───────────────────────────────┬───────────────────┼───────────────────────┘
                 HTTP, optional │                   │ PostgREST, RLS enforced
┌───────────────────────────────▼──────────┐        │
│        BACKEND (Flask, port 5050)        │        │
│                STATELESS                 │        │
│                                          │        │
│  POST /analyze_session   GET /health     │        │
│  (analyze.py)                            │        │
│       │                                  │        │
│  ┌────▼─────────────┐                    │        │
│  │ DiagnosisAgent   │ deterministic,     │        │
│  │                  │ no LLM, no I/O     │        │
│  └────┬─────────────┘                    │        │
│  ┌────▼─────────────┐                    │        │
│  │ LevelGenerator   │ LLM: personalised  │        │
│  │ Agent            │ distractors        │        │
│  └────┬─────────────┘                    │        │
│  ┌────▼─────────────────────────────────┐│        │
│  │ LLMProviderRouter — priority chain   ││        │
│  │ with a hard-coded final fallback     ││        │
│  └──────────────────────────────────────┘│        │
│                                          │        │
│  NOT registered: GET /progress_report    │        │
│  (progress.py), and db.py with it        │        │
└──────────────────────────────────────────┘        │
┌───────────────────────────────────────────────────▼───────────────────────┐
│                         Supabase (PostgreSQL)                              │
│   user_profiles      learning_sessions         letter_progress             │
│   RLS on all three: auth.uid() = id / user_id                              │
│   FK cascade: deleting a user_profiles row removes the other two           │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Frontend architecture

### Routes

There are 15 route entries, but only **one activity URL**.

| Path | Screen |
|---|---|
| `/` | `HomeRedirect` |
| `/welcome` `/user-type` `/profile/name` `/profile/age` `/profile/avatar` `/assessment` | onboarding |
| `/resume` `/roadmap` | home |
| **`/play`** | **`PlayScreen` — the entire activity sequence for one letter** |
| `/my-progress` | `ChildProgressScreen` — effort and letters earned, never an error rate |
| `/report` | `ReportScreen` — the adult/clinical view, behind the parent math gate |
| `/progress` `/parent-dashboard` | redirect → `/report` |
| `*` | redirect → `/roadmap` |

`/animation`, `/pronunciation`, `/example-words`, `/tracing`, `/memory`, `/game`,
`/word-fill`, `/word-spelling` and `/reward` **no longer exist**. Each had
hardcoded the next with a `navigate()` call while the state that made them
coherent lived in unpersisted React context, so a refresh mid-letter reset the
child to a different letter than the roadmap showed.

### The step machine

`PlayScreen` renders one step at a time. It does not know the order; it asks the
session.

```
buildStepOrder(levelConfig)        types/session.ts
  intro → pronunciation → example_words
        → [tracing, only if levelConfig.input_mode === "trace"]
        → memory → identify → word_fill → word_spelling

nextStep(session) = the first step in that order with no completed_at
```

Two consequences worth stating plainly:

- **Refresh resumes.** The current step is a function of recorded state, not of
  which component happens to be mounted.
- **Tracing is conditional.** `STATE_RULES` sets `input_mode: "trace"` only for
  `gross_shape_blindness` and `insufficient_data`, where motor tracing is the
  intervention. A child already discriminating fine features is not sent back to it.

Every step receives the same props (`StepProps`: `letter`, `levelConfig`,
`onComplete`) and reports an outcome. No step knows what follows it.

### Context layer

```
App
└── AuthProvider            Supabase session, user, login/logout
    └── ProfileSetupProvider  ephemeral onboarding state (name/age/avatar)
        └── SessionProvider     the live LearningSession
            └── LevelConfigProvider  current letter + config
                └── RouterProvider
```

`SessionProvider` is the one that replaced `useSessionTracker`. Its API is
deliberately activity-shaped rather than screen-shaped:

| Method | Does |
|---|---|
| `startSession({userId, letter, sessionNumber, levelConfig})` | Mints the `session_id` **at the start** and snapshots the config that drove the session |
| `beginActivity(type)` / `completeActivity(type, outcome?)` | Opens and closes one activity, with its outcome |
| `recordAttempt(type, attempt)` | One question attempt, recorded live |
| `endSession()` | Computes metrics, diagnoses, returns `{letterMastered, nextConfig}` |
| `abandonSession()` | Marks `abandoned` — drop-off is data, not an error |

### Persistence: localStorage is the source of truth

`lib/sessionStore.ts` owns two keys:

| Key | Holds |
|---|---|
| `akshara_db_learning_sessions` | every session row |
| `akshara_active_session_id` | pointer to the session in progress |

It writes through on every activity, then mirrors the row to
`supabase.from("learning_sessions").upsert(...)`. The mirror is **best effort and
never blocking**: a failed network call cannot lose a session in progress.

`sweepStaleSessions()` runs on boot. A session left `in_progress` for more than
`STALE_SESSION_HOURS` (6) is marked `abandoned` and the active pointer cleared;
anything newer resumes.

### The session object

`LearningSession` (`types/session.ts`, `schema_version: 2`) holds
`session_id`, `user_id`, `letter`, `session_number`, `status`
(`in_progress | completed | abandoned`), `started_at`, `ended_at`, the
`level_config` snapshot, an `activities[]` array, computed `metrics`, and the
diagnosed `cognitive_state` with its `reasoning`.

Activities are typed by what they produce, which is what makes the report
auditable:

| Activity kind | Outcome recorded |
|---|---|
| passive (`intro`, `pronunciation`, `example_words`) | `{ kind: "viewed", dwell_ms }` — so "seen" is distinguishable from "skipped" |
| `tracing` | `{ score, passed, tries, model }` |
| `memory` | `{ moves, pairs, duration_ms }` |
| assessed (`identify`, `word_fill`, `word_spelling`) | `{ attempts: QuestionAttempt[] }` |

Only `ASSESSED_ACTIVITIES` feed the diagnosis.

### The adaptive engine runs on the device

`lib/adaptiveEngine.ts` is a full TypeScript implementation of the diagnosis and
carry-forward logic, mirroring the Python agents: `diagnose()`,
`carryForward()`, `analyzeLocally()`, `DISTRACTOR_POOLS`, `FEATURE_BY_LETTER`,
`NEW_LETTER_STATE_CAP`.

`api/client.ts → analyzeSession()` attaches `prior_cognitive_state` itself — so
no call site can forget it — then tries the backend and falls back to
`analyzeLocally()`. `tests/engine.test.ts` pins the two implementations together:
its 6 diagnosis cases mirror `backend/tests/test_pipeline.py`, and carry-forward
is verified identical on both sides for all 5 prior states.

### The report is built on the device

`buildProgressReport()` in `api/client.ts` assembles the parent report from
stored sessions; `ReportScreen` renders it. This is a deliberate reversal of the
original design, for two reasons: the report is the artifact a specialist reads,
so every figure must be traceable to a recorded attempt — generated prose cannot
carry that guarantee — and a server-side report needs a server, a database and an
API key to be reachable at all, while the hosted app has none of the three.

---

## Backend architecture

The backend is **one stateless endpoint plus a health check**. It reads no
database and writes none.

```python
app.register_blueprint(analyze_bp)   # POST /analyze_session
@app.route("/health")
```

### Why it is stateless

The client calls `/analyze_session` twice per letter — once to initialise with
zero attempts, once at the end — and each call used to run an INSERT. One sitting
therefore produced two server rows without a `session_id`, on top of the row the
client wrote itself: three rows for one session. `save_session` was deleted and
the client made the single writer. `prior_cognitive_state` now arrives in the
request body, which was the only thing the endpoint needed a query for.

### The agent pipeline

```
SessionPayload
      ↓
DiagnosisAgent        pure function, no LLM, no I/O, fully deterministic
      ↓ (state, reasoning)
LevelGeneratorAgent   LLM: personalised distractor pool, feature to highlight,
      ↓                scaffold intensity
LevelConfig  →  response
```

**Diagnosis is never done by an LLM.** It is deterministic rule-based
classification, and that is non-negotiable for reliability.

### LLM abstraction

`LLMProviderRouter` is a priority chain with graceful degradation:

```
VertexAI (gemini-2.0-flash, GCP, no rate limits)
  ↓ fail
GeminiAPI gemini-3.1-flash-lite-preview
  ↓ fail
GeminiAPI gemini-2.5-flash-lite
  ↓ fail
GeminiAPI gemini-2.0-flash
  ↓ fail
hard-coded FALLBACK_DISTRACTORS — never raises
```

Both providers use `temperature=0.2` and
`response_mime_type="application/json"`. Low temperature matters because the
output must be precisely valid, not creative.

### Retired, still on disk

`IP/routes/progress.py` (`GET /progress_report`) is not registered, and `db.py`
is imported only by it — so both are unreachable from a running server, along
with `verify_jwt`, `load_user_history`, `get_latest_cognitive_state`,
`load_all_sessions` and `load_letter_progress`. Both files carry docstrings
explaining the retirement. Treat them as reference, not as live code.

CORS is applied globally via `@app.after_request` with `Allow-Origin: *`. In
production this should be narrowed to the frontend domain.

---

## Data model

The tables are defined in `backend/migrations/000_init.sql` (applied) and
extended by `001_session_model.sql` (**not applied**). See
`backend/migrations/README.md` for applied state and
`docs/06_DATABASE_SCHEMA.md` for the full column list.

- **`user_profiles`** — one row per authenticated user. Onboarding data is kept
  here rather than in Supabase auth metadata, because a Google OAuth re-login can
  overwrite `raw_user_meta_data`.
- **`learning_sessions`** — one row per session. `000_init.sql` gives it the
  aggregate columns (`cognitive_state`, `distractor_pool`, `error_rate_pct`,
  `avg_latency_ms`, `confused_pairs`, …); `001` adds the session model proper
  (`session_id`, `status`, `started_at`, `ended_at`, `duration_ms`, `activities`,
  `metrics`, `level_config`, `schema_version`).
- **`letter_progress`** — one row per (user, letter), `UNIQUE(user_id, letter)`
  so it can be upserted. Drives `ResumeScreen`.

> **Live gap.** Until `001` is applied, `session_id` does not exist in the
> database. The client mints one regardless, so the mirror cannot store it and
> sessions live in `localStorage` only. This is the project's one open blocker.

---

## Security model

- **RLS on every table**, `auth.uid() = id` / `auth.uid() = user_id`. Since the
  client is the writer, RLS is not a backstop here — it is the enforcement.
  Verified: an anonymous insert returns `42501` and writes nothing.
- **Cascade delete** from `user_profiles` removes that user's sessions and letter
  progress, which is what makes deletion requests answerable.
- **The backend needs no JWT**, because it touches no data. Nothing it returns
  depends on who is asking.
- **Only `VITE_`-prefixed variables reach the browser.** Anything else in
  `.env.local` is inert as far as the client is concerned.

---

## Degradation

Four layers, each independent:

| Layer | When it fires | Result |
|---|---|---|
| LLM fallback (backend) | every Gemini provider fails | `FALLBACK_DISTRACTORS` for the diagnosed state |
| Local engine (client) | backend unreachable or slow | `analyzeLocally()` — the same diagnosis, on-device |
| Offline queue | Supabase write fails | `lib/offline_sync.ts` queues and replays |
| localStorage | no network at all | the session, the engine and the report all still work |

A child can complete a letter, be correctly re-levelled, and have a parent read
the report, with the backend switched off.

---

## Environment variables

Exactly two files hold configuration, each with a template beside it.

| Edit | From | Read by | Names that matter |
|---|---|---|---|
| `.env.local` | `.env.example` | the browser | `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`, `VITE_API_URL` |
| `backend/.env` | `backend/.env.example` | Python | `SUPABASE_URL`, `SUPABASE_KEY`, `GEMINI_API_KEY` |

`vercel env pull` writes about fifteen further variables into `.env.local`
(`SUPABASE_*`, `NEXT_PUBLIC_*`, `POSTGRES_*`). None is read by anything: Vite
exposes only `VITE_`-prefixed variables to client code. A pull also
**overwrites** the file and drops the `VITE_` lines, since Vercel holds none — if
local Supabase stops working right after a pull, that is why.

Credentials and the Google OAuth client: [08_AUTH_SETUP.md](08_AUTH_SETUP.md).

---

## Architectural invariants

1. **Diagnosis is never done by an LLM.** Deterministic rule-based classification.
2. **The client is the single writer of session rows.** The backend writes nothing.
3. **localStorage is the source of truth**; Supabase is a best-effort mirror.
4. **The session is written through at every activity**, not once at the end, so a
   child who quits half-way still leaves a record — and drop-off is itself
   clinically interesting data.
5. **The step order is derived from `levelConfig`**, in one place
   (`buildStepOrder`), never from a `navigate()` call in a screen.
6. **Every figure in the report traces to a recorded attempt.** Nothing in it is
   generated prose.
7. **Every LLM call has a hard-coded fallback.** The app never crashes on API
   unavailability.
8. **The app works with no server, no key and no network.**
