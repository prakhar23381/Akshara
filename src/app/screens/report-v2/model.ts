import type { ReportSources } from "../../api/client";
import { rowToSession } from "../../lib/sessionStore";
import { errorBand } from "../../lib/reportBands";
import { diagnose } from "../../lib/adaptiveEngine";
import { letterStatuses } from "../../lib/letterStatus";
import { LETTER_SEQUENCE, type QuestionAttempt } from "../../types/levelConfig";
import type { ActivityType, LearningSession } from "../../types/session";

/**
 * Every figure the new parent report shows, computed in one place.
 *
 * Pure: records and "now" in, figures out — the same sessions always give the
 * same report, which the lab and the tests rely on. The definitions are in
 * docs/10_REPORT_DESIGN.md §5; the ones that are easy to get wrong:
 *
 *  - **Right first time** is the base figure: correct *without* the app's help
 *    over all answers. (The engine's error rate used to count an answer the app
 *    supplied as right; since E2 it is a miss there too.)
 *  - **"Learned" is the engine's mastery, judged from the answers** with
 *    today's rules (`letterStatuses`), never the label saved when a session
 *    ended — so a mastery lost to a missed check question (E3) is lost here too.
 *  - **A letter's answers are the questions that asked for it**, including a
 *    check question asked inside another letter's session.
 *  - **Periods are calendar periods in the device's time zone**, a week from
 *    Monday, a month from the 1st. Each is compared with the *same span* of
 *    the one before — Monday to Tuesday against last Monday to Tuesday — so a
 *    count is never a drop just because the week has only begun.
 */

export type Range = "week" | "month" | "all";

/** [from, to). `from` null means "from the first record". */
export interface Period {
  from: Date | null;
  to: Date;
}

/** A figure now, the same figure for the comparison period, and the difference. */
export interface Measure {
  value: number | null;
  /** Null for "all", or when the comparison period has no data. */
  previous: number | null;
  change: number | null;
}

export interface Point {
  /** Local date the bucket starts on, YYYY-MM-DD. */
  start: string;
  value: number | null;
  /** How many answers, sessions or scores the value is made of. */
  n: number;
}

export type AnswerKind = "first" | "helped" | "wrong";

export interface AnswerMix {
  first: number;
  helped: number;
  wrong: number;
  total: number;
}

export type LetterStatus = "secure" | "learning" | "support" | "not_started";

export interface LetterSessionPoint {
  at: string;
  rightFirstTime: number | null;
  answers: number;
}

export interface LetterEntry {
  letter: string;
  status: LetterStatus;
  /** The engine's mastery, judged from the answers (`letterStatuses`, E2 + E3). */
  learned: boolean;
  /** When the current run of mastery began; null when unknown (older records). */
  learnedAt: string | null;
  latestRightFirstTime: number | null;
  sessions: number;
  lastPractised: string | null;
  /** Every session on this letter up to now, oldest first. */
  history: LetterSessionPoint[];
}

export type SkillId = "sound" | "lookalike" | "words" | "writing" | "speed" | "matras";

export interface SkillEntry {
  id: SkillId;
  label: string;
  unit: "%" | "s";
  lowerIsBetter: boolean;
  /** False for a skill the app does not measure yet (matras, TODO W6). */
  measured: boolean;
  measure: Measure;
  series: Point[];
  /** Answers (or tracing scores) behind the value, this period. */
  n: number;
}

export interface MixupPair {
  /** The pair, earlier letter of the alphabet first. */
  a: string;
  b: string;
  count: number;
  previous: number | null;
  /** a was asked for and b chosen, and the other way round. */
  aChoseB: number;
  bChoseA: number;
  /** Never seen before this period. */
  isNew: boolean;
}

export interface SessionRow {
  id: string;
  at: string;
  letter: string;
  minutes: number;
  status: LearningSession["status"];
  answers: number;
  rightFirstTime: number | null;
}

export interface DayEntry {
  /** Local date, YYYY-MM-DD. */
  date: string;
  sessions: number;
  minutes: number;
}

export type PractiseNext =
  | { kind: "mixup"; a: string; b: string; count: number }
  | { kind: "letter"; letter: string; rightFirstTime: number };

export interface ReportModel {
  childName: string;
  range: Range;
  now: string;
  current: Period;
  previous: Period | null;
  dataSource: ReportSources["source"];
  /** Any record at all, in any period. */
  hasAnySessions: boolean;
  lastPractised: string | null;
  /** Rows from before sessions stored their activities: counted, not analysed. */
  legacySessions: number;

