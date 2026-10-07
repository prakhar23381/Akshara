# Akshara — implementation plan

Planning document. Nothing here is built yet. The running checklist lives in
[TODO.md](TODO.md); this file is the reasoning behind it.

---

## 1. What is actually wrong

Four problems, in dependency order. Each one is caused by the one above it.

### 1.1 There is no session object

A "session" is currently an idea, not a thing. The evidence:

| Fact | Consequence |
|---|---|
| `session_id` is generated inside `useSessionTracker` by `uuidv4()`, lazily, the first time a screen calls the hook — which is **GameScreen, step 6 of 9** | The first five activities happen outside any session |
| It is POSTed to `/analyze_session`, parsed into `SessionPayload` (`analyze.py:55`), and then **never stored** — `learning_sessions` has no `session_id` column | Sessions have no stable identity. Two rows cannot be told apart except by timestamp |
| Tracker state lives in a module-level `Map` keyed `userId::letter::sessionNumber`, and `endLevel()` deletes the entry | A refresh loses it entirely |
| The row is written **once**, at the end, by `RewardScreen:95` | A child who stops before the reward screen leaves no trace. Drop-off is invisible — which is itself clinically interesting data |

### 1.2 Most of the activity data is thrown away

- `TracingScreen.handleComplete(score, success)` uses `success` to enable a
  button and **discards `score`** — the Jaccard accuracy, the stroke count, the
  model used.
- `MemoryGameScreen` keeps `moves` in `useState` and never persists it.
- Animation, Pronunciation and ExampleWords record nothing — not even that they
  were seen, or for how long.

So of eight activities, three are measured and five are invisible.

### 1.3 Nine URLs for one activity, and none of them survive a refresh

`/animation → /pronunciation → /example-words → /tracing → /memory → /game →
/word-fill → /word-spelling → /reward`

Everything that makes those screens coherent — which letter, which level config,
which session — lives in `useLevelConfig`, which is **plain React state with
nothing persisted**. Therefore:

- Refresh on `/game` → `levelConfig` resets to `FALLBACK_LEVEL_CONFIG` (letter
  म) while `letterIndex` resets to 0 (letter क). The child is now practising a
  letter the roadmap does not think they are on.
- Any of the nine URLs can be deep-linked into directly, with no session.
- Browser Back steps *backwards through an assessment*, which should not be
  possible.

### 1.4 Two overlapping adult reports, both wrong in opposite directions

`ParentDashboardScreen` (480 lines) and `ProgressScreen` (419 lines) both claim
to be the report. The dashboard is dense text with no hierarchy; the report is
readable but monochrome and has no per-session view at all. Neither can answer
"what happened in Tuesday's session".

---

## 2. Target architecture

### 2.1 The session is the unit of everything

> **One child · one letter · one continuous play-through = one session, with one
> `session_id`, created before the first activity and closed after the last.**

```ts
type ActivityType =
  | "intro" | "pronunciation" | "example_words"   // passive
  | "tracing" | "memory"                          // skill
  | "identify" | "word_fill" | "word_spelling";   // assessed

interface ActivityRecord {
  type: ActivityType;
  started_at: string;
  completed_at: string | null;
  outcome:
    | { kind: "viewed"; dwell_ms: number }
    | { kind: "tracing"; score: number; passed: boolean; tries: number; model: "easy" | "strict" }
    | { kind: "memory"; moves: number; pairs: number; duration_ms: number }
    | { kind: "questions"; attempts: QuestionAttempt[] };
}

interface LearningSession {
  session_id: string;              // uuid, minted at session start
  user_id: string;
  letter: string;
  session_number: number;
  status: "in_progress" | "completed" | "abandoned";
  started_at: string;
  ended_at: string | null;
  level_config: LevelConfig;       // snapshot of what drove this session
  activities: ActivityRecord[];
  metrics: SessionMetrics | null;  // computed at close
  cognitive_state: string | null;
  reasoning: string | null;
  schema_version: 2;
}
```

