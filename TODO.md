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

## Device feedback, 2026-10-10 — W1–W3 and R1 released, W4–W5 open

W1, W2, W3 and R1 are logged in `STATUS_LOG.md`. **They are in production,
unverified on a device** — `main` was fast-forwarded to `bcc3897` on the user's
instruction. The branches below are merged; kept for reference only:

| Branch | Adds | Commit |
|---|---|---|
| `fix/w1-child-view-layout` | layout fixes, re-onboarding bug | `29eae34` |
| `feat/w2-adaptive-games` | learner profile, personal distractors, word-game nudging | `6206fc3` |
| `fix/w3-matras` | akshara segmentation, ङ/ञ fix, barakhadi step, data audit doc, double-tap fix | `d81a8ad`…`3b13a62` |
| `fix/r1-report-data` | report built per child from database + device | `ee78be8`+ |
| `feat/w5a-accounts-schema` | migration 002 (accounts, classes, share codes), verify + rollback, PGlite test | — |

- [ ] **V5 · Verify production on a device.** The release went out before
      this was done, so it now checks what children are actually using, at
      `https://akshara-tau.vercel.app`. If something is wrong, the fastest
      undo is a `git revert` of the bad commit pushed to `main`, or Vercel →
      Deployments → promote the previous production deployment
      (`akshara-7z09eregf…`) while a fix is made.
      Things only a device can confirm: centring and square memory cards (W1);
      the dim → hint → rescue ladder in Fill-in and Spelling (W2); the
      barakhadi rows fitting a 360×640 screen, and the ◌ dotted circle and the
      conjunct options (`ड्गा`) rendering in Noto Sans Devanagari (W3).
- [ ] **V6 · Confirm the database read path for a signed-in child.** W2 reads
      `learning_sessions` for signed-in children. The columns are verified to
      exist, but the query itself has only run against an empty table under
      the anon key — no signed-in session was available. Sign in, play a
      letter twice, and check the second session's reasoning reads
      "Personalised from N sessions (database+device)". The report reads the
      database the same way (R1): it should carry the child's own name, and
      its header must **not** say "saved on this device only".
- [ ] **R2 · Database writes fail silently.** Every write is fire-and-forget
      and nobody inspects its `{ error }` (supabase-js returns errors rather
      than throwing, so the `.catch()` never fires). Guest-mode mirror writes
      *always* fail — no auth session, and `"guest-user-id"` is not a UUID —
      so either remove the mirror or give guests an anonymous Supabase
      identity.
- [ ] **M1 · Measure matras, not just teach them.** The barakhadi step is
      unscored. A short ि/ी, ु/ू check would put matra confusions — the most
      common dyslexic error in Devanagari — into the learner profile, so the
      matra step could adapt the way the letter games now do.
- [ ] **H1 · A Hindi teacher should confirm the new ङ / ञ words.** गङ्गा,
      पङ्खा, अङ्गूर, चञ्चल, पञ्जा, मञ्च are the traditional spellings, chosen because
      the modern anusvara forms do not contain the letter. Also: ण has two
      example words and ष one, so those sessions have fewer word questions.
- [ ] **E1 · `IdentifyStep` still runs its own hesitation ladder.** The word
      games share `hooks/useHesitationLadder.ts`; Identify's copy is tangled
      with its slow-audio retry, so folding it in was left out of W2.

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
