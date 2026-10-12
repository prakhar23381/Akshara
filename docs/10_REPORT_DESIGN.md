# The new parent report — design

*Approved 2026-10-11 (TODO W4-P). Replaces the W4a dashboard, which stays at
`/report` until step B5. Built in the report lab (`/lab.html`, see
[05_FRONTEND_REFERENCE.md](05_FRONTEND_REFERENCE.md)). Figures:
`src/app/screens/report-v2/model.ts`, tested in `tests/reportModel.test.ts`.*

## Why a new report

W4a was "just text and numbers everywhere": too many figures, read like
analytics, no clear next step, and everything on one page — hard for a parent
or teacher who is not technical. The brief, from the user's choices
(recovery context §4, 2026-10-11): graphical and layered, basic information on
top and charts deeper, every figure tappable to show whether that area is
improving; clean charts; no verdict; English; phone-first.

## 1. Structure

```
Summary ─┬─ Letters ──────── one letter (e.g. ग)
         ├─ Skills ───────── one skill (e.g. Words)
         ├─ Practice ─────── all sessions
         └─ Mix-ups ──────── one pair (e.g. क ↔ ख)
```

* **Week / Month / All** sits once, in the sticky header, and scopes every
  figure at every level.
* Every figure with a change (▲▼) opens its trend.
* Each view has its own URL (`/report?child=…&range=week&view=letter&letter=ग`),
  so the phone's back button goes up a level.

## 2. Summary (phone; Aarav's week from the lab, real figures)

```
┌──────────────────────────────────────┐
│ ←  🦁 Aarav                        ⤓ │
│  [ Week ]  Month   All               │
│  This week so far · vs the same days last week
├──────────────────────────────────────┤
│ Practise next: क and ख —             │
│ mixed up 7 times this week           │
├──────────────────────────────────────┤
│ Letters                            › │
│ 1 learned · 2 learning · 1 needs help│
│ ●◐▲◐○○○○○○○○○○○○○○○○○○○○○○○○○○○○○     │  ← 33 cells
├──────────────────────────────────────┤
│ Skills                             › │
│ 78% right first time   ▲ 14 pts      │
│ ▁▃▅▅▆▇                  (by day)     │
├──────────────────────────────────────┤
│ Practice                           › │
│ 6 of 7 days · 51 min                 │
│  M  T  W  T  F  S  S                 │
│  ■  ■  ■  ■  ■  ■  □                 │
├──────────────────────────────────────┤
│ Mix-ups                            › │
│ क ↔ ख   7×   ▲ from 3                │
│ ग ↔ घ   2×   new this week           │
└──────────────────────────────────────┘
```

Tablet and desktop: Letters becomes an 11×3 grid across the top, the other
three cards in a row beneath. One hero figure per view. No verdict.

## 3. Sections

*Section figures are illustrative; the summary's are Aarav's real ones.*

```
LETTERS                                    SKILLS
┌──────────────────────────────┐          ┌──────────────────────────────────┐
│ ● 1  ◐ 2  ▲ 1  ○ 29          │          │ 78% right first time   ▲ 14 pts  │
│ ┌──┬──┬──┬──┬──┬──┐          │          │ ████████████████░░░░░            │
│ │क●│ख◐│ग▲│घ◐│ङ○│च○│ 6 a row  │          │ right first · app helped · wrong │
│ └──┴──┴──┴──┴──┴──┘ … 33     │          │ Sound → letter      82% ▲4  ▁▃▅▆›│
│ ● learned  ◐ learning        │          │ Look-alike letters  64% ▼2  ▅▄▄▃›│
│ ▲ needs support ○ not started│          │ Words               71% ▲9  ▂▄▅▇›│
│ New this week: क             │          │ Writing (tracing)   68%     ▃▅▆ ›│
└──────────────────────────────┘          │ Speed             4.2s ▼0.5s    ›│
                                          │ Matras        not measured yet   │
PRACTICE                                  └──────────────────────────────────┘
┌──────────────────────────────┐          MIX-UPS
│ 6 of 7 days · 6 sessions     │          ┌──────────────────────────────────┐
│ 51 min      ▲ from 9 min     │          │ क ↔ ख  ███████████  7×  ▲ from 3 ›│
│ minutes per day  ▁▇▆▇▇▆▇     │          │ ग ↔ घ  ███          2×  new      ›│
│ finished 5 · stopped early 1 │          │ Look-alike vs different shape    │
│ ██████████████▒▒             │          │ █████████████░░░                 │
│ All sessions ›               │          └──────────────────────────────────┘
└──────────────────────────────┘
```

Month turns the practice strip into a calendar; All shows weekly columns.

## 4. Detail views