  letters: {
    entries: LetterEntry[];
    learned: Measure;
    learnedInPeriod: string[];
    counts: Record<LetterStatus, number>;
  };
  skills: {
    rightFirstTime: Measure;
    series: Point[];
    mix: AnswerMix;
    entries: SkillEntry[];
  };
  practice: {
    sessions: Measure;
    minutes: Measure;
    days: Measure;
    /** Days elapsed in the current period, today included. */
    elapsedDays: number;
    byDay: DayEntry[];
    /**
     * Every day with practice, in any period, oldest first — what the month
     * calendar and the year heatmap browse back through.
     */
    history: DayEntry[];
    finished: number;
    stopped: number;
    inProgress: number;
    list: SessionRow[];
  };
  mixups: {
    total: Measure;
    pairs: MixupPair[];
    /** Listen & tap only: the same task, with only the distractors differing. */
    shape: {
      lookalike: { wrong: number; answers: number };
      different: { wrong: number; answers: number };
    };
  };
  practiseNext: PractiseNext | null;
}

// ── Dates (local time; component arithmetic, so a DST change cannot shift a day) ──

const atMidnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
const startOfWeek = (d: Date) => addDays(atMidnight(d), -((d.getDay() + 6) % 7));
const pad = (n: number) => String(n).padStart(2, "0");
export const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function periodsFor(range: Range, now: Date): { current: Period; previous: Period | null } {
  if (range === "all") return { current: { from: null, to: now }, previous: null };
  if (range === "week") {
    const from = startOfWeek(now);
    return { current: { from, to: now }, previous: { from: addDays(from, -7), to: addDays(now, -7) } };
  }
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  // The same point last month — or all of it, when last month is shorter
  // (on 31 March, February is compared whole).
  const same = new Date(
    prevFrom.getFullYear(), prevFrom.getMonth(), now.getDate(),
    now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds(),
  );
  return { current: { from, to: now }, previous: { from: prevFrom, to: same.getMonth() === prevFrom.getMonth() ? same : from } };
}

const inPeriod = (iso: string, p: Period) => {
  const t = Date.parse(iso);
  return (p.from === null || t >= p.from.getTime()) && t < p.to.getTime();
};

// ── Answers ──────────────────────────────────────────────────────────────────

const kindOf = (a: QuestionAttempt): AnswerKind =>
  a.was_guided_win ? "helped" : a.target_letter === a.selected_letter ? "first" : "wrong";

const ASSESSED: ActivityType[] = ["identify", "word_fill", "word_spelling"];

interface Answer extends QuestionAttempt {
  activity: ActivityType;
  /** The session's start: every figure files a session, and its answers, by when it began. */
  at: string;
}

function answersOf(s: LearningSession): Answer[] {
  return s.activities.flatMap((act) =>
    act.outcome?.kind === "questions" && ASSESSED.includes(act.type)
      ? act.outcome.attempts.map((a) => ({ ...a, activity: act.type, at: s.started_at }))
      : [],
  );
}

function mixOf(answers: QuestionAttempt[]): AnswerMix {
  const m: AnswerMix = { first: 0, helped: 0, wrong: 0, total: answers.length };
  answers.forEach((a) => m[kindOf(a)]++);
  return m;
}