`schema_version` lets the report distinguish these from the rows already in
`localStorage`, which it currently has to guess at.

### 2.2 A session manager replaces the tracker

New `src/app/lib/sessionStore.ts` + `src/app/contexts/SessionContext.tsx`:

| API | When | Writes |
|---|---|---|
| `startSession(letter, levelConfig)` | roadmap card click | creates row, `status: in_progress` |
| `beginActivity(type)` / `completeActivity(type, outcome)` | each step | appends/updates `activities[]` |
| `recordAttempt(type, attempt)` | each question | appends to that activity's attempts |
| `endSession()` | after the last activity | diagnose → metrics → `status: completed` → update `letter_progress` |
| `abandonSession()` | exit / timeout | `status: abandoned`, keeps partial data |
| `resumeActiveSession()` | app boot | rehydrate from storage |

**Write-through on every mutation**, to `localStorage` synchronously and to
Supabase best-effort. This is what makes refresh survivable and makes drop-off
measurable. It replaces the module-level `Map` in `useSessionTracker`, which is
deleted.

### 2.3 One route for the whole play-through

```
/play        ← the entire activity sequence, one URL
```

- Step is **derived from session state**, not from the URL: the current step is
  the first activity in `STEP_ORDER` that is not `completed`.
- Boot on `/play` with an active session → resume exactly where it stopped.
- Boot on `/play` with no active session → redirect `/roadmap`.
- Back / close → confirm, then `abandonSession()`.
- `STEP_ORDER` is derived from `levelConfig` (e.g. tracing only when
  `input_mode === "trace"`), so the sequence is data, not hardcoded `navigate()`
  calls scattered across nine files.
- The nine old routes are removed; a catch-all redirects them to `/roadmap` so
  old links do not white-screen.

**This deletes ~9 `navigate()` hops** and the implicit coupling where each
screen must know its successor.

### 2.4 One writer

The client becomes the **single writer** of session rows. The backend becomes
stateless: diagnose + generate level config, nothing else.

Reason: `save_session()` on the backend and `RewardScreen`'s insert currently
both fire when authenticated, producing two rows per session. And with the
backend absent in production, the client is the only writer that always exists.

Follow-on: carry-forward of cognitive state across letters (`analyze.py:114`)
must move client-side into `adaptiveEngine.ts`, reading the latest state from
local `letter_progress`.

---

## 3. Reports

Three audiences. Today two of them share two half-finished screens.

| Audience | Surface | Character |
|---|---|---|
| Child | `/my-progress` | effort + collection, **never** an error rate. Already done |
| Parent / teacher, on screen | `/report` | **concise, colour-demarcated, scannable.** Answers "how is it going" in 10 seconds |
| Parent / teacher, to keep or share | download | the detailed, text-heavy document |

### 3.1 Merge the two adult screens

`ParentDashboardScreen` and `ProgressScreen` collapse into one `/report` with
three segments:

- **Overview** — headline figures, error pattern, confusion pairs
- **Sessions** — *new*: one row per session (date, letter, duration, activities
  completed, accuracy, stage reached, completed/abandoned), expandable to the
  per-activity breakdown. This is the thing that is missing today
- **Letters** — per-letter detail, as now

### 3.2 Colour and hierarchy — with a rule

The current report is deliberately monochrome, which went too far. Colour gets
added as **identity and structure**, never as an unvalidated clinical judgement:

- **Section accents** from the validated categorical palette (blue / orange /
  aqua / violet) to demarcate Overview, Errors, Sessions, Letters.
- **Stage** keeps the status palette (good / warning / serious / muted) with
  icon + label, because a stage is a genuine discrete state.
- **Error magnitude stays single-hue, encoded by bar length.** No red/amber/
  green on error rates — there are no validated cut-off scores in this tool, so
  colouring 30% "red" would assert a threshold we have not established. This
  constraint is the reason the report is defensible to a specialist; keep it.
- Hierarchy via the existing fluid type scale + card weight, not more words.

