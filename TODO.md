# TODO — running checklist

**Outstanding work only.** Nothing completed stays in this file.

| Looking for | File |
|---|---|
| What is left to do | **this file** |
| Where the project stands right now | [.agent_recovery_context.md](.agent_recovery_context.md) |
| Full historical record of completed work | [STATUS_LOG.md](STATUS_LOG.md) |
| Reasoning behind the session refactor | [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) |

`[ ]` not started · `[~]` in progress · `[x]` done · `[-]` dropped

Mark an item `[x]` only long enough to carry it into `STATUS_LOG.md`, then delete
the line. P1–P6, L1–L8, C1–C5 and cleanup phases C0, C2, C3, C4, C6 are all in
the log.

---

## Blocked on you — two confirmations and one question

- [ ] **A1 · Trim `.env.local`** from 18 keys to the 2 the app reads
      (`VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`). The other 16 are `vercel env
      pull` residue — `NEXT_PUBLIC_*` for a Next app this is not, `POSTGRES_*`
      for a Prisma setup this does not use — and they include
      `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`, `POSTGRES_PASSWORD`
      and `VERCEL_OIDC_TOKEN`.
      *Held: rule 11 protects live `.env` files and wants a second confirmation.
      All of it is recoverable via `vercel env pull` or the Supabase dashboard.*
- [ ] **A2 · Delete the broken `../.venv`** (231 MB, outside the repo). Its
      `bin/python` points at `/opt/homebrew/opt/python@3.13/bin/python3.13`,
      which no longer exists. Replaced by `backend/.venv` on python3.12.
      *Held: rule 11 wants a second confirmation for `rm -rf`.*
- [ ] **A3 · Where do you launch Claude Code from?** It decides C6.3 below.
      `.claude/` and `.agents/` currently sit in the **parent** folder, outside
      the repo, so a clone gets none of them and `akshara2.md` is one `rm` from
      unrecoverable. But moving them only helps if the session root is the repo;
      if you launch from the parent, moving breaks discovery of your settings
      and permissions.
- [ ] **C6.3** Move `.agents/` and `.claude/` into the repo root — gated on A3

## Decisions found during the cleanup

- [ ] **B1 · Two high-severity advisories, both pre-existing.**
      `react-router` 7.13.0 → 7.18.4 fixes 12 advisories; most are SSR/RSC paths
      this SPA never takes, but the open redirect via backslash in `<Link>` and
      `useNavigate` does apply. `vite` 6.4.2 → 6.4.3+ fixes two Windows-only
      issues. Both are **outside the stated dependency ranges**, so each is a
      real upgrade with a regression risk, not a patch bump. Deliberately kept
      out of the cleanup commits.
- [ ] **B2 · `backend/db.py` and `backend/IP/routes/progress.py` are a dead
      island.** `progress.py` is not registered, and `db.py` is imported by
      nothing else — so `verify_jwt`, `load_user_history`,
      `get_latest_cognitive_state`, `load_all_sessions` and
      `load_letter_progress` are all unreachable from a running server. Both
      carry good retirement docstrings. Delete, move to `.legacy/backend/`, or
      leave annotated? Now marked RETIRED in `docs/04_BACKEND_REFERENCE.md`
      either way.
- [ ] **B3 · `backend/tests/test_pipeline.py` is not a pytest suite.** It is a
      script with `main()` and helpers named `run_test`, so bare `pytest`
      collects nothing and the backend has no automated tests at all. It passes
      6/6 when run directly. Converting it to real `test_*` functions would give
      the backend a suite that CI could run.
- [ ] **B4 · `@supabase/supabase-js` 2.105.1 → 2.117.2** is available and was
      deliberately not taken, to keep the cleanup behaviour-neutral. Pinned
      exactly in `package.json` now, so the upgrade is a one-line decision.

## C · Structure cleanup — what is left

- [ ] **C3.7** After P7 closes: `IMPLEMENTATION_PLAN.md` → `docs/archive/`.
      It still opens "Nothing here is built yet", which is false for P1–P6

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
- [ ] **7.8** Apply `backend/migrations/001_session_model.sql` — **not applied**,
      so `session_id` does not exist and no session row can be written
      server-side. This is the one live blocker in the project.
      State is tracked in `backend/migrations/README.md`
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

Once V1–V4 pass: delete `.legacy/` (12 files, 148 KB) — git history keeps it.
