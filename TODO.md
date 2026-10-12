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
instruction. The branches below were merged, and deleted on 2026-10-12; their
commits are in `main` (table kept as a record):

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
      **Layout is now checked in a headless browser** (`scripts/visual/`,
      2026-10-10): centring, square tiles, the barakhadi at 360×640, the ◌
      dotted circle, the hint ladder's timing, the report at three widths. What
      still needs a real device: touch, audio and text-to-speech, Android's
      fonts (including the conjunct options such as `ड्गा` for ङ), and speed.
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
- [ ] **H1 · A Hindi teacher should confirm the new ङ / ञ words.** गङ्गा,
      पङ्खा, अङ्गूर, चञ्चल, पञ्जा, मञ्च are the traditional spellings, chosen because
      the modern anusvara forms do not contain the letter. Also: ण has two
      example words and ष one, so those sessions have fewer word questions.
- [ ] **E1 · `IdentifyStep` still runs its own hesitation ladder.** The word
      games share `hooks/useHesitationLadder.ts`; Identify's copy is tangled
      with its slow-audio retry, so folding it in was left out of W2.

- [~] **W4 · A fresh report (decided 2026-10-11).** W4a stays live until the
      new one replaces it. On `feat/report-v2`. **The design is approved:
      [docs/10_REPORT_DESIGN.md](docs/10_REPORT_DESIGN.md)** — wireframes,
      every figure's definition, the build steps. The lab (W4-L), the design
      (W4-P), the data model (B1), the summary (B2) and the four sections
      (B3), both reviewed, are done — `STATUS_LOG.md`.
  - [~] **B4 · Detail views** (letter, skill, pair, all sessions) **and
        Download.** Built 2026-10-12. **Waiting on the user's review in the
        lab** (`npm run dev` → `/lab.html`; tap into a section, or the Paper
        button for Download). Do not start B5 before it.
  - [ ] **B5 · Ship it.** W5b and E2 are in `main` (released 2026-10-12),
        so `feat/report-v2` fast-forwards onto it. Split `fetchReportSources()` out
        of `client.ts`; `/report` → the new report with view and period in
        the URL; extend `scripts/visual/flow.cjs`; retire W4a's
        `ReportScreen`.
- [ ] **W4b · Teacher class report.** After the parent report (W4). Three
      tabs, user-chosen: who needs help, the whole-class grid, class-wide
      patterns (detail left to the agent's design). Reuses the new report's
      model and charts; tapping a child opens their parent report. The lab
      already has a class of 25 (`?scenario=class`). Reachable in the app
      only once W5c (classes) is built.
- [ ] **H2 · Calibrate the hint dot per letter.** `FEATURE_HIGHLIGHT_POSITIONS`
      places the guiding dot as a percentage of the *tile*, and was never
      measured against the glyphs. Square tiles (3b/4b fix) bring it close to
      the letter; putting it on the actual feature of each of the 33 letters
      needs a pass with the visual harness, one letter at a time.
- [ ] **W5c · Classes and share codes.** W5a (migration 002, applied) and W5b
      (accounts, PIN, child mode) are done — `STATUS_LOG.md`. Left: a
      teacher creates named classes and sees/rotates the class code; a parent
      enters a class code to put their child in a class (which gives the
      teacher access); either adult creates or redeems a child share code; a
      classroom tablet picks the class, then the child. The database side is
      built and tested (`join_class`, `create_child_share_code`, …); this is
      the client.
- [ ] **W6 · Matras — a major feature (user, 2026-10-12).** The app teaches
      matras but cannot tell whether a child knows them: the barakhadi step
      (`MatraStep.tsx`) shows consonant + sign = syllable in three sittings
      and records nothing. Matra confusions — ि/ी, ु/ू, े/ै, ो/ौ — are the
      most common dyslexic reading error in Devanagari. To build:
      1. a scored matra game (hear a syllable, choose it among look-alike
         signs), each answer recorded the way a letter answer is;
      2. matras in the learner profile and the engine, so the matra step
         adapts the way the letter games do (which pairs, how often);
      3. the report's Matras row turns on. It stays on the dashboard as
         "not measured yet" until then (B3 review, user).
      Needs its own design first: which matras, on which consonants, and
      what counts as knowing one are the user's calls. Replaces M1.
- [ ] **V7 · Try the signed-in path for real — on production, now.** W5b is
      live since 2026-10-12 (`79e93f1`). Its guest path is click-tested end to
      end; the signed-in path calls the same operations through Supabase and
      every column and function name is verified against the live project,
      but no Google account has run it. Sign in, choose a role, set a PIN, add
      a child, play, check the report. With E2 live, also look at a child who
      played before: letters may have gone from mastered to learning, and a
      page they had played on must still be open. Do 7.6 first.
- [ ] **D4 · Migration 003.** W5b is in production since 2026-10-12; wait a
      day or two for tabs still open on the old client, and for V7. Drop
      `trg_legacy_profile_child` and the old `users_own_sessions` /
      `users_own_progress` policies — **keep `users_own_profile`**, the only
      policy on `user_profiles`. Until then the trigger is what keeps old
      cached clients' sign-ups working.

## Verification
*Layout can now be checked headlessly (`scripts/visual/`); these need a real
device — touch, sound, persistence across a real refresh.*

- [ ] **V1** After each phase: 360×640, 390×844, tablet
- [ ] **V2** Full play-through → one session row with one `session_id`
- [ ] **V3** Refresh mid-session → resumes on the same letter
- [ ] **V4** Quit mid-session → appears as `abandoned`, not lost

Once V1–V4 pass: delete `.legacy/` (12 files, 148 KB) — git history keeps it.
