import { LETTER_SEQUENCE, type LessonKind, type LetterLesson } from "../types/levelConfig";
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

/** The lessons on a letter, in order. Review lessons (G2) are not among them. */
export const LESSON_KINDS: readonly LetterLesson[] = ["meet", "find", "words"];

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
  // Review lessons (G2), from the games that exist: Listen & tap over the
  // lesson's letters, then Memory with them.
  contrast: ["identify", "memory"],
  practice: ["identify", "memory"],
  checkpoint: ["identify", "memory"],
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
  contrast: "Side by side",
  practice: "Practice",
  checkpoint: "Unit check",
};

// ── Review (plan §6, G2) ─────────────────────────────────────────────────────

/** Questions on earlier letters at the start of a lesson (plan §6.1, question E7). */
export const WARMUP_QUESTIONS = 2;

/**
 * The review boxes: a letter in box n is due again this many days after it
 * was last asked. Right without help moves it up a box; wrong or supplied
 * sends it back to box 1.
 */
export const BOX_DAYS = [1, 2, 4, 7, 14] as const;

/**
 * Look-alike pairs that get a lesson side by side once both letters are
 * complete: the "puff of air" pairs, where the letters also sound alike, taken
 * from those the engine's look-alike table lists both ways. च/छ is the ninth
 * puff pair but the table does not list it either way, so it comes only when a
 * child actually mixes them up (`PERSONAL_PAIR_PICKS`).
 */
export const CONTRAST_PAIRS: readonly (readonly [string, string])[] = [
  ["क", "ख"],
  ["ग", "घ"],
  ["ज", "झ"],
  ["ट", "ठ"],
  ["ड", "ढ"],
  ["त", "थ"],
  ["प", "फ"],
  ["ब", "भ"],
];

/** A pair this child has mixed up this often (either way, unaided) gets its own lesson side by side. */
export const PERSONAL_PAIR_PICKS = 2;

/** Listen & tap questions in a lesson side by side, and in a practice lesson. */
export const CONTRAST_QUESTIONS = 6;
export const PRACTICE_QUESTIONS = 6;

/**
 * Practice before the unit check: when this many of a unit's letters are still
 * at "learning the shape" once all are complete, the unit gets this many
 * practice lessons first (plan §5, question E4).
 */
export const PRACTICE_WHEN_WEAK = 2;
export const PRACTICE_LESSONS = 2;

/** Older letters added to a unit check, most overdue first (plan §6.3). */
export const CHECKPOINT_OLDER = 2;

/** The unit a letter is taught in, or -1. */
export const unitOf = (letter: string): number =>
  TEACHING_UNITS.findIndex((u) => u.includes(letter));

/**
 * The lesson that follows the last one a child finished on a letter. Meet is
 * played once; after that Find it and In words take turns, so a letter that is
 * already complete can still be practised.
 */
export function lessonAfter(last: LetterLesson | null): LetterLesson {
  if (last === null) return "meet";
  return last === "find" ? "words" : "find";
}
