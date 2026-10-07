# Akshara-Flow — Frontend Reference

*Rewritten 2026-10-07 against the code. The previous version documented "all 15
screens", eleven of which no longer exist — they were replaced by the step
machine at `/play` and the merged `/report`, and now live in `.legacy/`. Every
file below was verified present.*

Architecture and the reasoning behind the step machine: [02_ARCHITECTURE.md](02_ARCHITECTURE.md).

## Layout

```
src/
├── main.tsx            entry — mounts <App/>, imports styles, arms the overflow guard in DEV
├── vite-env.d.ts
├── styles/             index.css → fonts.css · tailwind.css · theme.css
└── app/
    ├── App.tsx         provider tree + the auth gate
    ├── routes.tsx      the router (15 entries, ONE activity URL)
    ├── api/            client.ts
    ├── components/     11 presentational primitives
    ├── contexts/       Auth · ProfileSetup · Session
    ├── data/           letterContent.ts · letterPaths.ts
    ├── hooks/          useLetterAudio · useLevelConfig
    ├── lib/            adaptiveEngine · sessionStore · sessionMetrics · supabase
    │                   offline_sync · devOverflowCheck
    ├── screens/        12 screens + play/
    │   └── play/       PlayScreen · PlayLayout · StepDots · types · steps/
    ├── types/          levelConfig.ts · session.ts
    └── utils/          speech · soundEffects · tracingEvaluator
```

There is **no `components/ui/`**. 48 unimported shadcn files were deleted on
2026-10-07; build from the primitives below.

---

## Entry and shell

### `main.tsx` (14 lines)
Mounts `<App/>` into `#root`, imports `styles/index.css`, and in DEV only
dynamically imports `lib/devOverflowCheck` to arm the layout guard. The app is a
fixed-viewport experience, so anything that overflows is treated as a bug.

### `app/App.tsx` (51 lines)
The provider tree and the auth gate. Order, outermost first:
`AuthProvider → ProfileSetupProvider → SessionProvider → LevelConfigProvider → RouterProvider`.
While `useAuth().loading` is true it renders a three-dot bounce; with no `user`
it renders `LoginScreen` instead of the router.

### `app/routes.tsx` (54 lines)
15 entries. Onboarding (`/welcome` … `/assessment`), home (`/resume`,
`/roadmap`), **`/play`** for the whole activity sequence, `/my-progress` and
`/report`, redirects from `/progress` and `/parent-dashboard` to `/report`, and
`*` → `/roadmap` so the nine retired activity URLs resolve somewhere sensible.

---

## Contexts

### `contexts/AuthContext.tsx` (191 lines)
Supabase session, `user`, login/logout, and `signInWithGoogle`. Two failure modes
it handles explicitly, both of which used to strand a child:
`signInWithOAuth` reports a disabled provider or an unlisted redirect URL by
*returning* `{ error }` rather than throwing, so a plain try/catch never fires;
and a prior guest session must be cleared first, because the guest mock's
`signInWithOAuth` is a silent no-op.
Exports `AuthProvider`, `useAuth()`.

### `contexts/SessionContext.tsx` (283 lines)
The live `LearningSession`. This replaced `useSessionTracker`, whose state lived
in a module-level `Map` that a refresh destroyed.

| Member | Purpose |
|---|---|
| `session` | the current `LearningSession` or `null` |
| `currentStep` | first activity with no `completed_at` |
| `progressPct` | completed steps ÷ total steps |
| `startSession({userId, letter, sessionNumber, levelConfig})` | mints `session_id` **at the start**; snapshots the config |
| `beginActivity(type)` | opens an activity |
| `completeActivity(type, outcome?)` | closes it with its outcome |
| `recordAttempt(type, attempt)` | one question attempt, recorded live |
| `endSession()` | → `{ letterMastered, nextConfig }`; computes metrics and diagnoses |
| `abandonSession()` | marks `abandoned` |

Also holds `peakConsecutiveFails()`, used by the scaffold logic.
Exports `SessionProvider`, `useSession()`.

### `contexts/ProfileSetupContext.tsx` (31 lines)
Ephemeral onboarding state (name, age, avatar), discarded once the profile is
written. Exports `ProfileSetupProvider`, `useProfileSetup()`.

---

## Hooks

### `hooks/useLevelConfig.tsx` (88 lines)
Current letter, session number and `LevelConfig`. Exports
`LevelConfigProvider`, `useLevelConfig()`.

### `hooks/useLetterAudio.ts` (43 lines)
Resolves and plays a letter's mp3 from `data/letterContent.ts → LETTER_AUDIO`.

---

## Library

### `lib/sessionStore.ts` (190 lines)
Persistence. `localStorage` is the source of truth; Supabase is a best-effort
mirror that can never block or lose a session in progress.

