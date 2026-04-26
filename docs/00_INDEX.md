# Akshara-Flow Documentation

## Document Index

| File | Contents |
|---|---|
| [01_PROJECT_OVERVIEW.md](01_PROJECT_OVERVIEW.md) | What the app does, target users, full feature list, tech stack, design decisions, learning flow diagram |
| [02_ARCHITECTURE.md](02_ARCHITECTURE.md) | System architecture diagrams, frontend/backend/DB layers, data flow, security model, environment variables |
| [03_ADAPTIVE_LEARNING_ENGINE.md](03_ADAPTIVE_LEARNING_ENGINE.md) | All four cognitive states, diagnosis engine, level generator, scaffold system, hesitation detection, cross-letter carry-forward |
| [04_BACKEND_REFERENCE.md](04_BACKEND_REFERENCE.md) | Every Python file explained: app.py, db.py, all agents, all routes — function signatures, constants, algorithms |
| [05_FRONTEND_REFERENCE.md](05_FRONTEND_REFERENCE.md) | Every React file explained: contexts, hooks, all 15 screens, all components — state, props, key logic |
| [06_DATABASE_SCHEMA.md](06_DATABASE_SCHEMA.md) | Full table definitions, RLS policies, foreign keys, cascade delete, migration SQL, Supabase setup |
| [07_DYSLEXIA_SCIENCE.md](07_DYSLEXIA_SCIENCE.md) | Research backing for every design decision: why each adaptation specifically helps children with dyslexia |

## Quick Reference

### Running the App

```bash
# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env  # fill in SUPABASE_URL, SUPABASE_KEY, GEMINI_API_KEY
python app.py

# Frontend
cd Akshara  # (root with package.json)
npm install
# create .env.local with VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL
npm run dev
```

### API Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | None | Backend health check |
| POST | `/analyze_session` | Optional JWT | Analyse session, return next level config |
| GET | `/progress_report` | Required JWT | AI-generated progress report |

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
| DB schema | `backend/supabase_schema.sql` |
