# Akshara-Flow Documentation

## Document Index

| File | Contents |
|---|---|
| [01_PROJECT_OVERVIEW.md](01_PROJECT_OVERVIEW.md) | What the app does, target users, full feature list, tech stack, design decisions, learning flow diagram |
| [02_ARCHITECTURE.md](02_ARCHITECTURE.md) | System architecture diagrams, frontend/backend/DB layers, data flow, security model, environment variables |
| [03_ADAPTIVE_LEARNING_ENGINE.md](03_ADAPTIVE_LEARNING_ENGINE.md) | All four cognitive states, diagnosis engine, level generator, scaffold system, hesitation detection, cross-letter carry-forward |
| [04_BACKEND_REFERENCE.md](04_BACKEND_REFERENCE.md) | Every Python file explained: app.py, the agents, `/analyze_session` — signatures, constants, algorithms. Marks the retired `db.py` and `/progress_report` |
| [05_FRONTEND_REFERENCE.md](05_FRONTEND_REFERENCE.md) | Every React file explained: contexts, hooks, the `/play` step machine, all 12 screens, all 11 components |
| [06_DATABASE_SCHEMA.md](06_DATABASE_SCHEMA.md) | Full table definitions, RLS policies, foreign keys, cascade delete, migration SQL, Supabase setup |
| [07_DYSLEXIA_SCIENCE.md](07_DYSLEXIA_SCIENCE.md) | Research backing for every design decision: why each adaptation specifically helps children with dyslexia |
| [archive/](archive/) | Superseded planning documents, kept for their reasoning |
| [08_AUTH_SETUP.md](08_AUTH_SETUP.md) | Owning the credentials: creating the Google Cloud OAuth client, enabling the Supabase provider, the two redirect allowlists, which env vars the frontend can actually read |

## Quick Reference

### Running the App

```bash
# Frontend — this is the whole app. Adaptation and the progress report both run
# on-device, so it needs no server.
npm install
cp .env.example .env.local     # then fill in the two VITE_ values
npm run dev

# Backend — optional, only if you want Gemini-personalised distractors.
cd backend
python3 -m venv .venv && ./.venv/bin/pip install -r requirements.txt
cp .env.example .env           # SUPABASE_URL, SUPABASE_KEY, GEMINI_API_KEY
./.venv/bin/python app.py
```

Exactly two files hold configuration, and each has a template beside it:

| Edit | From | Read by | Names that matter |
|---|---|---|---|
| `.env.local` | `.env.example` | the browser | `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`, `VITE_API_URL` |
| `backend/.env` | `backend/.env.example` | Python | `SUPABASE_URL`, `SUPABASE_KEY`, `GEMINI_API_KEY` |

`vercel env pull` writes about fifteen further variables into `.env.local`
(`SUPABASE_*`, `NEXT_PUBLIC_*`, `POSTGRES_*`). None of them is read by anything:
Vite exposes only `VITE_`-prefixed variables to client code. A pull also
**overwrites** the file and drops the `VITE_` lines, since Vercel holds none —
if local Supabase stops working right after a pull, that is why.

Credentials, allowlists and the Google OAuth client: [08_AUTH_SETUP.md](08_AUTH_SETUP.md).

### API Endpoints

A running server exposes exactly two endpoints. The backend is stateless: it
reads no database and writes none.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | None | Backend health check |
| POST | `/analyze_session` | None needed | Analyse a session payload, return the next level config |

`GET /progress_report` is **retired and not registered**. The parent report is
built on the device by `src/app/api/client.ts → buildProgressReport()`, so every
figure traces to a recorded attempt and the report works with no server.

### Cognitive State Quick Reference

| State | Trigger | Distractors | Dot | Input |
|---|---|---|---|---|
| `insufficient_data` | First session | Easy (ल ह स र) | Never | Tap |
| `gross_shape_blindness` | Dissimilar error > 30% | Easy | Animated always | **Trace** then tap |
| `feature_neglect` | Similar error > 30% | **Hard** (भ ध न) | On hesitation | Tap |
| `visual_mastery` | Similar error < 10% | Hard | Never | Tap |

### Key Files

| Need to change... | Edit file |
|---|---|
| Letter sequence | `backend/IP/agents/level_generator.py` → `LETTER_SEQUENCE` + `src/app/types/levelConfig.ts` → `LETTER_SEQUENCE` |
| Distractor pools | `backend/IP/agents/level_generator.py` → `FALLBACK_DISTRACTORS` + `backend/IP/agents/prompts.py` (HIGH confusion pairs) |
| Dot positions | `src/app/types/levelConfig.ts` → `FEATURE_HIGHLIGHT_POSITIONS` |
| Feature → letter mapping | `backend/IP/agents/prompts.py` → "Distinguishing features per letter" section |
| Hesitation timers | `backend/IP/agents/level_generator.py` → `stage1_ms`/`stage2_ms` calculation |
| Error thresholds | `backend/IP/agents/diagnosis_agent.py` → `ERROR_THRESHOLD_FAIL`/`MASTERY` |
| Example words | `src/app/data/letterContent.ts` → `LETTER_CONTENT` |
| LLM model | `backend/IP/agents/llm_provider.py` → `LLMProviderRouter` constructor |
| DB schema | `backend/migrations/000_init.sql` (applied) |
| Session-model migration | `backend/migrations/001_session_model.sql` — applied; state tracked in `backend/migrations/README.md` |
| Activity order | `src/app/types/session.ts` → `buildStepOrder()` |
| Session persistence | `src/app/lib/sessionStore.ts` |
| On-device engine | `src/app/lib/adaptiveEngine.ts` |
