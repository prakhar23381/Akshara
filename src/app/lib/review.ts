import type { QuestionAttempt } from "../types/levelConfig";
import { isLetterLesson, type ActivityRecord, type LearningSession } from "../types/session";
import {
  BOX_DAYS,
  CONTRAST_PAIRS,
  PERSONAL_PAIR_PICKS,
  PRACTICE_LESSONS,
  PRACTICE_WHEN_WEAK,
  TEACHING_ORDER,
  TEACHING_UNITS,
} from "../data/curriculum";
import { DISTRACTOR_POOLS, isMiss } from "./adaptiveEngine";
import { isLetter, type LetterStatus } from "./letterStatus";

/**
 * Spaced review (docs/12_CURRICULUM_PLAN.md §6.1, G2): which earlier letters a
 * lesson's warm-up asks about.
 *
 * Every complete letter sits in a box, 1 to 5, and is due again 1, 2, 4, 7 or
 * 14 days after it was last asked. A review answer right without help moves it
 * up a box; wrong, or answered by the app, sends it back to box 1. Like a
 * letter's status, the boxes are worked out from the saved answers on every
 * read — there is no table to keep in step.
 *
 * Review answers are the warm-up's, every answer in a lesson on several
 * letters (side by side, practice, unit check) and a letter lesson's check
 * question. A letter lesson's own questions are teaching, not review: they
 * decide the letter's stage (letterStatus.ts), not its box.
 *
 * Pure: sessions and statuses in, boxes out; `now` is passed in.
 */

const DAY_MS = 86_400_000;

export interface ReviewBox {
  /** 1–5. */
  box: number;
  /** When the letter was last asked in review, or when it became complete (ms). */
  lastAt: number;
  /** When it is due again (ms). */
  dueAt: number;
}

const dueAfter = (box: number, at: number) => at + BOX_DAYS[box - 1] * DAY_MS;

/** The questions of one activity, each with the first answer given to it. */
export function firstAnswers(attempts: QuestionAttempt[]): QuestionAttempt[] {
  const out: QuestionAttempt[] = [];
  let prev: QuestionAttempt | null = null;
  for (const a of attempts) {
    // A wrong tap and its retry share a question number (G2). Answers saved
    // before numbering: a retry is the next answer on the same letter.
    const same =
      prev !== null &&
      (a.q !== undefined || prev.q !== undefined
        ? a.q === prev.q
        : a.target_letter === prev.target_letter);
    if (!same) out.push(a);
    prev = a;
  }
  return out;
}

/** The review answers in a session, first answer to each question only. */
export function reviewAnswers(s: LearningSession): QuestionAttempt[] {
  const asked = (act: ActivityRecord) =>
    act.outcome?.kind === "questions" ? firstAnswers(act.outcome.attempts) : [];
  if (!isLetterLesson(s)) {
    return s.activities.filter((a) => a.type === "identify").flatMap(asked);
  }
  return s.activities.flatMap((act) => {
    if (act.type === "warmup") return asked(act);
    // The check question: Listen & tap on another letter in a letter lesson.
    if (act.type === "identify") return asked(act).filter((a) => a.target_letter !== s.letter);
    return [];
  });
}

/** A letter lesson that completes its letter: In words, or a session from before lessons. */
const completes = (s: LearningSession) =>
  s.status === "completed" &&
  isLetterLesson(s) &&
  (!s.level_config?.lesson || s.level_config.lesson === "words");

export function reviewBoxes(sessions: LearningSession[]): Record<string, ReviewBox> {
  const out: Record<string, ReviewBox> = {};
  const ordered = [...sessions].sort((a, b) => Date.parse(a.started_at) - Date.parse(b.started_at));
  for (const s of ordered) {
    const at = Date.parse(s.ended_at ?? s.started_at);
    for (const a of reviewAnswers(s)) {
      const b = out[a.target_letter];
      if (!b) continue; // not complete yet: not in review
      b.box = isMiss(a) ? 1 : Math.min(BOX_DAYS.length, b.box + 1);
      b.lastAt = at;
      b.dueAt = dueAfter(b.box, at);
    }
    // A letter enters box 1 when it is first complete.
    if (completes(s) && !out[s.letter]) {
      out[s.letter] = { box: 1, lastAt: at, dueAt: dueAfter(1, at) };
    }
  }
  return out;
}

/**
 * Complete letters in the order review should ask them: those due first —
 * letters still at "learning the shape" before others, then the most overdue
 * — then the rest, soonest due first. A warm-up takes the first two, so it
 * always has something to ask once a child has two complete letters.
 */
export function reviewOrder(
  boxes: Record<string, ReviewBox>,
  statuses: Record<string, LetterStatus>,
  now: number,
): string[] {
  const shape = (l: string) => statuses[l]?.state === "gross_shape_blindness";
  return Object.entries(boxes)
    .sort(([la, a], [lb, b]) => {
      const dueA = a.dueAt <= now;
      const dueB = b.dueAt <= now;
      if (dueA !== dueB) return dueA ? -1 : 1;
      if (dueA && shape(la) !== shape(lb)) return shape(la) ? -1 : 1;
      return a.dueAt - b.dueAt;
    })
    .map(([l]) => l);
}

// ── What each unit holds besides its letters (plan §5–6) ─────────────────────

