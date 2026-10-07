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
the line. P1–P6, L1–L8, C1–C5 and cleanup phases C0–C6 are all in the log.

---

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
- [-] Moving `.claude/` into the repo — the parent folder is the session root, so
      moving it breaks settings and permission discovery. `.agents/rules/` is in
      the repo; `.claude/agents/akshara.md` stays a local file
- [-] Flattening the `Akshara/Akshara` nesting — costs a Vercel project change
      and every config path; buys tidiness only
- [-] Deleting `.legacy/` — stays until V1–V4 pass on a real device

---

## P7 · Google authentication  — mostly verified done (2026-10-07)
*7.1–7.3 and 7.8 are logged. 7.4, 7.5 and 7.7 verified live this session.*

Walkthrough with values pre-filled: [docs/08_AUTH_SETUP.md](docs/08_AUTH_SETUP.md).

- [ ] **7.6 · Confirm the redirect allowlist in the Supabase dashboard.**
      **Not verifiable from here, by design:** `/auth/v1/authorize` hands Google
      Supabase's *own* callback as `redirect_uri` and carries the app-level
      `redirect_to` in `state`, which is validated when the provider calls
      **back**. So a bogus domain is accepted at the authorize step too — the
      probe cannot discriminate and proves nothing either way.
      Authentication → URL Configuration must list both the bare origin **and**
      `/**`, because the code passes `window.location.origin` with no trailing
      path:
      ```
      https://akshara-tau.vercel.app
      https://akshara-tau.vercel.app/**
      https://akshara-tau-*.vercel.app/**
      http://localhost:5173/**
      ```
      The symptom if it is wrong: sign-in completes at Google and then lands on
      the Site URL instead of where it started.
- [ ] **7.9 · Confirm who owns `GEMINI_API_KEY`.** The key is live —
      `models.list` returns 200 and sees `gemini-2.5-flash`. **Ownership cannot
      be checked by API:** no endpoint reveals which account or project issued a
      key. What is known is that the backup taken during the 2026-10-06
      repointing held the *same* key, so it was not rotated then. If it is still
      on an account the team does not control, replace it. It is off every
      critical path, so losing it costs the hosted app nothing.

## Deploy  — blocked on GitHub auth

- [ ] **D1 · Push 14 commits, then redeploy.** Attempted 2026-10-07; **push
      failed.** `origin/main` is at `6f6da86`, 14 commits behind local `main`.

      *Why it failed:* no working GitHub credential on this machine.
      - `gh` CLI not installed
      - `credential.helper = osxkeychain` is configured but its stored
        credential is rejected (`Invalid username or token`) — almost certainly
        a saved password, which GitHub stopped accepting in 2021
      - no SSH keys exist (`~/.ssh` has no `*.pub`); `ssh -T git@github.com`
        returns `Permission denied (publickey)`

      *Ways out, cheapest first:*
      1. `ssh-keygen -t ed25519`, add the public key at GitHub → Settings → SSH
         keys, then `git remote set-url origin git@github.com:prakhar23381/Akshara.git`
      2. Install `gh` and run `gh auth login` (browser flow)
      3. Replace the keychain entry with a Personal Access Token (repo write)

      *Risk while this sits:* production already serves code that is not on
      GitHub, and `origin` is 14 commits behind — **this laptop is the only copy
      of the P1–P6 refactor and the whole structure cleanup.**

- [ ] **D2 · Ship the cleanup to production.** Deferred by choice 2026-10-07.
      `akshara-tau.vercel.app` serves assets byte-identical to this session's
      pre-cleanup baseline (`index-DaMLZmhl.js` 712,890 B /
      `index-BzKSVV-R.css` 103,889 B). Deploying would cut production CSS to
      37,265 bytes (−64%). The Vercel CLI is installed and authenticated as
      `prakhar23381-9369`, so `vercel --prod` works without GitHub — but it
      would deploy from the working tree, widening the gap between production
      and the repo.

## Verification
*No browser in the agent environment — these are yours to run.*

- [ ] **V1** After each phase: 360×640, 390×844, tablet
- [ ] **V2** Full play-through → one session row with one `session_id`
- [ ] **V3** Refresh mid-session → resumes on the same letter
- [ ] **V4** Quit mid-session → appears as `abandoned`, not lost

Once V1–V4 pass: delete `.legacy/` (12 files, 148 KB) — git history keeps it.