```
ONE LETTER                                 ONE MIX-UP PAIR
┌──────────────────────────────┐          ┌──────────────────────────────────┐
│ ग    ▲ Needs support         │          │     क        ख     (large)       │
│ 2 sessions · last on 9 Oct   │          │ ख asked → क chosen   5×          │
│ Right first time, by session │          │ क asked → ख chosen   2×          │
│ 100 ┤▒▒▒▒▒▒▒▒▒▒▒▒▒ status band│          │ Times per week  ▂▅▇▃              │
│   0 ┤ ●────●                 │          │ Sessions it happened in ›        │
│ Mixed up with  घ 2×  ध 1×  › │          └──────────────────────────────────┘
│ Speed 5.1s · Writing 64%     │          ONE SKILL: its chart over time, plus
│ [Show numbers]               │          a bar per letter. ALL SESSIONS: date ·
└──────────────────────────────┘          letter · minutes · right first time ·
                                          finished / stopped.
```

## 5. What each figure means

| Figure | Definition (`model.ts`) |
|---|---|
| **Right first time** | Answers correct **without** the app's help ÷ all answers, across Listen & tap and both word games. The base figure everywhere. The engine's error rate is not charted. (It used to count an answer the app supplied as right; since E2, 2026-10-12, it is a miss there too.) A letter's answers are the questions that asked for it — a check question (E3) asked inside another letter's session files under the letter it asked for |
| App helped | Answers the app supplied (`was_guided_win`) ÷ all answers |
| Mix-up | A wrong answer, counted per pair either way round (क ↔ ख, alphabet order). The pair view says which way |
| Look-alike vs different shape | **Listen & tap only.** It is the one game where the distractors vary between look-alike and different-shape letters for the same task. The word games always offer look-alikes (correctly tagged `similar`) but are a harder task, so mixing them in would compare task difficulty, not shape vs detail |
| Practice day · minutes | A local date with ≥1 session; minutes from start to end (to the last finished activity if a session never ended) |
| Speed | Median time to answer, right-first-time answers only (a supplied answer is recorded with time 0) |
| Writing | Mean tracing score; present only in sessions the planner sent to tracing |
| Letter status | From the letter's latest session with answers, at the engine's own lines read on right-first-time: **above 90%** secure ●, **70–90%** learning ◐, **below 70%** needs support ▲; not started ○ |
| Letters learned | The engine's mastery, judged from the answers with today's rules (`letterStatuses`, E2 + E3) — not the label saved when the session ended |
| Practise next | The top mix-up this period if it happened twice or more; otherwise the letter practised this period with the lowest right-first-time among those needing support; otherwise nothing |

**Periods — user-chosen.** Calendar periods in the device's time zone: a week
runs from **Monday**, a month from the **1st**, each up to now. Changes compare
against the **same span** of the previous week or month (Monday–Tuesday against
last Monday–Tuesday; on 31 March, all of February), so a count is never a drop
just because the week has only begun. A rate shows no change when the
comparison span has no data; a count compares with zero. **All** shows no
changes. Trend buckets: a day each in a week, a week each in a month (the first
starting on the 1st), weeks — or months past half a year — for All.

## 6. Visual rules (dataviz method)

* Charts hand-built in SVG — no chart library; the app keeps 9 dependencies.
* One accent, blue `#2a78d6`, for every single-series chart. Status colours
  (`lib/reportBands.ts`) only ever mean status, always with a mark and a word.
* The right / helped / wrong stack: three ordinal blue steps — right first
  time `#2a78d6`, app helped `#5598e7`, wrong `#86b6ef` — validated with the
  palette script on the white card (`--ordinal --surface #ffffff`,
  2026-10-12: monotone, visible gaps, lightest 2.11:1). In
  `report-v2/charts/theme.ts` as `MIX`.
* Changes in green or red text by whether the direction is good (lower is
  better for speed), always with ▲/▼.
* Solid hairline grids, no dual axes, labels only on the latest and the extreme
  point. Tap or focus shows a value; every chart has a "Show numbers" table.
* Tap targets ≥ 44px. No dark mode — the app has none.
* Download prints the summary, the four sections and the session table.

## 7. Code and build steps

```
src/app/screens/report-v2/
  model.ts         buildReportModel(sources, now, range) — every figure above   (B1, done)
  ParentReport.tsx header + period switch; takes the view as a prop
  views/           Summary · Letters · Letter · Skills · Skill · Practice · Sessions · MixUps · Pair
  charts/          Sparkline · TrendChart · BarList · DayStrip · Calendar · LetterGrid · StackBar · Delta
  PrintReport.tsx
```

| Step | What | Then |
|---|---|---|
| B1 | Data model + tests, no UI | done 2026-10-11 |
| B2 | Summary and period switch, in the lab | built 2026-10-12; user reviews in the lab |
| B3 | The four sections | user reviews |
| B4 | Detail views and Download | user reviews |
| B5 | `fetchReportSources()` split out of `client.ts`; `/report` moves to the new report; flow test extended; W4a retired. E2 fixed (2026-10-12) and in `main` first | ships after W5b |
