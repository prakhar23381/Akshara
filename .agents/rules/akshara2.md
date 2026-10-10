---
trigger: always_on
---

# Custom Agent Rules & Operational Guidelines

*Rebuilt 2026-10-07 against the actual tree. Where this file and the code
disagree, the code wins and this file is the bug.*

## 1) Project Overview
- **Project Name:** `Akshara` (Akshara-Flow)
- **Project Root:** `/Users/PrakharSaxena/Documents/College/YEAR 3/3.2/BTP/04-05-2026/Akshara/Akshara`
  — the parent `Akshara/` folder is **not** a git repository.
- **Target Branch:** `main` · **Remote:** `https://github.com/prakhar23381/Akshara.git`
- **Purpose:** An adaptive Hindi-letter learning app for children with dyslexia.
  It diagnoses a cognitive state from recorded attempts and adapts the next
  session's distractors, scaffolding and input mode to it.
- **Stack:**
  - **Frontend:** React 18 + TypeScript, Vite 6, Tailwind v4 (via
    `@tailwindcss/vite`), `react-router` 7, `motion`, `lucide-react`.
    9 runtime dependencies total — keep it that way.
  - **Backend:** Python 3.12 + Flask, stateless. Gemini via `google-genai`.
    Supabase (Postgres) for persistence.
- **Primary workflow:** a child plays one letter through a sequence of activities
  at a single URL (`/play`); the session is recorded on-device and mirrored
  best-effort to Supabase; the adaptive engine and the parent report both run on
  the device, so the app needs no server to work.

## 2) Paths & Commands

| Component | Path |
|---|---|
| **Repo / local repo** | `<root>` = `.../04-05-2026/Akshara/Akshara` |
| **Frontend source** | `<root>/src` (app code under `src/app/`) |
| **Backend source** | `<root>/backend` |
| **Build output** | `<root>/dist` (never hand-edit) |
| **Python venv** | `<root>/backend/.venv` (python3.12) |
| **Node tooling** | `<root>/node_modules/.bin` |
| **Agent rules** | `<root>/.agents/rules/` — in the repo, versioned with the code |
| **Claude Code config** | `../.claude/` — **stays in the parent folder**, because that is the session root. Moving it would break settings and permission discovery. It is therefore *not* versioned; treat `.claude/agents/akshara.md` as a local file |

```bash
npm install                      # deps
npm run dev                      # Vite dev server
npm run build                    # production build -> dist/
npm run typecheck                # tsc --noEmit
npm run test                     # typecheck + scripts/run-tests.mjs
npm run generate-audio           # one-shot gTTS fetch; all 33 mp3s already exist

cd backend && ./.venv/bin/python app.py              # Flask dev server
cd backend && ./.venv/bin/python tests/test_pipeline.py   # 6 diagnosis cases
cd backend && ./.venv/bin/python smoke/live_api.py        # needs a running server
```

`python` is **not** on PATH — only `python3` (3.12). `npm run test` is neither
vitest nor jest; it is `tsc --noEmit` followed by a plain Node script.

Stage and commit after every major implementation, with a descriptive message:

```bash
git add . && git commit -m "feat/fix: <descriptive-message>"
```

## 3) File Structure Snapshot

