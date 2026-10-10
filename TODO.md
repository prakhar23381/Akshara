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

## Deploy  — closed 2026-10-09

*Both D1 and D2 are done; detail in `STATUS_LOG.md`. `origin/main` is level with
local `main`, and production serves the post-cleanup build (CSS −64%). Note for
future work: **a push to `main` deploys to production by itself** — the Vercel
GitHub integration is connected. There is no separate "ship it" step to remember,
and no way to push without shipping.*

## Device feedback, 2026-10-10 — W1 landed, W2–W5 open

Nine reports from device testing. W1 is on branch `fix/w1-child-view-layout`
(commit `29eae34`) and covers 1a·1b·2a·2b·3a·4a·4c·6·7 — see `STATUS_LOG.md`.
**Every W1 claim is a visual one made without a browser; V1 on a device is what
confirms them.**

- [ ] **W2 · Make the games actually adapt to the child (report 2c).**
      The feedback was not about option counts: the games must pick confusable
      letters from what *this* child gets wrong. **They do not.**
      `pickDistractors` (`src/app/lib/adaptiveEngine.ts:322`) reads the static
      `DISTRACTOR_POOLS[target].easy/hard`, chosen by cognitive state alone, and
      never looks at the child's history. The only per-child behaviour is
      "rotate one letter if identical to last session", which is
      anti-memorisation, not personalisation.
      **The loop is open, and the plumbing is already there pointing the wrong
      way:** `sessionMetrics.ts` computes `confusion_counts`, the report renders
      them, and `wordQuestions.distractorsFor(target, confused, n)` takes a
      `confused` argument it *prefers* — but every caller passes
      `levelConfig.distractor_pool`, which is static. Closing it means feeding
      real confusion counts into `pickDistractors` and into the three games.
- [ ] **W2b · Hesitation nudging in the word games (reports 3c, 4d).**
      `levelConfig.hesitation_trigger_stage1_ms` / `stage2_ms` exist and are
      **ignored by both word games**. Only `IdentifyStep` implements the ladder
      (dim → pulse → answer for the child). A child who stalls in Fill-in or
      Spelling dead-ends with no help at all.
- [ ] **W3 · Matras as first-class units (report 9).** Decision taken: teach
      them separately, not just fix the split — see Reference Decision
      [2026-10-10]. Two parts:
      * **The correctness half, which is a live data bug.** Words are split by
        code point, so the app counts `खिलौना` as 6 letters when it is 3
        graphemes (78% of the 92 example words carry a matra). Worse, **ङ and ञ
        log attempts under the wrong letter**: their words (`गंगा`, `चंचल`) do
        not contain the target, `Math.max(0, findIndex(...))` falls back to
        index 0, so the child practising ङ is asked to fill ग and the attempt is
        recorded as `target_letter: "ग"` — feeding the adaptive engine and the
        report's confusion pairs. For those same two letters
        `buildSpellingQuestions` skips its loop entirely and renders a spelling
        question with **one** option. Needs `Intl.Segmenter`.
      * **The teaching half.** A matra model showing bare consonant, matra mark
        and combined form as three distinct things. New content across 33
        letters and probably a new activity. Scope this before building it.
- [ ] **W4 · Report redesign (reports 5a, 5b, 5c).** Too much space, too little
      information, too little colour. Decision taken: **use RAG colour on
      scores**, reversing the earlier single-hue restraint — see Reference
      Decision [2026-10-10]. Also needs a content brief: which figures earn the
      space currently empty.
- [ ] **W5 · Parent / Teacher / Child accounts (report 8).** The deepest item.
      Today `triggerMathGate(target: "parent" | "teacher")` **never reads
      `target`** — both buttons run the same gate and both land on `/report`, so
      the two roles are literally identical in code.
      The real ask is one adult account managing several children, and that is a
      schema change, not a screen: `user_profiles.id` **is** `auth.users.id` and
      every RLS policy is `auth.uid() = user_id`, so one auth account is
      structurally one child. Needs a new owner/child table, rewritten RLS on
      `user_profiles`, `learning_sessions` and `letter_progress`, a
      `user_id` → `child_id` migration, and a child switcher. **On live
      production data** — plan the migration before writing any of it.

## Verification
*No browser in the agent environment — these are yours to run.*

- [ ] **V1** After each phase: 360×640, 390×844, tablet
- [ ] **V2** Full play-through → one session row with one `session_id`
- [ ] **V3** Refresh mid-session → resumes on the same letter
- [ ] **V4** Quit mid-session → appears as `abandoned`, not lost

Once V1–V4 pass: delete `.legacy/` (12 files, 148 KB) — git history keeps it.
