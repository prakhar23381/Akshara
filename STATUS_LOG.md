# Daily Status Log

Permanent record of completed work. Outstanding work is in [TODO.md](TODO.md);
current state and recovery context in
[.agent_recovery_context.md](.agent_recovery_context.md).

## 2026-10-07  (later)

### Verified
* **Migration `001_session_model.sql` is applied.** Prakhar had already run it;
  the project had been carrying it as "the one live blocker" since the P6 work.
  Checked against the live project `glmouztenswmwohnoarf` with the anon key:
  all nine columns (`session_id`, `status`, `started_at`, `ended_at`,
  `duration_ms`, `activities`, `metrics`, `level_config`, `schema_version`)
  return `200`, and filters on `status` and `schema_version` work.
  A negative control confirmed the method discriminates — a fabricated column
  returns `42703 column ... does not exist`, because PostgREST validates the
  select list *before* RLS is evaluated, which is what makes an anon-key check
  conclusive even though RLS returns `[]`.
* **Not verified:** the two indexes (`idx_sessions_session_id`,
  `idx_sessions_user_started`) and the `started_at` backfill. Both need catalog
  or row access that the anon key does not have. `backend/migrations/README.md`
  now carries the two SQL-editor queries that check them.

### Push attempted and failed; deploy deferred
* `git push origin main` was approved and attempted. It failed: GitHub rejected
  the osxkeychain credential (`Invalid username or token` — password auth has
  not been supported since 2021), `gh` is not installed, and no SSH keys exist
  on the machine. Nothing here can authenticate to GitHub.
* Before attempting it, the 14 commits were scanned for credential material:
  no JWT-, `AIza`-, `sb_secret_`- or Postgres-URL-shaped strings in any tracked
  file, and the live anon key appears in none of them. The only hits were prose,
  placeholders, and warnings about what not to store. `.env.local` and
  `backend/.env` are untracked; both `.env.example` files are tracked.
* Deploying via the Vercel CLI (installed, authenticated) was offered as a way
  around it and declined for now, so production still serves the pre-cleanup
  build. Tracked as D1 and D2.
* **Standing risk:** `origin/main` is 14 commits behind at `6f6da86`, and
  production runs code that is not on GitHub either. This machine is the only
  copy of the P1–P6 refactor and the structure cleanup.

### P7 verified against live services
* **7.4 / 7.5 — done.** `GET /auth/v1/settings` on the live project reports
  enabled providers `['email', 'google']` and `external.google: true`, and
  `/auth/v1/authorize?provider=google` hands off to `accounts.google.com` with a
  real `client_id` ending `.apps.googleusercontent.com`. A Google OAuth client
  exists and its credentials are pasted into Supabase. The "owned by the current
  team" half of 7.4 is not checkable by API.
* **7.6 — not verifiable, and the obvious probe is misleading.** Every
  `redirect_to` is accepted at the authorize step, including a deliberately
  bogus domain. The reason: Google is always handed Supabase's *own*
  `/auth/v1/callback` as `redirect_uri`, and the app-level `redirect_to` travels
  in `state` to be validated when the provider calls back. Confirmed by diffing
  the two authorize redirects — only `redirect_to` and `state` differ. Left as a
  dashboard check, with the failure symptom recorded in TODO.
* **7.7 — done.** `https://akshara-tau.vercel.app` serves a bundle with the live
  Supabase host and anon key inlined, and no reference to the deleted project.
  The vars are set in Vercel and a redeploy has happened.
* **7.9 — key is live, ownership unknown.** `models.list` returns 200 and sees
  `gemini-2.5-flash`. No API reveals which account issued a key, so the question
  7.9 actually asks cannot be answered from here. The 2026-10-06 backup held the
  same key, so it was not rotated during the Supabase repointing.
* **Production is on the pre-cleanup build.** Its assets are byte-identical to
  this session's baseline — `index-DaMLZmhl.js` at 712,890 B and
  `index-BzKSVV-R.css` at 103,889 B, same Vite content hashes. So production
  already runs the P1–P6 refactor, but not the cleanup: deploying it would cut
  production CSS by 64%. Tracked as TODO D1.