### 3.3 Download

"Download full report" produces the long-form document: scope and limitations in
full, every session, every letter, every confusion pair, the glossary, and the
threshold disclosure. Implementation: the existing `@media print` path
(print → Save as PDF) is sufficient and needs no new dependency. Revisit only if
a real `.pdf` file is required.

---

## 4. Sequencing

The order matters. Doing layout first would mean doing it twice, because the
session refactor moves every screen into a new shell.

| Phase | What | Why here |
|---|---|---|
| **P1 — Layout primitives** | `ChildScreen`, `AksharaButton`, `OptionGrid`, `TopBar` (TODO.md §1) | Pure components. Independent of routing, needed by every later phase |
| **P2 — Session core** | `LearningSession` type, `sessionStore`, `SessionContext`, write-through persistence. No UI change yet | Everything below depends on it |
| **P3 — Collapse navigation** | `/play` step machine; port the 9 screens into it **using the P1 primitives**; delete old routes | Screens are touched once, not twice |
| **P4 — Capture activity data** | tracing score, memory moves, dwell times, per-activity attempts | Needs P2 to have somewhere to put it |
| **P5 — Reports** | merge to `/report`, add Sessions segment, colour system, download | Needs P4 to have anything to show |
| **P6 — Schema + backend** | migration SQL, remove the double writer, move carry-forward client-side | Last, because it is the least user-visible |

---

## 5. Schema migration

`learning_sessions` gains (all nullable, so existing rows still load):

```sql
ALTER TABLE learning_sessions
  ADD COLUMN IF NOT EXISTS session_id     UUID,
  ADD COLUMN IF NOT EXISTS status         TEXT DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS started_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ended_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS duration_ms    INT,
  ADD COLUMN IF NOT EXISTS activities     JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS metrics        JSONB,
  ADD COLUMN IF NOT EXISTS schema_version INT DEFAULT 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_session_id
  ON learning_sessions(session_id) WHERE session_id IS NOT NULL;
```

`activities` and `metrics` as JSONB rather than a child table: the live store is
`localStorage` (Supabase is currently NXDOMAIN), the shape is read whole and
never queried by field, and it keeps the two stores identical so a future
Supabase restore is a straight import.

**Legacy rows** — written before this, no `session_id`, `schema_version` 1 —
are shown in the Sessions list as "recorded by an earlier version, no detail
available" rather than as rows of dashes.

---

## 6. Risks

| Risk | Mitigation |
|---|---|
| Big-bang refactor breaks the working demo | P1 and P2 add code without changing behaviour. P3 is the only switch-over; do it behind a flag and keep the old routes until it is proven |
| `localStorage` quota with per-attempt data | Cap stored attempts per session; drop raw pointer paths from tracing, keep the score |
| Session left `in_progress` forever (tab closed) | On boot, any `in_progress` session older than N hours → `abandoned` |
| Supabase returning later with a different shape | `schema_version` on every row; write the migration now while the shape is fresh |
| No browser in my environment | I cannot see rendered output. Every phase ends with **you** checking 360×640, 390×844 and tablet. P1 adds a console overflow assertion so regressions are caught mechanically |

---

## 7. Open decisions

Blocking P3 and P5:

1. **Tracing in the sequence.** Currently every session includes tracing.
   Should it appear only when `input_mode === "trace"` (i.e. for
   `gross_shape_blindness`), as `STATE_RULES` implies?
2. **Resume vs restart.** A child returns to an `in_progress` session from
   yesterday — resume mid-sequence, or start fresh and mark the old one
   `abandoned`?
3. **Abandoned sessions in the report.** Include them (drop-off is a real
   signal) or list them separately so they do not dilute accuracy figures?
4. **`/report` access.** It currently sits behind the parent math gate via
   `/user-type`. Keep that for the merged report?
5. **Download format.** Is print → "Save as PDF" acceptable, or do you need a
   generated `.pdf` file (adds a dependency and real work)?
