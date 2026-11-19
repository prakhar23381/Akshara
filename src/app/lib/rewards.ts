import { isLetterLesson, type LearningSession } from "../types/session";
import { getLetterContent } from "../data/letterContent";
import { dayOf } from "./letterStatus";

/**
 * The child's own rewards (G4; docs/11 §3.4–3.6): the week strip, the tree,
 * today's mission and its sticker. Worked out from the saved sessions on every
 * read, like everything else, so there is nothing to store and nothing that
 * can be lost.
 *
 * - **Nothing resets.** The week strip starts fresh on Monday, but last week's
 *   days stay in the tree, which only ever grows: one leaf per day practised.
 * - **The mission is one lesson.** It is met by any finished lesson today and
 *   is never shown as failed.
 *
 * Pure: sessions and `now` in. Days are the device's, which are the child's.
 */

export const WEEKDAYS_HI = ["सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि", "रवि"];
/** One sticker per weekday on the strip (emoji until drawn ones exist, D2). */
export const DAY_STICKERS = ["🐄", "🐇", "🪷", "🥕", "🏡", "🐘", "🦚"];

const finished = (sessions: LearningSession[]) => sessions.filter((s) => s.status === "completed");

/** Every calendar day on which the child finished a lesson. */
export function practisedDays(sessions: LearningSession[]): Set<string> {
  return new Set(finished(sessions).map((s) => dayOf(s.ended_at ?? s.started_at)));
}

/** Monday 00:00 of `now`'s week, local time. */
function mondayOf(now: Date): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

export interface WeekDay {
  label: string;
  practised: boolean;
  today: boolean;
  /** Shown on a practised day. */
  sticker: string;
}

/** This week, Monday to Sunday. */
export function weekStrip(sessions: LearningSession[], now: Date): WeekDay[] {
  const days = practisedDays(sessions);
  const monday = mondayOf(now);
  const today = dayOf(now.toISOString());
  return WEEKDAYS_HI.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = dayOf(d.toISOString());
    return { label, practised: days.has(key), today: key === today, sticker: DAY_STICKERS[i] };
  });
}

/** One leaf per day ever practised. It never shrinks. */
export const treeLeaves = (sessions: LearningSession[]): number => practisedDays(sessions).size;

/** Today's mission: one finished lesson. */
export const missionDone = (sessions: LearningSession[], now: Date): boolean =>
  practisedDays(sessions).has(dayOf(now.toISOString()));

/** A letter's sticker: the picture of its first example word (गाय 🐄 for ग). */
export function letterSticker(letter: string): { emoji: string; word: string } | null {
  const w = getLetterContent(letter).exampleWords[0];
  return w ? { emoji: w.image, word: w.word } : null;
}

/**
 * Today's sticker, in the mission's chest: the word picture of the letter of
 * today's latest lesson on one letter — the reward is also a second look at a
 * word — or the weekday's sticker if today held only review.
 */
export function todaysSticker(sessions: LearningSession[], now: Date): { emoji: string; word: string } | null {
  const today = dayOf(now.toISOString());
  const done = finished(sessions)
    .filter((s) => dayOf(s.ended_at ?? s.started_at) === today)
    .sort((a, b) => Date.parse(b.started_at) - Date.parse(a.started_at));
  if (done.length === 0) return null;
  const letterLesson = done.find(isLetterLesson);
  const fromLetter = letterLesson ? letterSticker(letterLesson.letter) : null;
  return fromLetter ?? { emoji: DAY_STICKERS[(now.getDay() + 6) % 7], word: "" };
}

/**
 * Whether today's chest has been opened, on this device. A convenience only —
 * worst case, a cleared browser offers the same sticker's chest again.
 */
const chestKey = (childId: string, now: Date) => `akshara_chest_opened:${childId}:${dayOf(now.toISOString())}`;
export function chestOpened(childId: string, now: Date): boolean {
  try {
    return localStorage.getItem(chestKey(childId, now)) === "1";
  } catch {
    return false;
  }
}
export function markChestOpened(childId: string, now: Date): void {
  try {
    localStorage.setItem(chestKey(childId, now), "1");
  } catch {
    /* storage unavailable: the chest simply shows again */
  }
}

// ── The celebration's quality cards (docs/11 §3.7) ───────────────────────────

export type QualityId = "sharpEyes" | "steadyHand" | "memoryMagic" | "neverGaveUp" | "finished";

/**
 * The quality cards a finished lesson earned: each praises something true the
 * child did, never a score or a time. Up to two, in a fixed order of
 * preference, then always "पूरा किया" — so a lesson shows one to three cards,
 * every one of them honest (the user's choice, 2026-11-19).
 *
 * "अच्छे श्रोता" (pressed Listen again) is not offered yet: replays are not
 * recorded, and a card must be true.
 */
export function qualitiesOf(session: LearningSession): QualityId[] {
  const done = (t: string) => session.activities.some((a) => a.type === t && a.completed_at);
  const answers = session.activities.flatMap((a) =>
    a.outcome?.kind === "questions" ? a.outcome.attempts.map((x) => ({ ...x, activity: a.type })) : [],
  );
  const facts: [QualityId, boolean][] = [
    [
      "sharpEyes",
      answers.some(
        (x) =>
          (x.activity === "identify" || x.activity === "see_match") &&
          x.module_type !== "dissimilar" &&
          !x.was_guided_win &&
          x.target_letter === x.selected_letter,
      ),
    ],
    ["steadyHand", done("tracing")],
    ["memoryMagic", done("memory")],
    ["neverGaveUp", answers.some((x) => !x.was_guided_win && x.target_letter !== x.selected_letter)],
  ];
  return [...facts.filter(([, yes]) => yes).map(([id]) => id).slice(0, 2), "finished"];
}

/** Whether this is the first lesson the child finished today: today's sticker lands, and the mission's chest. */
export function firstToday(sessions: LearningSession[], session: LearningSession): boolean {
  const today = dayOf(session.ended_at ?? session.started_at);
  return !finished(sessions).some(
    (s) =>
      s.session_id !== session.session_id &&
      dayOf(s.ended_at ?? s.started_at) === today &&
      Date.parse(s.started_at) < Date.parse(session.started_at),
  );
}
