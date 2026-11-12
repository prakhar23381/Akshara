import { LETTER_SEQUENCE, type LessonKind } from "../types/levelConfig";
import type { ActivityType } from "../types/session";

/**
 * The course as data: which letters are taught, in what order, in what units,
 * and what a lesson on a letter is made of (docs/12_CURRICULUM_PLAN.md, G1).
 *
 * Everything that walks "the letters in teaching order" reads it from here, so
 * the order is one switch and a new unit — the vowels, say — is one more row.
 * Nothing here may assume there are 33 letters or that they are consonants.
 *
 * `LETTER_SEQUENCE` (the varnamala) stays what it was: the order a parent
 * knows, used by the report and the child's letter collection.
 */

/**
 * The draft teaching order (plan §4.1). Three rules: no two look-alikes in one
 * unit (checked against `DISTRACTOR_POOLS` in tests/curriculum.test.ts),
 * letters that make many simple words first, and each "puff of air" letter
 * after its plain partner.
 */
export const UNITS: readonly (readonly string[])[] = [
  ["क", "ल", "र", "ज", "प"],
  ["म", "स", "द", "य", "ड"],
  ["न", "ह", "च", "व", "श"],
  ["त", "ट", "ब", "ग"],
  ["ख", "फ", "छ", "भ", "ठ"],
  ["घ", "थ", "झ", "ढ"],
  ["ध", "ष", "ण"],
  ["ङ", "ञ"],
];

/** Letters to a roadmap page when the varnamala order is on, as before G1. */
const VARNAMALA_PAGE = 10;

const varnamalaPages = (): string[][] => {
  const pages: string[][] = [];
  for (let i = 0; i < LETTER_SEQUENCE.length; i += VARNAMALA_PAGE) {
    pages.push(LETTER_SEQUENCE.slice(i, i + VARNAMALA_PAGE));
  }
  return pages;
};

/**
 * The switch (plan §4.1, question T1). "units" is the order above; "varnamala"
 * restores क ख ग घ ङ … in pages of ten. Saved progress is keyed by letter, so
 * changing this loses nothing.
 */
export const ORDER_MODE: "units" | "varnamala" = "units";

/** The roadmap's pages: one per unit. */
export const TEACHING_UNITS: readonly (readonly string[])[] =
  ORDER_MODE === "units" ? UNITS : varnamalaPages();

/** Every taught letter, in the order a child meets them. */
export const TEACHING_ORDER: readonly string[] = TEACHING_UNITS.flat();

// ── A letter: three lessons (plan §5) ────────────────────────────────────────

/** The lessons on a letter, in order. */
export const LESSON_KINDS: readonly LessonKind[] = ["meet", "find", "words"];

/**
 * What each lesson is made of, from the games that exist today. Meet is shown
 * then tried among different-shape letters; Find it is the letter by itself;
 * In words is the letter in text. The barakhadi is in none of them: matras get
 * their own part of the course (plan §4.3).
 */
export const LESSON_STEPS: Record<LessonKind, readonly ActivityType[]> = {
  meet: ["intro", "pronunciation", "example_words", "tracing", "identify"],
  find: ["identify", "memory"],
  words: ["word_fill", "word_spelling"],
};

/** Listen & tap questions in a lesson that has the game. */
export const IDENTIFY_QUESTIONS: Partial<Record<LessonKind, number>> = {
  meet: 3,
  find: 5,
};

/** As an adult reads them — the engine's reasoning and the docs use these. */
export const LESSON_LABEL: Record<LessonKind, string> = {
  meet: "Meet",
  find: "Find it",
  words: "In words",
};

/**
 * The lesson that follows the last one a child finished on a letter. Meet is
 * played once; after that Find it and In words take turns, so a letter that is
 * already complete can still be practised.
 */
export function lessonAfter(last: LessonKind | null): LessonKind {
  if (last === null) return "meet";
  return last === "find" ? "words" : "find";
}