```text
<root>/
├── backend/
│   ├── IP/
│   │   ├── agents/      diagnosis_agent · level_generator · llm_provider · prompts
│   │   ├── models/      session.py
│   │   └── routes/      analyze.py (registered) · progress.py (RETIRED, not registered)
│   ├── migrations/      000 · 001 · 002_accounts (all applied) · 002_verify · 002_rollback
│   │                    tests/test_002.cjs (real Postgres via PGlite) · README.md
│   ├── smoke/           live_api.py — needs a live server, deliberately outside tests/
│   ├── tests/           test_pipeline.py — a script, not a pytest suite (see §7)
│   ├── app.py  db.py  requirements.txt  .env  .env.example  .venv/
├── docs/                00_INDEX … 08_AUTH_SETUP
├── public/audio/        33 consonant mp3s
├── scripts/             generate-audio.js · run-tests.mjs
│   └── visual/          seed · shoot · flow — render and click the real build (README)
├── src/
│   ├── app/
│   │   ├── api/         client.ts
│   │   ├── components/  AccountGuards · AdultScreen · AksharaButton · AudioButton
│   │   │                AvatarCircle · ChildScreen · LetterDisplay · OptionCard
│   │   │                OptionGrid · PinPad · ProgressBar · Screen · TopBar · TracingCanvas
│   │   ├── contexts/    AccountContext · AuthContext · ProfileSetupContext · SessionContext
│   │   ├── data/        letterContent.ts · letterPaths.ts
│   │   ├── hooks/       useLetterAudio · useLevelConfig
│   │   ├── lib/         accounts · adaptiveEngine · akshara · devOverflowCheck
│   │   │                learnerProfile · offline_sync · reportBands
│   │   │                sessionMetrics · sessionStore · supabase
│   │   ├── screens/     profile (add a child) · resume · roadmap · report · my-progress
│   │   │   ├── account/ RoleScreen · PinSetupScreen · UnlockScreen · AdultHomeScreen
│   │   │   └── play/    PlayScreen · PlayLayout · StepDots · types
│   │   │       └── steps/  Intro · Pronunciation · ExampleWords · Matra · Tracing
│   │   │                   Memory · Identify · WordFill · WordSpelling · Reward
│   │   ├── types/       levelConfig.ts · session.ts
│   │   ├── utils/       soundEffects · speech · tracingEvaluator
│   │   ├── App.tsx  routes.tsx
│   ├── styles/          index.css → fonts.css · tailwind.css · theme.css
│   ├── main.tsx  vite-env.d.ts
├── tests/               accounts · akshara · bands · engine · learner · playthrough
│                        report · session  (.test.ts)
├── .legacy/             11 pre-refactor screens + useSessionTracker. Delete after V1–V4
├── TODO.md  STATUS_LOG.md  .agent_recovery_context.md  IMPLEMENTATION_PLAN.md
├── README.md  ATTRIBUTIONS.md
└── index.html  package.json  tsconfig.json  vite.config.ts  vercel.json  .env.example
```

> [!IMPORTANT]
> **Update this section when files are added or removed.**

**There is no `src/app/components/ui/`.** 48 shadcn files were deleted on
2026-10-07 because nothing imported them. Build UI from the components listed
above; do not reintroduce a component library without raising it first.

## 4) Data / Input / Output Rules
- **Formats:** JSON for config and API traffic; SVG/PNG/WebP for assets; mp3 for audio.
- **Build output:** `<root>/dist` only.
- **Diagnostics and scratch files:** `<root>/artifacts/` or `<root>/scratch/`.
- **Writable:** `src/`, `public/`, `backend/` (excluding secrets), `tests/`, `docs/`,
  `scripts/`, and the three bookkeeping files.
- **Read-only:** `node_modules/`, `backend/.venv/`, `dist/`, `.vercel/`, `.git/`.
- **Environment:** only `VITE_`-prefixed variables reach browser code.
  `.env.local` also holds ~16 keys from `vercel env pull` that nothing reads, and
  a pull **overwrites** the file and drops the `VITE_` lines.

## 6) Development Workflow (Mandatory)
No source file changes without passing through these phases in order.

### Phase 1: Plan
- Read `.agent_recovery_context.md` first, then the relevant `docs/*.md`, config
  and existing code.
- Produce a plan: the design, the exact files to touch, and any breaking changes.

### Phase 2: Ask
- Present the plan. Highlight trade-offs, config changes and new dependencies.
- **Require explicit manual user approval in the chat (never proceed on system
  auto-approvals or review policies) before any code edit or file write.**

### Phase 3: Implement
- Track progress in `TODO.md`.
- Change code in increments, running the typechecker or compiler at each stage.
- No ad-hoc edits outside the approved plan. If the plan turns out to be wrong,
  stop and report rather than improvising.