| Export | Purpose |
|---|---|
| `STALE_SESSION_HOURS = 6` | resume window |
| `upsertSession(s)` | write through + mirror `learning_sessions` |
| `loadSession(id)` / `loadAllSessions()` | read back |
| `getActiveSessionId()` / `setActiveSessionId(id)` | the in-progress pointer |
| `sweepStaleSessions(now?)` | `in_progress` older than 6h → `abandoned`; returns the count |

Keys: `akshara_db_learning_sessions`, `akshara_active_session_id`.

### `lib/adaptiveEngine.ts` (429 lines)
The adaptive engine, on the device, mirroring the Python agents:
`diagnose()`, `carryForward()`, `analyzeLocally()`, `overallErrorRate()`,
`DISTRACTOR_POOLS`, `FEATURE_BY_LETTER`, `NEW_LETTER_STATE_CAP`.
`tests/engine.test.ts` pins it to `backend/tests/test_pipeline.py`.

### `lib/sessionMetrics.ts` (114 lines)
`computeSessionMetrics()` → `SessionMetrics` / `ModuleBreakdown`. Computed when a
session closes, stored on the row, so the report never recomputes from scratch.

### `lib/supabase.ts` (251 lines)
`isSupabaseConfigured` plus a **Proxy** around the real client. When no
credentials are present, or in guest mode, the proxy routes calls to a local
mock backed by `localStorage`, which is what lets guest play work offline. The
proxy is why a guest session must be explicitly cleared before a real sign-in.

### `lib/offline_sync.ts` (83 lines)
`getOfflineQueue()`, `saveOfflineQueue()`, `queueOfflineSession()` — replayed by
`api/client.ts` when connectivity returns.

### `lib/devOverflowCheck.ts` (82 lines)
`findOverflow()`, `reportOverflow()`, `startOverflowCheck()`. DEV-only layout
assertion, also exposed as `window.__aksharaOverflow()` for checking on a real
device.

---

## API client

### `api/client.ts` (726 lines)
| Export | Purpose |
|---|---|
| `analyzeSession(payload)` | attaches `prior_cognitive_state` itself, calls the backend, falls back to `analyzeLocally()` |
| `buildProgressReport()` | assembles the whole parent report **on the device** from stored sessions |
| `fetchProgressReport()` | the report accessor used by screens |
| `checkHealth()` | backend liveness |
| `FALLBACK_LEVEL_CONFIG` | the static config used when nothing else is available |
| `ProgressReport`, `SessionSummary`, `LetterStat`, `ModuleBreakdown` | report types |

Private helpers worth knowing: `getAuthHeaders()`, `readPriorCognitiveState()`,
`readLastPool()` / `writeLastPool()`, `makeFallbackResponse()`.

---

## Types

### `types/levelConfig.ts` (134 lines)
`LevelConfig`, `QuestionAttempt`, `SessionPayload`, `AnalyzeSessionResponse`,
`CognitiveState`, `ModuleType`, `DistractorSimilarity`, `VisualAidIntensity`,
`InputMode`, `LETTER_SEQUENCE` (33 consonants) and
`FEATURE_HIGHLIGHT_POSITIONS`.

### `types/session.ts` (126 lines)
`LearningSession` (`schema_version: 2`), `ActivityType`, `ActivityRecord`,
`ActivityOutcome`, `SessionStatus`, `ASSESSED_ACTIVITIES`, and the derivations
the step machine runs on: `buildStepOrder()`, `nextStep()`, `isComplete()`,
`activityOf()`, `sessionAttempts()`, `sessionProgressPct()`,
`sessionDurationMs()`.

---

## The step machine

### `screens/play/PlayScreen.tsx` (78 lines)
Renders one step at a time. It does not know the order — it reads
`currentStep` from the session. Boot on `/play` with a live session resumes;
with none, redirects to `/roadmap`. Back or close → confirm → `abandonSession()`.

### `screens/play/PlayLayout.tsx` (53 lines)
Wraps each step in `ChildScreen` with the `TopBar` and the step dots, so stage
progress is derived from `STEP_ORDER` rather than hardcoded per screen.

### `screens/play/StepDots.tsx` (26 lines) · `types.ts` (14 lines)
The per-question dots, and `StepProps` — `{ letter, levelConfig, onComplete }`.
Every step has that same shape and none knows what follows it.

### `screens/play/steps/`

