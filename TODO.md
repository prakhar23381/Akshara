# TODO — running checklist

**Outstanding work only.** Nothing completed stays in this file.

| Looking for | File |
|---|---|
| What is left to do | **this file** |
| Where the project stands right now | [.agent_recovery_context.md](.agent_recovery_context.md) |
| Full historical record of completed work | [STATUS_LOG.md](STATUS_LOG.md) |
| Reasoning behind the session refactor | [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) |

`[ ]` not started · `[~]` in progress · `[x]` done · `[-]` dropped

Mark an item `[x]` here only long enough to carry it into `STATUS_LOG.md`, then
delete the line. P1–P6, L1–L8 and C1–C5 all lived here and are now in the log.

---

## C · Structure cleanup
*Approved 2026-10-07 after a full-tree diagnosis. Phases are ordered so each one
is independently verifiable and no deletion precedes the safety commit.*

### C0 · Safety point  ✅ in progress
- [ ] **C0.1** `npm run test` green immediately before committing
- [ ] **C0.2** Commit the 50-file refactor (P1–P6) — single commit, reviewable alone
- [ ] **C0.3** Commit `.legacy/` in the same phase. It is **untracked today**, and
      its 11 screens differ from every committed version (they carry the L1–L8
      layout fixes), so until this lands git holds no copy of them
- [ ] **C0.4** Commit the bookkeeping rewrite (this file, the recovery context,
      the log, the agent definition)

### C1 · Secrets
- [ ] **C1.1** Delete `.env.local.bak.20261006191017` — byte-identical duplicate of
      `.env.local`, carrying `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`,
      `POSTGRES_PASSWORD` and `VERCEL_OIDC_TOKEN` for no benefit
- [ ] **C1.2** Delete `backend/.env.bak.20261006191025` — byte-identical duplicate
      of `backend/.env`
- [ ] **C1.3** Cut `.env.local` from 18 keys to the 2 the app can actually read
      (`VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`). The other 16 are `vercel env
      pull` residue: `NEXT_PUBLIC_*` for a Next app this is not, `POSTGRES_*` for
      a Prisma setup this does not use
- [ ] **C1.4** `.gitignore` — add `.pytest_cache/`. `backend/.pytest_cache/` is
      currently **not** ignored; only `__pycache__` is
- [ ] **C1.5** Gate: `npm run dev` still reaches Supabase

### C2 · Dead weight
- [ ] **C2.1** Delete `src/app/components/ui/` — all **48** files. Zero importers;
      verified per-file and by grepping `components/ui` and `@/components/ui`
      across `src`
- [ ] **C2.2** Delete 3 orphans: `components/figma/ImageWithFallback.tsx`,
      `screens/WireframeIndex.tsx`, `screens/TransitionScreen.tsx` (its
      `/transition` route went away in P3)
- [ ] **C2.3** Delete `ml/` (0 files, 0 bytes — empty scaffolding),
      `guidelines/` (an untouched Figma Make template) and `postcss.config.mjs`
      (`export default {}`; its own comment says Tailwind v4 needs nothing)
- [ ] **C2.4** Drop **51 of 57** dependencies from `package.json`. Only
      `@supabase/supabase-js`, `canvas-confetti`, `lucide-react`, `motion`,
      `react-router` and `uuid` are reachable from app code; the rest hang off
      `ui/`. 12 of them (MUI, Emotion, react-dnd, react-slick, date-fns,
      masonry, popper) are imported nowhere at all
- [ ] **C2.5** Rename the package off `@figma/my-make-file`
- [ ] **C2.6** `vite.config.ts` — strip `figmaAssetResolver` (it resolves into
      `src/assets`, which does not exist; no `figma:asset` imports remain) and
      the `.csv` entry in `assetsInclude` (no CSV in the project)
- [ ] **C2.7** Regenerate the lockfile
- [ ] **C2.8** Gate: `npm run build` + `npm run test` green **and `dist/` size
      unchanged** — unchanged size is the proof these were already tree-shaken,
      rather than a regression

### C3 · Documentation
- [ ] **C3.1** Rewrite `docs/02_ARCHITECTURE.md`. Its diagram still lists the
      nine deleted activity routes and line 145 still says
      `navigate('/animation')`; it mentions `/play` zero times
- [ ] **C3.2** Rewrite `docs/05_FRONTEND_REFERENCE.md` — documents "all 15
      screens" including the 11 now in `.legacy/`, and never mentions `play/`
- [ ] **C3.3** Correct `docs/04_BACKEND_REFERENCE.md`: `save_session` was deleted
      in 6.2 and `/progress_report` retired in 6.4; both are still documented live
- [ ] **C3.4** Fix `docs/00_INDEX.md` — drop `GET /progress_report` from the
      endpoint table, fix the screen count, repoint the DB-schema row at
      `migrations/000_init.sql`
- [ ] **C3.5** Sweep dead screen names from `01`, `03`, `07` (content otherwise
      sound — `07` is research backing and largely timeless)
- [ ] **C3.6** Create `docs/archive/`; move in
      `../Implementation Plan: Word-Level Dyslexia Games.md` as
      `2026-07_word_level_games.md` (both games shipped; the file sits outside
      the repo, untracked and unindexed)