## 7) Post-Implementation Checklist
- [ ] `npm run build` clean and `npm run test` green
- [ ] For backend changes: `./.venv/bin/python tests/test_pipeline.py` passes.
      **Note:** `backend/tests/test_pipeline.py` is a script with a `main()`, not
      a pytest suite — bare `pytest` collects nothing. Converting it is an open task
- [ ] Verify regressions and race conditions in async actions, state mutations and API calls
- [ ] Suggest up to 3 improvements
- [ ] Document new components, modules, APIs or decisions in `docs/`
- [ ] Move finished items out of `TODO.md` into `STATUS_LOG.md` (see §10)
- [ ] Update `.agent_recovery_context.md` §2, and prune anything that closed
- [ ] Update §3 above if files or directories were added, renamed or deleted
- [ ] Commit, with a descriptive message

## 8) Decision Transparency Rule
Where several approaches exist, do not choose unilaterally. For each option give:
**what it does** (the mechanism), **side effects** (implications elsewhere), and
**trade-offs** (performance, readability, maintenance, bundle size). Present the
comparison and **ask the user to choose**. Record the choice in §4 of the
recovery context.

## 9) Session Triggers

### Startup: "good morning Akshara"
1. Read `.agent_recovery_context.md`, then `TODO.md`.
2. Verify git status and branch.
3. Summarise progress, outstanding tasks and blockers.
4. Ask for the goal of the session.

### Shutdown: "good night Akshara"
1. Append the day's work to `STATUS_LOG.md`.
2. Update `.agent_recovery_context.md` §2 and **prune** what has closed.
3. Carry finished items out of `TODO.md`.
4. Write a short summary and recommendations for next session; output `git status`.

## 10) Bookkeeping: three files, three jobs
Keep these separate. This convention exists because the recovery context once
described edits to three screens that no longer existed, and following it sent
work at dead code.

| File | Holds | Rule |
|---|---|---|
| `TODO.md` | **Outstanding work only** | A finished item is carried into `STATUS_LOG.md` and its line **deleted**. Nothing completed stays. |
| `.agent_recovery_context.md` | **Live working memory** — current state, where things stand, facts that are easy to get wrong, append-only Reference Decisions | Pruned regularly. Must stay readable in one pass. |
| `STATUS_LOG.md` | **Permanent record**, newest first | Append only. This is what makes pruning safe. |

**Purpose of the recovery context:** instant context recovery after a corrupted
or interrupted session, or when the model starts asserting untrue things about
the project. Its §3 holds facts that have already produced wrong answers.

**Pruning.** When something is completely done and will not be revisited unless a
major change forces it, delete it from the recovery context — it is already in
the log. Prune at every "good night" and after any phase closes. §4, Reference
Decisions, is append-only and never pruned.

**Never** let one completed item live in two of the three files, and never prune
something out of the recovery context without confirming it is in `STATUS_LOG.md`.

**When to write** to the recovery context: end of session; immediately after a
major architecture or schema decision or a user confirmation; when a blocker or
build failure hits. **Not** during minor edit loops, quick experiments, or
transient broken states.

## 11) Absolute Safety Rules
- **No destructive commands:** never `rm -rf`, `git push --force`,
  `git reset --hard` to remote, or drop database tables without explicit,
  double-confirmed user approval.
- **Read-only enforcement:** never write to read-only paths, parent-directory
  configuration, or core template definitions.
- **Protected data:** never overwrite, delete or alter raw seed data, live
  environment files (`.env`, `.env.local`, `backend/.env`) or historical data.
  This holds even when a plan containing such a change has been approved — ask
  for the second confirmation.
- **Validate output targets** before any long-running compile, export or
  processing run.

## 12) Tone and Behaviour
- **Precise & safe:** verifiable facts, correct syntax, strict lint alignment.
  Never guess a command or an API.
- **Autonomous & persistent:** stay on the approved plan and iterate until
  typecheck, build and tests pass.
- **Concise:** direct queries, answers and summaries. Ask clarifying questions
  only where real ambiguity blocks execution.