| Step | Lines | Kind | Records |
|---|---|---|---|
| `IntroStep` | 41 | passive | `dwell_ms`; autoplays the letter and offers a replay control |
| `PronunciationStep` | 69 | passive | `dwell_ms` |
| `ExampleWordsStep` | 63 | passive | `dwell_ms` |
| `TracingStep` | 55 | skill | `score`, `passed`, `tries`, `model` — only when `input_mode === "trace"` |
| `MemoryStep` | 167 | skill | `moves`, `pairs`, `duration_ms`; distractors from the child's own `confused_with` history |
| `IdentifyStep` | 252 | assessed | `QuestionAttempt[]`; hesitation timers, scaffold nudge |
| `WordFillStep` | 127 | assessed | `QuestionAttempt[]` |
| `WordSpellingStep` | 123 | assessed | `QuestionAttempt[]` |
| `RewardStep` | 169 | — | closes the session; confetti, mastery choice |

`steps/wordQuestions.ts` (96 lines) builds the word activities:
`QUESTIONS_PER_ROUND = 3`, `distractorsFor()`, `shuffle()`,
`buildFillQuestions()`, `buildSpellingQuestions()`.

---

## Screens

| Screen | Lines | Role |
|---|---|---|
| `WelcomeScreen` | 42 | first run |
| `UserTypeScreen` | 155 | child / parent branch |
| `ProfileNameScreen` · `ProfileAgeScreen` · `ProfileAvatarScreen` | 39 · 43 · 82 | onboarding; writes `user_profiles` |
| `AssessmentScreen` | 64 | the initial probe; its speaker now actually plays क |
| `LoginScreen` | 132 | Google OAuth and guest entry |
| `HomeRedirect` | 49 | routes `/` by profile and session state |
| `ResumeScreen` | 131 | resume or start fresh |
| `LetterRoadmapScreen` | 346 | all 33 consonants, 4 paged pages, ≥75% unlock threshold |
| `ChildProgressScreen` | 136 | the child's own view — effort and letters earned, never an error rate |
| `ReportScreen` | 741 | the adult report: Overview · Sessions · Letters, behind the parent math gate |

`/report` is the merge of `ParentDashboardScreen` (480 lines) and
`ProgressScreen` (419), which were two overlapping adult reports.

---

## Components

| Component | Lines | Notes |
|---|---|---|
| `ChildScreen` | 69 | three fixed slots: fluid header · `flex-1 min-h-0` body that never scrolls · one footer CTA always in the same place |
| `Screen` / `ScreenBody` | 65 | the adult-screen equivalent, used by `ReportScreen` and `ChildProgressScreen` |
| `TopBar` | 78 | **the header rule, written down in this file:** if a child is on it and it is not onboarding, it gets a `TopBar`. Has a `title` slot and an optional avatar |
| `AksharaButton` | 70 | the one CTA. Previously `px-16 py-6` with no `max-width`, which is why every CTA was enormous on a phone |
| `OptionGrid<T>` | 71 | columns derived from option count, tiles sized from the available box. Replaced four separate implementations |
| `OptionCard` | 43 | one tappable option |
| `AudioButton` | 57 | **the one audio control.** There were six, two of them broken. `Volume2` now appears in exactly one file |
| `LetterDisplay` | 30 | the glyph, optionally animated |
| `ProgressBar` | 30 | derived progress |
| `AvatarCircle` | 29 | the child's avatar |
| `TracingCanvas` | 448 | 500×500 interaction surface mapped back to 400×400 source space, no guide dots, path sampled at spacing 10 |

---

## Data and utilities

| File | Lines | Holds |
|---|---|---|
| `data/letterContent.ts` | 384 | `LETTER_CONTENT`, `LETTER_AUDIO`, `getLetterContent()`, `getLetterAudio()` — example words and audio per letter |
| `data/letterPaths.ts` | 180 | `LETTER_STROKES`: stroke geometry for tracing |
| `utils/tracingEvaluator.ts` | 200 | `evaluateDrawing()`, `evaluateEasyModel()`, `evaluateStrictModel()`, `ACTIVE_TRACING_MODEL = "easy"`. Grid-based Jaccard similarity, so drawing the wrong character or scribbling cannot pass |
| `utils/speech.ts` | 73 | `speakHindi()`, `stopSpeech()` — Web Speech Synthesis |
| `utils/soundEffects.ts` | 108 | `playSuccessSound()`, `playErrorSound()`, `playEncouragementSound()` |

## Styles

`styles/index.css` imports `fonts.css` (Lexend + Noto Sans Devanagari, and the
`--tap-min: 44px` / `--control-h` / `--card-radius` tokens), `tailwind.css`
(Tailwind v4 with `@source '../**/*.{js,ts,jsx,tsx}'` and `tw-animate-css`), and
`theme.css`. `tw-animate-css` is imported **here, not from any TS file** — a
TS-only dependency scan will wrongly call it unused.

## Tests

`tests/*.test.ts`, run by `scripts/run-tests.mjs` via `npm run test` (which runs
`tsc --noEmit` first). 21 checks across `engine`, `playthrough`, `report` and
`session`.
