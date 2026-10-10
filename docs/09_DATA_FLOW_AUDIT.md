# Data-flow audit — is anything personalised from the database?

*Audited 2026-10-10 against `main` at `1f3fdec` (what production serves), by tracing every Supabase and `localStorage` access in `src/`. W2 and W3 below are the fixes, on branches `feat/w2-adaptive-games` and `fix/w3-matras`.*

## Verdict

**Before W2, no part of the experience was personalised from the database, and almost none of it was personalised at all.**

- The database was written to, then read back only for routing and the roadmap's lock state.
- Every adaptive decision read `localStorage` on the current device, and most of them ignored the child's history entirely.
- The learning report never read the database.
- The child's recorded confusions were computed and displayed in the report, then never used to choose what the child saw next.

## What reads the database

| Reader | Table | Used for | Adaptive? |
|---|---|---|---|
| `HomeRedirect`, `UserTypeScreen` (`lib/profile.ts`) | `user_profiles.profile_complete` | Where to route on load | No |
| `ResumeScreen` | `user_profiles`, `letter_progress` | Name, avatar, which letter to resume | No |
| `LetterRoadmapScreen` | `letter_progress` | Page unlock scores, session count | No |
| **nothing** | **`learning_sessions`** | **Written on every change; never read back** | — |

In guest mode `supabase.from()` is silently swapped for a `localStorage` mock (`lib/supabase.ts`). Its "mirror" writes to the real database run with no auth session and the user id `"guest-user-id"`, which is not a UUID. Row-level security (`auth.uid() = user_id`) rejects every one of them. Guests are device-only by construction.

## What the adaptive loop actually used (before W2)

Opening a letter on the roadmap was the **only** way to start a session. It called the engine with an empty attempt list:

```ts
analyzeSession({ attempts: [], session_number: 1, avg_latency_ms: 6000, … })
```

With no attempts there is nothing to diagnose, so every session was configured as follows:

| Decision | Source | Personal? |
|---|---|---|
| Cognitive state | The most recent state on **any** letter, read from `localStorage` across **every child who used the device** | Barely, and not per child |
| Distractors | Static `DISTRACTOR_POOLS`, chosen by state. The `easy` list is `ल ह स र` for almost every letter | **No.** In the starting states every letter and every child got the same four |
| Nudge timers | Hardcoded 6 s baseline: always 14 s / 19 s | **No** |
| Scaffold | State only, error rate fixed at 0 | **No** |
| Memory deck, word games | The static pool | **No** |
| Example words | The first three, always | No |

The one call that does see a session's attempts is the end-of-session diagnosis. Its config was put into React state, then overwritten by the next empty call.

`distractorsFor(target, confused, n)` takes a `confused` list and prefers it, so the hook for personalisation existed. Every caller passed it the static pool.

**In production the backend is never called.** The live bundle contains the `localhost:5050` fallback, so `VITE_API_URL` is unset and `backendReachable` is false on `akshara-tau.vercel.app`. Gemini has never influenced a production session. Even when run locally, it could not have: it was asked about empty attempt lists, and the server is stateless.

## The learning report

`buildProgressReport()` reads three `localStorage` keys and nothing else:

- **No user filter.** Every session ever played on the device is merged into one report, whichever child played it.
- **The name is always "Guest Explorer" for a signed-in child.** It is taken from `akshara_db_user_profiles[0]`, which only the guest sign-in and the guest mock ever write.
- **"Letters mastered" is always 0 for a signed-in child.** `akshara_db_letter_progress` is only written by the guest mock. A signed-in child's progress goes to the real table, which the report never reads.
- **A new phone or a cleared browser shows an empty report**, although the database holds the sessions.

**Not fixed by W2 or W3.** See `TODO.md` → R1.

## Do the writes succeed?

All columns the app writes exist on the live project: the 21 in `sessionStore.toRow`, the 9 in the `letter_progress` upsert and the 5 in `user_profiles`. This was verified by PostgREST column probe, with a fabricated column returning `400` as the negative control. Row-level security permits a signed-in child's own rows.

What could **not** be verified from here is that rows actually land. Every write is fire-and-forget, and its `{ error }` result is never inspected: `.catch()` does not fire, because supabase-js returns errors rather than throwing. A failing write is completely silent. Confirming it needs a signed-in session or the dashboard.

## Data-quality defects in what was recorded

- **ङ and ञ logged attempts under the wrong letter.** Their example words (`गंगा`, `चंचल`) use the anusvara and do not contain the letter. `Math.max(0, findIndex(...))` fell back to index 0, so the ङ session blanked ग and recorded it as ग. The same two letters rendered a spelling question with one option. *Fixed in W3.*
- **Words were split by code point.** As a result, `selected_letter` could be a matra or a whole word. *Fixed in W3, and W2's profile ignores any such legacy entries.*

## What changed

**W2 (`feat/w2-adaptive-games`):**

- `lib/learnerProfile.ts` builds a per-child profile from the child's sessions:
  - state per letter
  - recency-weighted confusions
  - median response time

  A signed-in child's history comes from `learning_sessions` merged with the device's. A guest's comes from the device. Both are filtered to the child.
- `planSession()` configures each session from that profile, and the roadmap uses it instead of the empty call.
- All four games put the child's confusions first.
- Fill-in and Spelling gain the hesitation ladder.

**W3 (`fix/w3-matras`):**

- Words are split into aksharas, so the games blank and offer whole syllables.
- ङ and ञ have words that contain them.
- Attempts record real consonants.
- New barakhadi step teaches matras as separate signs.

## Still open

- **R1.** The report reads only `localStorage`, unfiltered. Point it at the learner-profile loader, which already reads the database and filters by child.
- **Write verification.** Inspect `{ error }` on each Supabase write and surface failures somewhere an adult can see them.
- **Guest mirror.** Its writes always fail. Remove it, or give guests an anonymous Supabase identity.
- **Matra data.** The barakhadi step teaches but does not measure. A scored ि/ी, ु/ू check would give the profile matra confusions, the most common dyslexic error in Devanagari.
