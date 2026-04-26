# Akshara-Flow — Backend Reference

All backend code lives in `backend/`. The entry point is `app.py`. Everything else is under `IP/` (the core intelligence package).

```
backend/
├── app.py                        Flask application + blueprint registration
├── db.py                         Supabase client + all DB helper functions
├── requirements.txt              Python dependencies
├── .env                          Environment variables (not committed)
└── IP/
    ├── __init__.py
    ├── agents/
    │   ├── diagnosis_agent.py    Rule-based cognitive state classifier
    │   ├── level_generator.py    LLM-powered level config generator
    │   ├── llm_provider.py       LLM abstraction (VertexAI / Gemini / fallback)
    │   └── prompts.py            System + user prompt templates
    ├── models/
    │   └── session.py            Dataclasses: SessionPayload, LevelConfig, enums
    └── routes/
        ├── analyze.py            POST /analyze_session
        └── progress.py           GET /progress_report
```

---

## `app.py` — Application Entry Point

**Path:** `backend/app.py`

The root Flask application. Responsibilities:
- Loads `.env` file
- Configures logging (INFO level, timestamped)
- Registers both route blueprints
- Applies global CORS headers (allows any origin, all methods, Content-Type + Authorization headers)
- Exposes `/health` endpoint

```python
from IP.routes.analyze import analyze_bp
from IP.routes.progress import progress_bp

app.register_blueprint(analyze_bp)
app.register_blueprint(progress_bp)
```

**Running:**
```bash
cd backend
python app.py          # development, port 5050, debug=True
gunicorn app:app --workers 2 --timeout 30   # production
```

**CORS:**
Applied via `@app.after_request`. In development this is `*`. In production, restrict `Access-Control-Allow-Origin` to the specific frontend domain.

---

## `db.py` — Database Helpers

**Path:** `backend/db.py`

Central module for all Supabase interactions. Uses two distinct client patterns:

### Client Types

**Anon client** (`_get_base()`)
```python
_base_client = create_client(SUPABASE_URL, SUPABASE_KEY)
```
Used only for JWT verification. Singleton, lazy-initialised.

**Authed client** (`_authed(user_jwt)`)
```python
client = create_client(url, key)
client.postgrest.auth(user_jwt)   # user JWT sets auth.uid() in PostgreSQL
```
Used for all data operations. Created per-request. The `postgrest.auth(user_jwt)` call makes PostgreSQL's `auth.uid()` function resolve to the correct user, so RLS policies enforce data isolation automatically without any application-layer checks.

### Functions

#### `verify_jwt(token: str) → str | None`
Verifies a Supabase JWT using `auth.get_user(token)`. Returns the `user.id` UUID string on success, `None` on any failure.

Called first in every authenticated endpoint handler.

#### `load_user_history(user_id, letter, user_jwt, limit=5) → list[dict]`
Fetches the last N sessions for a specific user+letter combination. Returns sessions in chronological order (oldest first, reversed from query).

**Output format** (matches `build_user_prompt()` expectations):
```python
[{
    "session_number": int,
    "pairs": list,            # confused_pairs from JSONB column
    "distractor_pool": list,
    "scaffold_intensity": float,
}]
```

Used by `LevelGeneratorAgent` to personalise distractor selection based on confusion history.

#### `get_latest_cognitive_state(user_id, user_jwt) → str | None`
Returns the most recent `cognitive_state` value from **any** letter this user has practiced. Not filtered by letter — queries all `learning_sessions` rows ordered by `created_at DESC`, limit 1.

Used in `analyze.py` for cross-letter profile carry-forward.

#### `load_all_sessions(user_id, user_jwt, limit=60) → list[dict]`
Returns up to 60 sessions (newest first) with full metrics: letter, session_number, cognitive_state, error_rate_pct, avg_latency_ms, scaffold_intensity, confused_pairs, created_at.

Used by `progress.py` for the AI progress report.

#### `load_letter_progress(user_id, user_jwt) → list[dict]`
Returns all `letter_progress` rows for a user, ordered by `letter_index ASC`. Returns: letter, letter_index, mastered, sessions_count, last_cognitive_state, last_scaffold_intensity, last_avg_latency_ms.

Used by `progress.py` to determine mastery status per letter.