const round1 = (x: number) => Math.round(x * 10) / 10;
const rightFirstTime = (answers: QuestionAttempt[]) =>
  answers.length ? round1((mixOf(answers).first / answers.length) * 100) : null;

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}
const mean = (xs: number[]) => (xs.length ? round1(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

const measure = (value: number | null, previous: number | null, hasPrevious: boolean): Measure => {
  const prev = hasPrevious ? previous : null;
  return { value, previous: prev, change: value !== null && prev !== null ? round1(value - prev) : null };
};

/** Session length: to its end, or to its last finished activity if it never ended. */
function minutesOf(s: LearningSession): number {
  const ends = s.activities.map((a) => a.completed_at).filter((x): x is string => !!x);
  const end = s.ended_at ?? ends.sort().pop() ?? s.started_at;
  return Math.max(0, Date.parse(end) - Date.parse(s.started_at)) / 60000;
}

// ── Buckets for trend lines ──────────────────────────────────────────────────

/** Days of a week, weeks of a month, and weeks (or months, past half a year) for "all". */
function bucketsFor(range: Range, current: Period, firstRecord: Date | null): { from: Date; to: Date }[] {
  const end = current.to;
  const out: { from: Date; to: Date }[] = [];
  if (range === "week") {
    for (let d = current.from!; d < end; d = addDays(d, 1)) out.push({ from: d, to: addDays(d, 1) });
    return out;
  }
  const start = range === "month" ? current.from! : firstRecord ?? atMidnight(end);
  if (range === "all" && (end.getTime() - start.getTime()) / 86_400_000 > 183) {
    for (let d = new Date(start.getFullYear(), start.getMonth(), 1); d < end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
      out.push({ from: d, to: new Date(d.getFullYear(), d.getMonth() + 1, 1) });
    }
    return out;
  }
  // A month's first week starts on the 1st, not the Monday before it.
  for (let d = startOfWeek(start); d < end; d = addDays(d, 7)) {
    out.push({ from: range === "month" && d < start ? start : d, to: addDays(d, 7) });
  }
  return out;
}

function series<T>(
  buckets: { from: Date; to: Date }[],
  items: T[],
  at: (x: T) => string,
  value: (xs: T[]) => number | null,
): Point[] {
  return buckets.map(({ from, to }) => {
    const xs = items.filter((x) => inPeriod(at(x), { from, to }));
    return { start: localDate(from), value: xs.length ? value(xs) : null, n: xs.length };
  });
}

// ── Letters ──────────────────────────────────────────────────────────────────

const STATUS_BY_BAND = { good: "secure", warning: "learning", critical: "support", none: "learning" } as const;

/**
 * A letter not yet learned, from its latest session with answers, at the
 * engine's own 10% / 30% lines. Never "secure": ● means learned, and that is
 * the engine's mastery alone (user's decision, 2026-10-12) — a letter can be
 * answered perfectly once and still not be mastered.
 */
function statusFrom(rft: number | null): LetterStatus {
  const s = rft === null ? "learning" : STATUS_BY_BAND[errorBand(100 - rft)];
  return s === "secure" ? "learning" : s;
}

function letterEntries(sessions: LearningSession[], progress: any[], now: Date): LetterEntry[] {
  const before = sessions.filter((s) => Date.parse(s.started_at) < now.getTime());
  const statuses = letterStatuses(before, progress);
  return LETTER_SEQUENCE.map((letter) => {
    const own = before.filter((s) => s.letter === letter);
    const prog = progress.find((p) => p.letter === letter);
    const history = before
      .map((s) => ({ s, answers: answersOf(s).filter((a) => a.target_letter === letter) }))
      .filter(({ s, answers }) => s.letter === letter || answers.length > 0)
      .map(({ s, answers }) => ({
        at: s.started_at,
        rightFirstTime: rightFirstTime(answers),
        answers: answers.length,
      }));
    const withAnswers = history.filter((h) => h.answers > 0);
    const latest = withAnswers[withAnswers.length - 1]?.rightFirstTime ?? null;

    const learned = statuses[letter]?.mastered ?? false;
    // When the current run of mastery began: the letter's own finished
    // sessions, judged. Null for a letter known only from a saved row.
    let learnedAt: string | null = null;
    if (learned) {
      const completed = own.filter((s) => s.status === "completed");
      for (let i = completed.length - 1; i >= 0; i--) {
        const { state } = diagnose(answersOf(completed[i]), letter);
        if (state === "insufficient_data") continue;
        if (state !== "visual_mastery") break;
        learnedAt = completed[i].started_at;
      }
    }

    const status: LetterStatus = learned
      ? "secure"
      : history.length > 0
        ? statusFrom(latest)
        : prog
          ? "learning"
          : "not_started";
    return {
      letter,
      status,
      learned,
      learnedAt,
      latestRightFirstTime: latest,
      sessions: own.length || prog?.sessions_count || 0,
      lastPractised: own[own.length - 1]?.started_at ?? null,
      history,
    };
  });
}

// ── Mix-ups ──────────────────────────────────────────────────────────────────

const ORDER = (l: string) => {
  const i = (LETTER_SEQUENCE as readonly string[]).indexOf(l);
  return i < 0 ? LETTER_SEQUENCE.length : i;
};
const pairOf = (x: string, y: string): [string, string] =>
  ORDER(x) < ORDER(y) || (ORDER(x) === ORDER(y) && x < y) ? [x, y] : [y, x];

function countPairs(wrong: QuestionAttempt[]) {
  const m = new Map<string, { a: string; b: string; aChoseB: number; bChoseA: number }>();
  wrong.forEach((w) => {
    const [a, b] = pairOf(w.target_letter, w.selected_letter);
    const key = `${a}↔${b}`;
    const e = m.get(key) ?? { a, b, aChoseB: 0, bChoseA: 0 };
    if (w.target_letter === a) e.aChoseB++;
    else e.bChoseA++;
    m.set(key, e);
  });
  return m;
}

// ── The model ────────────────────────────────────────────────────────────────

export function buildReportModel(src: ReportSources, now: Date, range: Range): ReportModel {
  const { current, previous } = periodsFor(range, now);
  const sessions = src.rows
    .map(rowToSession)
    .filter((s): s is LearningSession => s !== null && Date.parse(s.started_at) < now.getTime())
    .sort((a, b) => Date.parse(a.started_at) - Date.parse(b.started_at));
  const legacySessions = src.rows.filter((r) => rowToSession(r) === null).length;

  const cur = sessions.filter((s) => inPeriod(s.started_at, current));
  const prev = previous ? sessions.filter((s) => inPeriod(s.started_at, previous)) : [];
  const hasPrev = previous !== null && prev.length > 0;

  const allAnswers = sessions.flatMap(answersOf);
  const curAnswers = cur.flatMap(answersOf);
  const prevAnswers = prev.flatMap(answersOf);
  const firstRecord = sessions[0] ? atMidnight(new Date(sessions[0].started_at)) : null;
  const buckets = bucketsFor(range, current, firstRecord);

  // ── Letters
  const entries = letterEntries(sessions, src.progress, now);
  const learnedBy = (t: Date) =>
    entries.filter((e) => e.learned && (e.learnedAt === null || Date.parse(e.learnedAt) < t.getTime())).length;
  const counts: Record<LetterStatus, number> = { secure: 0, learning: 0, support: 0, not_started: 0 };
  entries.forEach((e) => counts[e.status]++);

  // ── Skills
  const skill = (
    id: SkillId,
    label: string,
    pick: (a: Answer) => boolean,
  ): SkillEntry => {
    const c = curAnswers.filter(pick);
    const p = prevAnswers.filter(pick);
    return {
      id, label, unit: "%", lowerIsBetter: false, measured: true,
      measure: measure(rightFirstTime(c), rightFirstTime(p), hasPrev),
      series: series(buckets, allAnswers.filter(pick), (a) => a.at, rightFirstTime),
      n: c.length,
    };
  };
  const isLookalike = (a: Answer) => a.activity === "identify" && a.module_type !== "dissimilar";
  const tracing = (list: LearningSession[]) =>
    list.flatMap((s) =>
      s.activities.flatMap((a) => (a.outcome?.kind === "tracing" ? [{ at: s.started_at, score: a.outcome.score }] : [])),
    );
  const firstTimeMs = (list: Answer[]) =>
    list.filter((a) => kindOf(a) === "first" && a.time_to_interact_ms > 0).map((a) => a.time_to_interact_ms);
  const secs = (ms: number | null) => (ms === null ? null : round1(ms / 1000));

  const skillEntries: SkillEntry[] = [
    skill("sound", "Sound → letter", (a) => a.activity === "identify"),
    skill("lookalike", "Look-alike letters", isLookalike),
    skill("words", "Words", (a) => a.activity === "word_fill" || a.activity === "word_spelling"),
    {
      id: "writing", label: "Writing (tracing)", unit: "%", lowerIsBetter: false, measured: true,
      measure: measure(mean(tracing(cur).map((t) => t.score)), mean(tracing(prev).map((t) => t.score)), hasPrev),
      series: series(buckets, tracing(sessions), (t) => t.at, (ts) => mean(ts.map((t) => t.score))),
      n: tracing(cur).length,
    },
    {
      id: "speed", label: "Speed", unit: "s", lowerIsBetter: true, measured: true,
      measure: measure(secs(median(firstTimeMs(curAnswers))), secs(median(firstTimeMs(prevAnswers))), hasPrev),
      series: series(buckets, allAnswers, (a) => a.at, (xs) => secs(median(firstTimeMs(xs)))),
      n: firstTimeMs(curAnswers).length,
    },
    {
      id: "matras", label: "Matras", unit: "%", lowerIsBetter: false, measured: false,
      measure: { value: null, previous: null, change: null }, series: [], n: 0,
    },
  ];

  // ── Practice
  const minutes = (list: LearningSession[]) => Math.round(list.reduce((m, s) => m + minutesOf(s), 0));
  const days = (list: LearningSession[]) => new Set(list.map((s) => localDate(new Date(s.started_at)))).size;
  const dayStart = current.from ?? firstRecord ?? atMidnight(now);
  const history: DayEntry[] = [];
  const byDate = new Map<string, LearningSession[]>();
  sessions.forEach((s) => {
    const key = localDate(new Date(s.started_at));
    byDate.set(key, [...(byDate.get(key) ?? []), s]);
  });
  [...byDate.keys()].sort().forEach((date) => {
    const those = byDate.get(date)!;
    history.push({ date, sessions: those.length, minutes: minutes(those) });
  });
  const byDay: DayEntry[] = [];
  for (let d = atMidnight(dayStart); d < now; d = addDays(d, 1)) {
    const key = localDate(d);
    const those = cur.filter((s) => localDate(new Date(s.started_at)) === key);
    byDay.push({ date: key, sessions: those.length, minutes: minutes(those) });
  }

  // ── Mix-ups
  const wrongNow = curAnswers.filter((a) => kindOf(a) === "wrong");
  const wrongBefore = prevAnswers.filter((a) => kindOf(a) === "wrong");
  const earlier = current.from
    ? allAnswers.filter((a) => Date.parse(a.at) < current.from!.getTime() && kindOf(a) === "wrong")
    : [];
  const nowPairs = countPairs(wrongNow);
  const beforePairs = countPairs(wrongBefore);
  const earlierPairs = countPairs(earlier);
  const pairs: MixupPair[] = [...nowPairs.entries()]
    .map(([key, e]) => {
      const before = beforePairs.get(key);
      return {
        a: e.a, b: e.b, count: e.aChoseB + e.bChoseA,
        previous: hasPrev ? (before ? before.aChoseB + before.bChoseA : 0) : null,
        aChoseB: e.aChoseB, bChoseA: e.bChoseA,
        isNew: current.from !== null && !earlierPairs.has(key),
      };
    })
    .sort((x, y) => y.count - x.count || ORDER(x.a) - ORDER(y.a));
  const identify = curAnswers.filter((a) => a.activity === "identify");
  const split = (list: Answer[]) => ({ wrong: list.filter((a) => kindOf(a) === "wrong").length, answers: list.length });

  // ── Practise next: the top mix-up, else a letter that needs support.
  const top = pairs[0];
  const weakest = entries
    .filter((e) => e.status === "support" && e.latestRightFirstTime !== null && cur.some((s) => s.letter === e.letter))
    .sort((x, y) => x.latestRightFirstTime! - y.latestRightFirstTime!)[0];
  const practiseNext: PractiseNext | null =
    top && top.count >= 2
      ? { kind: "mixup", a: top.a, b: top.b, count: top.count }
      : weakest
        ? { kind: "letter", letter: weakest.letter, rightFirstTime: weakest.latestRightFirstTime! }
        : null;

  return {
    childName: src.displayName,
    range,
    now: now.toISOString(),
    current,
    previous,
    dataSource: src.source,
    hasAnySessions: sessions.length > 0 || legacySessions > 0,
    lastPractised: sessions[sessions.length - 1]?.started_at ?? null,
    legacySessions,
    letters: {
      entries,
      learned: measure(learnedBy(now), previous ? learnedBy(previous.to) : null, previous !== null),
      learnedInPeriod: entries
        .filter((e) => e.learned && e.learnedAt !== null && inPeriod(e.learnedAt, current))
        .map((e) => e.letter),
      counts,
    },
    skills: {
      rightFirstTime: measure(rightFirstTime(curAnswers), rightFirstTime(prevAnswers), hasPrev),
      series: series(buckets, allAnswers, (a) => a.at, rightFirstTime),
      mix: mixOf(curAnswers),
      entries: skillEntries,
    },
    practice: {
      sessions: measure(cur.length, prev.length, previous !== null),
      minutes: measure(minutes(cur), minutes(prev), previous !== null),
      days: measure(days(cur), days(prev), previous !== null),
      elapsedDays: byDay.length,
      byDay,
      history,
      finished: cur.filter((s) => s.status === "completed").length,
      stopped: cur.filter((s) => s.status === "abandoned").length,
      inProgress: cur.filter((s) => s.status === "in_progress").length,
      list: [...cur].reverse().map((s) => {
        const answers = answersOf(s);
        return {
          id: s.session_id, at: s.started_at, letter: s.letter, minutes: Math.round(minutesOf(s)),
          status: s.status, answers: answers.length, rightFirstTime: rightFirstTime(answers),
        };
      }),
    },
    mixups: {
      total: measure(wrongNow.length, wrongBefore.length, previous !== null),
      pairs,
      shape: {
        lookalike: split(identify.filter((a) => a.module_type !== "dissimilar")),
        different: split(identify.filter((a) => a.module_type === "dissimilar")),
      },
    },
    practiseNext,
  };
}