export interface ContrastItem {
  /** The two letters, in teaching order. */
  pair: [string, string];
  /** Added because this child mixed the two up, not from the fixed list. */
  personal: boolean;
  /** Both letters complete. */
  open: boolean;
  /** Played to the end at least once. */
  done: boolean;
}

export interface UnitPlan {
  unit: number;
  letters: string[];
  /** Every letter's three lessons finished. */
  complete: boolean;
  /** Lessons side by side whose later letter is in this unit. Never block anything. */
  contrasts: ContrastItem[];
  practice: {
    /** Letters still at "learning the shape". */
    weak: string[];
    /** Practice lessons finished in this unit. */
    done: number;
    /** Still owed before the unit check. */
    needed: boolean;
    /** Worth showing: owed, or already played. */
    shown: boolean;
  };
  checkpoint: { open: boolean; done: boolean };
}

const byOrder = (a: string, b: string) => TEACHING_ORDER.indexOf(a) - TEACHING_ORDER.indexOf(b);
const pairKey = (a: string, b: string) => [a, b].sort(byOrder).join("");

/** Whether the engine's look-alike table links two letters, either way round. */
const lookAlike = (a: string, b: string) =>
  Boolean(DISTRACTOR_POOLS[a]?.hard.includes(b) || DISTRACTOR_POOLS[b]?.hard.includes(a));

/**
 * Pairs this child has mixed up often enough to earn a lesson side by side:
 * unaided wrong picks, either way round, between two letters the look-alike
 * table links. A slip between letters that look nothing alike (क for स, among
 * different-shape choices) is a shape problem, which practice serves; putting
 * them side by side would teach nothing — and the first headless run of G2
 * showed such slips filling a unit with cards.
 */
export function personalPairs(sessions: LearningSession[]): [string, string][] {
  const counts = new Map<string, number>();
  for (const s of sessions) {
    for (const act of s.activities) {
      if (act.outcome?.kind !== "questions") continue;
      for (const a of act.outcome.attempts) {
        if (a.was_guided_win || a.target_letter === a.selected_letter) continue;
        if (!isLetter(a.selected_letter)) continue;
        if (!TEACHING_ORDER.includes(a.target_letter) || !TEACHING_ORDER.includes(a.selected_letter)) continue;
        if (!lookAlike(a.target_letter, a.selected_letter)) continue;
        const k = pairKey(a.target_letter, a.selected_letter);
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
    }
  }
  return [...counts.entries()]
    .filter(([, n]) => n >= PERSONAL_PAIR_PICKS)
    .map(([k]) => [...k] as [string, string]);
}

/** Finished review lessons of one kind. */
const finished = (sessions: LearningSession[], kind: string) =>
  sessions.filter((s) => s.status === "completed" && s.level_config?.lesson === kind);

/**
 * Each unit's lessons beyond its letters, and which are open and done. Worked
 * out from the saved sessions on every read, like everything else.
 *
 * - **Side by side** for each fixed look-alike pair, and each pair this child
 *   has mixed up, once both letters are complete. Shown in the unit of the
 *   later letter. Optional: they never hold the child back.
 * - **Practice**: when the unit's letters are all complete and at least two
 *   are still at "learning the shape", two practice lessons come before the
 *   unit check. Once played they stay shown, so the count cannot vanish.
 * - **The unit check** opens when the letters are complete and no practice is
 *   owed. Finishing it opens the next unit (`pageOpen`).
 */
export function unitPlans(
  sessions: LearningSession[],
  statuses: Record<string, LetterStatus>,
): UnitPlan[] {
  const complete = (l: string) => statuses[l]?.complete ?? false;
  const fixed = CONTRAST_PAIRS.map(([a, b]) => pairKey(a, b));
  const pairs = [
    ...fixed.map((k) => ({ k, personal: false })),
    ...personalPairs(sessions)
      .map(([a, b]) => pairKey(a, b))
      .filter((k) => !fixed.includes(k))
      .map((k) => ({ k, personal: true })),
  ];
  const contrastDone = new Set(
    finished(sessions, "contrast").map((s) => pairKey(s.level_config.focus?.[0] ?? "", s.level_config.focus?.[1] ?? "")),
  );
  const practiceDone = finished(sessions, "practice");
  const checkDone = new Set(finished(sessions, "checkpoint").map((s) => s.level_config.unit));

  return TEACHING_UNITS.map((unitLetters, unit) => {
    const letters = [...unitLetters];
    const allComplete = letters.every(complete);
    const contrasts = pairs
      .filter(({ k }) => letters.includes([...k][1]))
      .map(({ k, personal }) => {
        const [a, b] = [...k] as [string, string];
        return { pair: [a, b] as [string, string], personal, open: complete(a) && complete(b), done: contrastDone.has(k) };
      });
    const weak = letters.filter((l) => statuses[l]?.state === "gross_shape_blindness");
    const done = practiceDone.filter((s) => s.level_config.unit === unit).length;
    const needed = allComplete && weak.length >= PRACTICE_WHEN_WEAK && done < PRACTICE_LESSONS;
    return {
      unit,
      letters,
      complete: allComplete,
      contrasts,
      practice: { weak, done, needed, shown: needed || done > 0 },
      checkpoint: { open: allComplete && !needed, done: checkDone.has(unit) },
    };
  });
}

/** Units whose check has been finished: what opens the next unit. */
export const checkpointsDone = (plans: UnitPlan[]): Set<number> =>
  new Set(plans.filter((p) => p.checkpoint.done).map((p) => p.unit));