#### `save_session(user_id, letter, session_number, cognitive_state, distractor_pool, scaffold_intensity, error_rate_pct, avg_latency_ms, confused_pairs, provider_used, user_jwt) → None`
Inserts a new row into `learning_sessions`. Called from `analyze.py` after level generation.

`confused_pairs` is stored as `{"confused_pairs": [[target, selected], ...]}` JSONB.

---

## `IP/models/session.py` — Data Models

**Path:** `backend/IP/models/session.py`

Pure Python dataclasses with no DB dependency. All data flowing through the analysis pipeline is typed through these models.

### Enums

```python
class ModuleType(str, Enum):
    DISSIMILAR = "dissimilar"   # Easy distractors (ल ह स र)
    SIMILAR    = "similar"      # Hard distractors (confusable pairs)
    SCAFFOLD   = "scaffold"     # Hard distractors + visual dot

class CognitiveState(str, Enum):
    GROSS_SHAPE_BLINDNESS = "gross_shape_blindness"
    FEATURE_NEGLECT       = "feature_neglect"
    VISUAL_MASTERY        = "visual_mastery"
    INSUFFICIENT_DATA     = "insufficient_data"

class DistractorSimilarity(str, Enum):
    HIGH = "high"     # similar-looking letters
    LOW  = "low"      # dissimilar-looking letters

class VisualAidIntensity(str, Enum):
    NONE     = "none"
    STATIC   = "static"      # dot on hesitation only
    ANIMATED = "animated"    # dot from start

class InputMode(str, Enum):
    TAP   = "tap"
    DRAG  = "drag"     # not yet implemented in frontend
    TRACE = "trace"    # routes to TracingScreen
```

### `QuestionAttempt`

```python
@dataclass
class QuestionAttempt:
    target_letter:        str      # e.g. "म"
    selected_letter:      str      # what the child picked
    module_type:          ModuleType
    time_to_interact_ms:  float    # ms from audio-end to tap
    was_guided_win:       bool     # True if system answered for child
    hover_duration_ms:    float    # time hovering before tap (touch)
    jitter_count:         int      # erratic movement counter
```

### `SessionPayload`

The complete session data POSTed to `/analyze_session`.

```python
@dataclass
class SessionPayload:
    user_id:          str
    target_alphabet:  str      # "म"
    session_id:       str      # "sess_1703123456789"
    session_number:   int = 1

    attempts:               list[QuestionAttempt]
    avg_latency_ms:         float = 0.0
    consecutive_fails_peak: int   = 0
```

**Computed properties:**
- `total_attempts` — `len(self.attempts)`
- `true_wins` — correct answers that were not guided
- `error_rate` — `errors / total_attempts`
- `error_rate_for_module(module)` — error rate for a specific module type. Note: SIMILAR includes SCAFFOLD attempts (critical for diagnosis to work)
- `confused_pairs()` — list of (target, selected) tuples for wrong answers

### `LevelConfig`

The output returned to the frontend after analysis.

```python
@dataclass
class LevelConfig:
    user_id:           str
    target_alphabet:   str
    cognitive_state:   CognitiveState

    # Determined by STATE_RULES (deterministic)
    distractor_similarity: DistractorSimilarity
    visual_aid_intensity:  VisualAidIntensity
    input_mode:            InputMode

    # LLM-personalised
    distractor_pool:         list[str]
    feature_to_highlight:    str     # empty string if no specific feature
    scaffold_intensity:      float   # 0.0–1.0

    # Timing (calibrated to child's latency baseline)
    hesitation_trigger_stage1_ms: float
    hesitation_trigger_stage2_ms: float

    # Metadata
    phonological_note: str   # always "" (removed from LLM output)
    provider_used:     str   # "vertex_ai" | "gemini_api" | "fallback"
    reasoning:         str   # plain-English explanation for teachers
```

---

## `IP/agents/diagnosis_agent.py` — Diagnosis Agent

**Path:** `backend/IP/agents/diagnosis_agent.py`

A single-method class that classifies cognitive state from session data.

### Constants
```python
ERROR_THRESHOLD_FAIL    = 0.30   # >30% error → struggling
ERROR_THRESHOLD_MASTERY = 0.10   # <10% error → mastered
```

### `DiagnosisAgent.diagnose(session: SessionPayload) → tuple[CognitiveState, str]`

Returns `(state, reasoning_string)`. The reasoning string is included in the LevelConfig and stored in `learning_sessions` for teacher transparency.