### Corrected
The stale "not applied" claim had spread to eight places across six files —
`TODO.md`, `.agent_recovery_context.md`, `.agents/rules/akshara2.md`,
`.claude/agents/akshara.md`, `backend/migrations/README.md`, `docs/00_INDEX.md`,
`docs/02_ARCHITECTURE.md` and `docs/04_BACKEND_REFERENCE.md`. All corrected, and
the README now documents how to re-verify rather than just asserting a state.
The project has **no open blocker**; what remains of P7 is console work.

---

## 2026-10-07

### Changes Completed
* **Full-tree structure diagnosis.** Verified against the tree, not the docs:
  48 unimported files in `src/app/components/ui/`; 51 of 57 runtime dependencies
  reachable only through them (12 imported nowhere at all); two `.bak` files
  duplicating live service-role secrets; three implementations of one audio
  script, with `package.json` pointing at the worst; an empty `ml/` tree;
  an untouched Figma Make `guidelines/` template; a no-op `postcss.config.mjs`;
  a `figmaAssetResolver` resolving into a non-existent `src/assets`; a broken
  231 MB venv outside the repo; and six overlapping bookkeeping files.
* **Bookkeeping convention established.** `TODO.md` rewritten to
  outstanding-work-only; `.agent_recovery_context.md` rebuilt as pruned working
  memory with an anti-hallucination facts section; this log made the permanent
  record. `.claude/agents/akshara.md` updated to enforce the split.
* **Cleanup plan C0–C6 approved** — safety commit, secrets, dead weight, docs,
  bookkeeping, backend hygiene, scripts and agent config.

### Issues Resolved
* `.agent_recovery_context.md` had been actively misleading since 2026-07-05: its
  "Current State" described edits to `GameScreen.tsx`, `TracingScreen.tsx` and
  `RewardScreen.tsx`, three files that no longer exist at those paths. Trusting
  it sent work at dead code. Rebuilt around facts that are easy to get wrong.
* Established that nothing in the project reads 16 of the 18 keys in
  `.env.local`, and that `vercel env pull` overwrites the two that matter.

### Verification
* `tsc --noEmit` — 0 errors. `node scripts/run-tests.mjs` — 21 passed, 0 failed.
* Backend pytest **not run**: the venv's interpreter symlink is dead and `python`
  is not on PATH. Carried as TODO C5.4/C5.6.

### Structure cleanup executed (C0–C6)
7 commits. Gates run at each phase.

* **C0 · Safety point.** The 50-file P1–P6 refactor committed while typecheck was
  clean and tests 21/21, then `.legacy/` committed separately — it was untracked,
  and its 11 screens differ from every committed version because the L1–L8 fixes
  were applied before the move, so git had held no copy of them.
* **C1 · Secrets.** Deleted `.env.local.bak.20261006191017` and
  `backend/.env.bak.20261006191025`. **Correction to the diagnosis:** they were
  not duplicates. Same byte count, but they differ in exactly the keys repointed
  during P7.3, and both reference the deleted Supabase project
  `hlanjunsrwxslfmubpcx` — useless as rollback while still holding a service-role
  key and a Postgres password. `.pytest_cache/` added to `.gitignore`, which had
  covered `__pycache__` but not it.
* **C2 · Dead weight.** Deleted `src/app/components/ui/` (48 files),
  `ImageWithFallback`, `WireframeIndex`, `TransitionScreen`, `guidelines/`,
  `ml/`, `postcss.config.mjs`, and 9 `.DS_Store` files — two of which were being
  copied into `dist/`. `package.json`: 57 dependencies → 9, renamed off
  `@figma/my-make-file`, and the `peerDependencies` / `peerDependenciesMeta` /
  `pnpm.overrides` blocks dropped. `vite.config.ts`: `figmaAssetResolver` removed
  (it resolved into a `src/assets` that does not exist) along with the `.csv`
  entry in `assetsInclude`.
  **Two traps caught by running the gate rather than trusting the scan:**
  `react` and `react-dom` sat in `peerDependencies` marked *optional*, so npm
  never installed them directly — they were arriving as transitive peers of Radix
  and MUI, and pruning those would have broken the build; and `tw-animate-css` is
  imported by `src/styles/tailwind.css`, which a TS-only import scan does not
  see, so removing it failed the build immediately. The prune is therefore 50,
  not 51.
  Result: CSS 103,889 → 37,265 bytes (−64%, because Tailwind generates from
  source scanning and there are 48 fewer files to scan); JS 712,890 → 714,656
  (+0.25%). **That the JS did not drop is the point** — it confirms the dead
  folder was already being tree-shaken, so this removed install weight and
  confusion rather than shipped bytes. `node_modules` 427 MB → 148 MB.
