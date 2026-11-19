import type { QuestionAttempt } from "../types/levelConfig";
import { isLetterLesson, type ActivityRecord, type LearningSession } from "../types/session";
import { BOX_DAYS } from "../data/curriculum";
import { isMiss } from "./adaptiveEngine";
import type { LetterStatus } from "./letterStatus";

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