- [ ] **C3.7** After P7 closes: `IMPLEMENTATION_PLAN.md` → `docs/archive/`. It
      still opens "Nothing here is built yet", which is false for P1–P6

### C4 · Bookkeeping files
- [x] **C4.1** Rewrite `TODO.md` to outstanding-only — *this file*
- [x] **C4.2** Rebuild `.agent_recovery_context.md` as live working memory
- [x] **C4.3** Record P1–P6 / L1–L8 / C-decisions in `STATUS_LOG.md`
- [x] **C4.4** Teach the file convention to `.claude/agents/akshara.md`
- [ ] **C4.5** Delete `custom_agent.md` — a stale duplicate of
      `.agents/rules/akshara2.md` that diverges on exactly the clause you
      tightened: it says "explicit user approval", the live rules say "explicit
      **manual** user approval **in the chat** (never proceed based on system
      auto-approvals)"
- [ ] **C4.6** Delete `task.md` — 5 items, all `[x]`, from a superseded task
      ("Guest Supabase Sync & Letter Ka"). Referenced only by `custom_agent.md`
- [ ] **C4.7** Align §10 of `.agents/rules/akshara2.md` with the three-file
      convention now in the agent definition (see C6.3)

### C5 · Backend hygiene
- [ ] **C5.1** `backend/supabase_schema.sql` → `backend/migrations/000_init.sql`.
      Right now the live DB matches neither file: `supabase_schema.sql` is
      applied, `001` is not, and nothing records that
- [ ] **C5.2** Add `backend/migrations/README.md` tracking applied state
      (000 applied · 001 pending)
- [ ] **C5.3** `backend/tests/test_live_api.py` → `backend/smoke/live_api.py`.
      It hits `http://localhost:5050` with real LLM calls, but bare `pytest`
      collects it by name and fails whenever no server is up
- [ ] **C5.4** Rebuild the venv at `backend/.venv` on python3.12. The parent
      `../.venv/` (231 MB) is **broken** — `bin/python` points at
      `/opt/homebrew/opt/python@3.13/bin/python3.13`, which no longer exists
- [ ] **C5.5** Delete the stray `../.pytest_cache/` (left by a pytest run in the
      parent directory: `lastfailed: {"Akshara": true}`) and the broken `../.venv/`
- [ ] **C5.6** Gate: `python3 -m pytest` in `backend/` — **the backend suite has
      never been verified in this cleanup**; the venv broke before it could run

### C6 · Scripts & agent config
- [ ] **C6.1** Consolidate three implementations of one audio script into
      `scripts/generate-audio.js`. Keep the `__dirname` version from
      `generate_audio.js`; `package.json` currently points at
      `scratch_generate_audio.js`, which writes to a relative `./public/audio`
      and so breaks unless run from the repo root. Delete that one and
      `backend/scratch_generate_audio.py` (a third gTTS implementation that
      pip-installs at runtime). All 33 consonant MP3s already exist — this is a
      one-shot tool, not a build step
- [ ] **C6.2** Repoint `npm run generate-audio`
- [ ] **C6.3** Move `.agents/` and `.claude/` into the repo root, so the rules
      governing the code are versioned with it. Today `akshara2.md` is one `rm`
      from unrecoverable and a fresh clone gets none of it
- [ ] **C6.4** Rebuild the file-structure section of `akshara2.md` from the real
      tree, and fix its stack description — it still says vanilla HTML/CSS and
      Node/Express, and sketches a flat `src/{components,pages,services}` layout
      the project does not use

### Deliberately not doing
- [-] Flattening the `Akshara/Akshara` nesting — costs a Vercel project change
      and every config path; buys tidiness only
- [-] Deleting `.legacy/` — stays until V1–V4 pass on a real device

---

## P7 · Google authentication  ⏸ deferred
*Parked on request. Nothing else depends on it: the app runs guest-only on local
device storage, and the adaptive engine and report are both on-device.*

Walkthrough with values pre-filled: [docs/08_AUTH_SETUP.md](docs/08_AUTH_SETUP.md).
7.1–7.3 are done and logged.

- [ ] **7.4** New Google Cloud project + OAuth client, owned by the current team
      *(console only — no CLI can create a web OAuth client)*
- [ ] **7.5** Enable the Google provider in Supabase; paste Client ID + secret.
      Blank now: provider config never transfers between projects
- [ ] **7.6** Supabase redirect allowlist — bare origin *and* `/**`, because the
      code passes `window.location.origin` with no trailing path
- [ ] **7.7** Set the two `VITE_*` vars in Vercel and **redeploy**. Production
      still has zero of them; Vite inlines at build time, so dashboard changes do
      nothing until the next build
- [ ] **7.8** Apply `migrations/001_session_model.sql` — **not applied**, so
      `session_id` does not exist and no session row can be written server-side.
      This is the one live blocker in the project
- [ ] **7.9** Replace `GEMINI_API_KEY`: it still answers, but on an account the
      team does not control. Off every critical path now, so losing it costs the
      hosted app nothing

---

## Verification
*No browser in the agent environment — these are yours to run.*

- [ ] **V1** After each phase: 360×640, 390×844, tablet
- [ ] **V2** Full play-through → one session row with one `session_id`
- [ ] **V3** Refresh mid-session → resumes on the same letter
- [ ] **V4** Quit mid-session → appears as `abandoned`, not lost