* **C3 · Documentation.** `02_ARCHITECTURE.md` and `05_FRONTEND_REFERENCE.md`
  rewritten against the code; every path named in 05 verified to exist. Two of
  02's stated "invariants" were the exact opposite of current behaviour — that
  session tracking stays in memory until `endLevel()`, and that the frontend
  never writes `learning_sessions`. `04_BACKEND_REFERENCE.md` corrected
  (`save_session` marked DELETED with the three-rows-per-session bug that caused
  it; `db.py` and `/progress_report` marked RETIRED; the `/analyze_session`
  processing order replaced with what the handler does). `00_INDEX.md` endpoint
  table and key-files table corrected. 01 and 03 swept, both flow diagrams
  redrawn around `/play`; 07 needed no change. `docs/archive/` created, with the
  word-level-games plan moved in from outside the repo.
* **C4 · Bookkeeping.** Three files, three jobs, enforced in
  `.claude/agents/akshara.md` and §10 of the rules. Deleted `custom_agent.md`
  (a stale duplicate that diverged on the approval clause) and `task.md`.
* **C5 · Backend.** `supabase_schema.sql` → `migrations/000_init.sql` with a
  `README.md` recording applied state; `tests/test_live_api.py` →
  `smoke/live_api.py`; venv rebuilt at `backend/.venv` on python3.12.
* **C6 · Scripts and rules.** Three gTTS implementations collapsed into
  `scripts/generate-audio.js`; moving it broke its own `__dirname` path, fixed to
  resolve one level up. `.agents/rules/akshara2.md` rebuilt — it had duplicated
  frontmatter, described a vanilla HTML/CSS + Express stack, and sketched a
  `src/{components,pages,services}` layout this project has never used.

### Found during the cleanup, not acted on
* **`backend/db.py` and `IP/routes/progress.py` are a dead island** —
  `progress.py` is unregistered and nothing else imports `db.py`. Marked RETIRED
  in the docs; the delete/move decision is open (TODO B2).
* **`backend/tests/test_pipeline.py` is a script, not a pytest suite.** Bare
  `pytest` collects nothing, so the backend has no automated tests. Run directly
  it passes 6/6 — the first verified backend result in this cleanup (TODO B3).
* **Two pre-existing high-severity advisories:** `react-router` 7.13.0 (12
  advisories; the `<Link>`/`useNavigate` open redirect applies to this SPA) and
  `vite` 6.4.2 (Windows-only). Both fixes are outside the stated ranges, so they
  were kept out of the cleanup commits (TODO B1).
* **A fresh install floated the caret ranges**, taking `@supabase/supabase-js`
  2.105.1 → 2.117.2. Both drifted packages were pinned back so the cleanup
  carries no library upgrade (TODO B4).

### Verification
* `tsc --noEmit` 0 errors · frontend 21/21 · build clean · backend 6/6 as a script.
* **Not run:** V1–V4 device verification. No browser here.
* **Not pushed:** 10 commits on local `main`.

### Confirmed and completed afterwards
* **`.env.local` trimmed** from 18 keys to the two the app reads. The 16 removed
  were `vercel env pull` residue and included `SUPABASE_SERVICE_ROLE_KEY`,
  `SUPABASE_SECRET_KEY`, `POSTGRES_PASSWORD` and `VERCEL_OIDC_TOKEN`. Verified
  afterwards that the live Supabase host still inlines into `dist/` and the
  deleted project `hlanjunsrwxslfmubpcx` appears nowhere in the bundle.