**Algorithm:**
1. Compute `dissimilar_err = session.error_rate_for_module(DISSIMILAR)`
2. Compute `similar_err = session.error_rate_for_module(SIMILAR)` (includes SCAFFOLD)
3. If both are None → `INSUFFICIENT_DATA`
4. If `dissimilar_err > 0.30` → `GROSS_SHAPE_BLINDNESS`
5. If `dissimilar_err` between 0.10–0.30 → `GROSS_SHAPE_BLINDNESS` (in-progress)
6. If `dissimilar_err < 0.10` and no similar data → `FEATURE_NEGLECT` (advance)
7. If `similar_err > 0.30` → `FEATURE_NEGLECT`
8. If `similar_err < 0.10` → `VISUAL_MASTERY`
9. If `similar_err` 0.10–0.30 → `FEATURE_NEGLECT` (in-progress)

---

## `IP/agents/level_generator.py` — Level Generator

**Path:** `backend/IP/agents/level_generator.py`

The LLM-powered personalisation agent.

### `LevelGeneratorAgent.generate(session, state, reasoning, user_history, session_number) → LevelConfig`

**Steps:**
1. Look up `STATE_RULES[state]` for deterministic base parameters
2. Calculate hesitation timers: `stage1 = avg_latency + 8000`, `stage2 = avg_latency + 13000`
3. Call `_call_llm()` to personalise distractor pool and feature highlight
4. Call `_compute_scaffold()` for deterministic scaffold intensity
5. Assemble and return `LevelConfig`

### `_compute_scaffold(state, session) → float`
```
GROSS_SHAPE_BLINDNESS: 0.70 + (error_rate × 0.40), clamped to [0.70, 1.0]
FEATURE_NEGLECT:       0.35 + (error_rate × 0.50), clamped to [0.35, 0.65]
VISUAL_MASTERY:        0.0
INSUFFICIENT_DATA:     0.55 (fixed)
```

### `_call_llm(session, state, reasoning, user_history, session_number)`
1. Builds user prompt via `prompts.build_user_prompt()`
2. Calls `LLMProviderRouter.complete(system_prompt, user_prompt)`
3. If fallback provider → returns `_hard_fallback()`
4. Parses JSON response
5. Validates: pool must be ≥2 letters and not include target
6. Returns `(parsed_dict, provider_type)`

### `_fallback_distractors(target, state) → list[str]`
Two-pool hard-coded fallback per letter:
```python
FALLBACK_DISTRACTORS = {
    "म": {"easy": ["ल", "ह", "स", "र"], "hard": ["भ", "ध", "न", "ब"]},
    "ग": {"easy": ["ल", "ह", "स", "र"], "hard": ["घ", "ध", "ज", "ञ"]},
    "घ": {"easy": ["ल", "ह", "स", "र"], "hard": ["ग", "ध", "ज", "ञ"]},
    "ध": {"easy": ["ल", "ह", "स", "र"], "hard": ["घ", "ग", "ज", "ञ"]},
    "ब": {"easy": ["ल", "ह", "स", "र"], "hard": ["व", "भ", "ध", "ण"]},
}
```
Hard pool used for FEATURE_NEGLECT and VISUAL_MASTERY. Easy pool for GROSS_SHAPE_BLINDNESS and INSUFFICIENT_DATA.

---

## `IP/agents/llm_provider.py` — LLM Abstraction

**Path:** `backend/IP/agents/llm_provider.py`

### Provider Priority Chain

```python
LLMProviderRouter([
    GeminiAPIProvider("gemini-3.1-flash-lite-preview"),  # preferred: latest
    GeminiAPIProvider("gemini-2.5-flash-lite"),           # fallback 1
    GeminiAPIProvider("gemini-2.0-flash"),                # fallback 2
])
```

VertexAI provider exists but only activates if `GOOGLE_CLOUD_PROJECT` is set. For development, the Gemini API free tier is used.

### `LLMProviderRouter.complete(system_prompt, user_prompt) → LLMResponse`
- Iterates providers in order
- Calls `provider.complete()`, catches all exceptions
- Returns first success as `LLMResponse(text, ProviderType.GEMINI_API)`
- Returns `LLMResponse("", ProviderType.FALLBACK)` if all fail

### Model Configuration
- **Temperature:** 0.2 (low = consistent, structured JSON output)
- **Max output tokens:** 512 (distractor JSON is small)
- **Response MIME type:** `"application/json"` (forces valid JSON output from the model)