* **`../.venv` deleted** — 231 MB of unusable virtualenv whose interpreter
  symlink pointed at a Homebrew python3.13 that no longer exists. `backend/.venv`
  on python3.12 replaces it.
* **`.agents/` moved into the repo**, so the rules are versioned with the code.
  `.claude/` stays in the parent folder because that is the session root and
  moving it would break settings discovery — which means
  `.claude/agents/akshara.md` is a local, unversioned file. A copy in both places
  was rejected: that is precisely what produced the `custom_agent.md` divergence
  this cleanup removed.

---

## 2026-10-06  (P1–P6, L1–L8, C1–C5, P7.1–7.3)

Three months of work landed as one 50-file change: +1,309 / −3,736 across
50 tracked files plus ~20 new ones. Reasoning in
[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

### P1 · Layout primitives
* `ChildScreen.tsx` — three fixed slots: fluid header, `flex-1 min-h-0` body that
  never scrolls, one footer CTA always in the same place.
* Tokens in `styles/fonts.css`: `--tap-min` (44px), `--control-h`, `--card-radius`.
* `AksharaButton` rewritten — it had `px-16 py-6` (128px of horizontal padding)
  and no `max-width`, which is why every CTA was enormous on a phone.
* `OptionGrid.tsx` — columns derived from option count, tiles sized from the
  available box. Replaced four separate implementations.
* `TopBar` rewritten — it was fixed `px-8 py-6` with a 64px close button and a
  `w-64` progress bar, none of it fluid.
* Console overflow assertion (`lib/devOverflowCheck.ts`) so layout regressions
  are caught mechanically, exposed as `window.__aksharaOverflow()`.

### P2 · Session core
* `types/session.ts` — `LearningSession`, `ActivityRecord`, `ActivityType`,
  `schema_version: 2`.
* `lib/sessionStore.ts` — write-through to `localStorage`, best-effort mirror to
  Supabase. `contexts/SessionContext.tsx` — start/begin/complete/record/end/
  abandon/resume.
* `session_id` now minted at session **start**, not lazily at step 6 of 9.
* Stale-session sweep on boot: `in_progress` older than N hours → `abandoned`.
* Retired the module-level `Map` in `useSessionTracker`.

### P3 · Navigation collapsed to one URL
* `/play` plus a step machine; current step = first incomplete activity in
  `STEP_ORDER`, derived from `levelConfig` rather than hardcoded `navigate()`
  calls across nine files.
* Refresh resilience: booting on `/play` resumes. Fixed the bug where a refresh
  reset to म while the roadmap said क.
* Back/close → confirm → `abandonSession()`.
* The 9 old routes deleted; catch-all → `/roadmap`. The 9 screens plus
  `ProgressScreen` and `ParentDashboardScreen` were **moved** to `.legacy/`, not
  deleted — reachability was checked from `main.tsx` rather than by eye, and all
  11 were unreferenced. Moving keeps the V1–V4 rollback path.

### P4 · Capture what was being discarded
* Tracing persists `score`, `passed`, `tries`, `model` (`handleComplete` had been
  dropping `score`). Memory persists `moves`, `pairs`, `duration_ms`. Passive
  steps record `dwell_ms`, so "seen" is no longer indistinguishable from
  "skipped". All question attempts route through the session.

### P5 · Reports
* `ParentDashboardScreen` (480 lines) + `ProgressScreen` (419) merged into one
  `/report` with Overview · Sessions · Letters segments.
* The Sessions segment — per session: date, letter, duration, activities
  completed, accuracy, stage, completed/abandoned, expandable to per-activity
  detail — did not exist before.
* Section accents from the validated categorical palette; stage keeps the status
  palette with icon+label. Error magnitude stays single-hue by bar length, since
  there are no validated cut-off scores.
* "Download full report" → long-form print document. Legacy rows shown as
  "recorded by an earlier version", not dashes.

### P6 · Schema and backend
* Migration SQL written (`migrations/001_session_model.sql`).
* TypeScript + React types installed; `npm test` now runs `tsc --noEmit` first.
  The codebase had never been type-checked; brought to 0 errors.
* **Double writer removed.** It was worse than one spare row: the client calls
  `/analyze_session` twice per letter (init with 0 attempts, then at the end) and
  *each* call ran an INSERT, so one sitting wrote two session_id-less server rows
  on top of the client's own. `save_session` deleted from `backend/db.py`; the
  client is the single writer.
* `carryForward()` in `adaptiveEngine.ts` with `NEW_LETTER_STATE_CAP` mirroring
  the backend. `analyzeSession()` attaches `prior_cognitive_state` itself, so no
  call site can forget it.
* **Backend made stateless.** `/analyze_session` is a pure function of its body —
  no reads, no writes, no JWT needed to do arithmetic. `/progress_report` is no
  longer registered: the report is built on-device, where every figure stays
  traceable to a recorded attempt. The running app exposes exactly
  `/analyze_session` and `/health`.
* `tests/engine.test.ts` — 24 checks. The 6 diagnosis cases mirror
  `backend/tests/test_pipeline.py`; carry-forward verified identical on both
  sides for all 5 prior states, including that a session *with* attempts ignores
  a stale prior.

### L1–L8 · Child-view layout defects
* **L1 ResumeScreen** — three `size="small"` buttons in a `flex gap-4` with no
  `flex-wrap`, each `px-8` → overflow. Dropped the dead "🏆 Rewards" button.
* **L2 LetterRoadmapScreen** — six defects: a `progress={0}` bar that could never
  move; "⚙️ Parents" at `absolute top-6 right-32` landing on the close button; a
  stray `<Sparkles>` in the `<h1>`; a title wrapping to two lines; a
  `justify-between` pager stranding each arrow against an opposite edge and
  off-centring the dots; a "Not started" label wider than its 70px card.
* **L3 PronunciationScreen** — `w-48` beside `w-64` in a non-wrapping flex =
  448px on a 375px screen.
* **L4 TracingScreen** — board at `min(400px, 58vmin)` ≈ 226px while the CTA was
  enormous; three button rows against one CTA elsewhere; pointer fixed at 32px
  ≈ 14% of the board.
* **L5 WordFillBlankScreen** — four `w-24` tiles plus gaps exceeded 375px, so the
  fourth wrapped alone.
* **L6 WordSpellingScreen** — content exceeded the viewport and `overflow-hidden`
  clipped the fourth option.
* **L7 RewardScreen** — 33 letter circles wrapped to 6 rows in a fixed-height
  `justify-center` box, clipped top *and* bottom. Now shows mastered +
  in-progress + next two.
* **L8 GameScreen nudge dot** — `FEATURE_HIGHLIGHT_POSITIONS` applied with no
  `translate(-50%,-50%)`, so the percentage placed the dot's top-left corner, and
  it was measured against the padded `OptionCard` rather than the glyph.

### C1–C5 · Consistency sweeps
* **C1** Header rule, written down in `TopBar.tsx`: if a child is on it and it is
  not onboarding, it gets a `TopBar`. `ChildProgressScreen` had hand-rolled its
  own header; it uses `TopBar` now via a new `title` slot.
* **C2** CTA wording unified. **C3** Stage progress derived from `STEP_ORDER`
  instead of hardcoded per screen (10/20/30/40/70/80).
* **C4** One audio control, `components/AudioButton.tsx`. There had been six — a
  blue pill, a bare unstyled icon, two `size={16}` icons labelled with a word's
  *meaning*, a "🔊 Listen carefully…" caption that was not tappable at all, and a
  `size={40}` speaker on the assessment that **played nothing**. Two were
  outright broken and both are fixed: `IntroStep` autoplays and now has a replay
  control, and the assessment's speaker actually plays क. `Volume2` now appears
  in exactly one file.
* **C5** Per-question dots made consistent in presence and position.

### P7.1–7.3 · Authentication groundwork
* `signInWithGoogle` surfaces failures. `signInWithOAuth` reports a disabled
  provider or an unlisted redirect URL by *returning* `{ error }` rather than
  throwing, so `LoginScreen`'s try/catch never fired and the child sat on
  "Redirecting…" forever — exactly what a fresh Google project hits before both
  allowlists are right.
* A prior guest session routed `supabase.auth` to the local mock, whose
  `signInWithOAuth` is a silent no-op, so anyone who tapped "Start Learning"
  first could never sign in afterwards. Cleared first now.
* `VITE_SUPABASE_URL` / `VITE_SUPABASE_KEY` repointed at the live project. They
  had pointed at `hlanjunsrwxslfmubpcx`, deleted, using a key that project
  issued — while a key valid for the live project sat in the same file under
  `SUPABASE_PUBLISHABLE_KEY`. Verified: tables exist, RLS is enforced
  (anonymous insert → `42501`, nothing written).

### Outstanding after this day
* `migrations/001_session_model.sql` unapplied — `session_id` does not exist, so
  no session row can be written server-side.
* P7.4–7.9 (Google Cloud console, Supabase provider, Vercel vars, Gemini key).
* V1–V4 device verification: three viewports, full play-through, mid-session
  refresh, mid-session quit.

---

## 2026-07-07
### Changes Completed
* **Aesthetic Reward Screen Redesign:**
  * Added dynamic multi-burst confetti triggers using `canvas-confetti` on level completion.
  * Designed glassmorphic celebration card with interactive animated entry effects, spring physics stars, and custom progress sequences.
* **Premium Progress & Analytics Console:**
  * Implemented dynamic multi-color styling mapped to all consonants.
  * Overhauled the letter selection selector to use interactive, 3D wood-block keycaps featuring hover shifts and bottom borders.
  * Upgraded stats panels, AI summaries, parent tip logs, and focus areas to clean glassmorphic cards.
* **Tracing Screen Viewport-Height Overflow Fix:**
  * Upgraded the main container to `h-screen overflow-hidden` (absolute viewport height containment).
  * Shrunk margins and gap paddings to fit elements within standard mobile heights.
  * Scaled canvas container down to `280px` on small devices, dynamically stepping up to `340px` and `400px` based on screen width.
* **Global Viewport Height Locking & Layout Controls:**
  * Locked both `ProgressScreen` and `ParentDashboardScreen` outer wrappers to `h-screen overflow-hidden flex flex-col`.
  * Embedded nested overflow scrolling (`overflow-y-auto`) exclusively on inner data grids/tables (like the recent session history log frame) so body scrollbars are eliminated and layouts never spill out of standard viewports.
* **Guest Explorer Dashboard Support:**
  * Added a local-sandbox progress report generator (`generateMockProgressReport`) to `client.ts` to compute metrics (mastery rate, latency speed, and confusion pairs) client-side from `localStorage` in Guest/Offline mode.
  * Added a Parents Console shortcut button (`⚙️ Parents`) directly on the `LetterRoadmapScreen` header so logged-in guest users can instantly access the dashboard and math gate.

### Issues Resolved
* Redesigned progress reports, reward screens, and parent dashboard grids to feature state-of-the-art visual styling, glowing gradient overlays, and dynamic micro-animations.
* Resolved layout overflow and scrollbars globally by wrapping pages inside absolute viewport containers (`h-screen`).
* Resolved Parent Dashboard access block for the Guest Explorer account by creating a client-side mock progress report fallback and adding a console access button to the roadmap.

## 2026-07-06
### Changes Completed
* **Tracing Screen Responsive Layout:**
  * Changed the main `TracingScreen` container height from fixed `h-screen` to `min-h-screen` and allowed vertical scrolling via `overflow-y-auto` to prevent the bottom buttons from being cut off.
  * Reduced the default size of the `TracingCanvas` from `500px` to `340px` on mobile/small viewports and `400px` on larger screens.
  * Adapted pointer coordinates using percentage values (`left: pointer.x%`, `top: pointer.y%`) to ensure precise alignment when rendering dynamically.
  * Restructured the buttons panel to wrapped, responsive flex elements.
* **Grid-Based Jaccard Similarity Accuracy Check:**
  * Implemented a $10 \times 10$ grid-mapping system to compare the user's drawing path coordinates to the target template guide dots.
  * Replaced the simple distance checking with a Jaccard Similarity index ($\text{TP} / [\text{TP} + 1.5 \cdot \text{FP} + 1.0 \cdot \text{FN}]$) to accurately penalize wrong strokes (FP) and incomplete traces (FN), preventing cheating (e.g., drawing `ख` on a `ज` board) and scribbling.

### Issues Resolved
* Fixed tracing screen UI layout overflow on smaller viewports and landscape orientations.
* Fixed tracing game low accuracy check by implementing a Grid-based Jaccard Similarity algorithm to block invalid characters and scribbles.

### Outstanding Tasks
* Commit code changes to remote main branch (requires manual execution on host machine terminal due to sandbox restrictions).

## 2026-07-05
### Changes Completed
* **Import Fix in TracingCanvas.tsx:**
  * Imported missing `AnimatePresence` from `"motion/react"` to fix the compilation error in the JSX evaluation overlay wrapper.
* **Type Signature Fix in levelConfig.ts:** 
  * Changed the type of `top` from `top: string` to `top?: string` in `FEATURE_HIGHLIGHT_POSITIONS` to prevent compilation errors for coordinates that do not specify a top margin (e.g. coordinates using `bottom` instead).
* **Tracing Game Routing Fix in RewardScreen.tsx:**
  * Updated `handlePracticeMore` to route dynamically to `/tracing` if the next level config specifies `input_mode === "trace"`, instead of bypassing it by going directly to `/game`.
* **Tracing Simulator in GameScreen.tsx:**
  * Added a "Simulate Tracing State ✍️" button in the development debug panel footer to easily force a `gross_shape_blindness` config for testing purposes in localhost.
* **Agent Operations Setup:**
  * Initialized `.agent_recovery_context.md` to track current work context and reference decisions.
  * Created `STATUS_LOG.md` for daily progress tracking.
  * Modified `.agents/rules/akshara2.md` to remove automatic approvals and strictly enforce explicit manual chat approval from the user.
* **Progressive Letter Roadmap Selection Screen (/roadmap):**
  * Created `LetterRoadmapScreen.tsx` rendering all 33 Devanagari consonants with locking/unlocking states across 4 pages.
  * Implemented Left/Right arrow paginated navigation with a $\ge 75\%$ page progress unlock threshold.
  * Removed modal selection: clicking a card directly triggers the sequential assortment learning flow.
  * Updated routes, resume screen, and reward screens to anchor around the roadmap dashboard.
* **Automated Assortment Game Flow:**
  * Configured transition pipeline to sequentially guide children: Vocab (`ExampleWordsScreen`) $\rightarrow$ Tracing (`TracingScreen`) $\rightarrow$ Card Matcher (`MemoryGameScreen`) $\rightarrow$ Identification (`GameScreen`) $\rightarrow$ `/reward` $\rightarrow$ `/roadmap`.
* **Dynamic Letter-to-Letter Memory matching:**
  * Refactored `MemoryGameScreen.tsx` to match identical letter glyphs (e.g. `भ` vs `भ`).
  * Programmed deck distractors to dynamically pull from student-specific `confused_with` metrics in `fetchProgressReport()`, falling back to static visual `SIMILARITY_MAP` if no profile history exists.
  * Configured card folding behavior on mismatch after 1.2 seconds.
* **5-Question Session Restructuring:**
  * Expanded GameScreen to play 5 questions per session, dynamically shuffling and generating different option distractors on each trial.
  * Configured state transition timing, autoplays, and progress indicators (dynamic TopBar percentage and 5-dot status indicator).
* **Pure Student UI Cleanup:**
  * Removed absolute-positioned wireframe step banners (`absolute top-4 right-4`) from all user screens.
  * Encapsulated the DEV debug metrics bar behind a toggle button.

### Issues Resolved
* Resolved `Cannot find name 'AnimatePresence'` compilation error in `TracingCanvas.tsx`.
* Fixed property 'top' missing compilation errors.
* Resolved tracing game bypass issue.
* Enforced strict manual user confirmation constraint in agent rules.
* Resolved rapid single-question letter mastery issue by introducing 5-question sessions and dynamic option generation.
* Removed distracting development wireframe elements.

### Outstanding Tasks
* Commit changes to git (requires manual git command execution due to sandbox restrictions on the agent's side).
* Run `npm run build` and `npm run test` on host system to check final compile health.