---

## `IP/agents/prompts.py` — Prompt Templates

**Path:** `backend/IP/agents/prompts.py`

### `SYSTEM_PROMPT`
A comprehensive system-level instruction that includes:
- Full Devanagari consonant set
- HIGH confusion pairs for all 5 learning letters
- LOW confusion distractor list
- Feature-to-highlight key mapping (16 feature positions)
- 5 dyslexia-specific principles
- Strict JSON-only output instruction

The system prompt is sent with every LLM call. It is long (80+ lines) but this is necessary — the LLM must understand Devanagari orthography, confusion patterns, and the exact feature-key vocabulary used by the frontend.

### `build_user_prompt(...) → str`
Constructs the per-session user message containing:
- Target letter and session number
- Current cognitive state and diagnosis reasoning
- Performance metrics (error rate, latency, confused pairs, jitter count)
- Last 5 sessions of history (formatted for LLM)
- Explicit distractor tier instruction based on cognitive state
- JSON output format specification

---

## `IP/routes/analyze.py` — Analysis Endpoint

**Path:** `backend/IP/routes/analyze.py`

### `POST /analyze_session`

**Request body:**
```json
{
  "user_id": "uuid",
  "target_alphabet": "म",
  "session_id": "sess_123",
  "session_number": 1,
  "attempts": [/* QuestionAttempt objects */],
  "avg_latency_ms": 5400,
  "consecutive_fails_peak": 1
}
```

**Headers:** `Authorization: Bearer <supabase_jwt>` (optional but required for persistence)

**Required fields:** `user_id`, `target_alphabet`, `session_id`

**Processing order:**
1. Parse and validate request JSON
2. `_get_db()` — lazy import DB functions (handles missing Supabase gracefully)
3. Verify JWT from `Authorization` header
4. `_parse_payload()` — build `SessionPayload` dataclass
5. `load_user_history()` — fetch letter-specific history for LLM
6. `diagnosis_agent.diagnose(session)` — classify cognitive state
7. Cross-letter carry-forward logic (if INSUFFICIENT_DATA + prior history)
8. `level_agent.generate(session, state, reasoning, user_history)` — build LevelConfig
9. `save_session()` — persist to Supabase (if authenticated)
10. Serialise `LevelConfig` to dict, convert enums to `.value` strings
11. Return response JSON

**`_NEW_LETTER_STATE_CAP`:**
```python
_NEW_LETTER_STATE_CAP = {
    CognitiveState.VISUAL_MASTERY: CognitiveState.FEATURE_NEGLECT,
}
```
When a new letter starts with INSUFFICIENT_DATA, the prior state is carried forward, but VISUAL_MASTERY is downgraded to FEATURE_NEGLECT (see Architecture section).

---

## `IP/routes/progress.py` — Progress Report Endpoint

**Path:** `backend/IP/routes/progress.py`

### `GET /progress_report`

**Headers:** `Authorization: Bearer <supabase_jwt>` (required)

**Processing order:**
1. Verify JWT
2. `load_all_sessions()` — all user sessions across all letters
3. `load_letter_progress()` — mastery status per letter
4. Early return if no data found (`empty: true` response)
5. Load `display_name` from `user_profiles`
6. `_build_letter_stats()` — aggregate per-letter metrics
7. `_call_llm()` — generate AI insights via Gemini
8. `_hard_fallback()` if LLM fails
9. Return structured report

### `_build_letter_stats(sessions, progress) → dict`
Per letter:
- Session count
- Mastery status (from `letter_progress.mastered`)
- Last cognitive state
- Average error rate across all sessions
- **Trend detection**: compares first-half vs. second-half error rates
  - Improving: recent avg < early avg − 5%
  - Needs attention: recent avg > early avg + 5%
  - Stable: otherwise
- Top 3 confused letter pairs (from all sessions combined, Counter-based)

### Progress LLM System Prompt
Different from the level generation prompt. Asks for parent/teacher-facing insights:
- `overall_message`: 2-3 sentence journey summary
- `encouragement`: short message directed at child ("you")
- `strengths`: 2-3 specific positives
- `focus_areas`: 1-2 actionable suggestions
- `letter_insights`: per-letter sentence

Deliberately avoids clinical language ("dyslexia", "disorder", "deficit").
