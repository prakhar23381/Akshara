import {
  LETTER_SEQUENCE,
  type CognitiveState,
  type LessonKind,
  type QuestionAttempt,
} from "../types/levelConfig";
import { sessionAttempts, type LearningSession } from "../types/session";
import { diagnose, isMiss, overallErrorRate } from "./adaptiveEngine";
import { TEACHING_UNITS, lessonAfter } from "../data/curriculum";

/**
 * Where a child stands on each letter, worked out from their saved answers.
 *
 * The app used to trust the labels it saved at the end of each session — the
 * session's `cognitive_state` and `letter_progress.mastered`. Those were
 * written under the rule of the day, so when the rule changed (TODO E2: an
 * answer the app supplied had counted as right) every label written before
 * stayed wrong until the letter was played again. Statuses are now judged
 * again from the answers on every read, with today's rules, and nothing saved
 * is rewritten. A letter with no saved answers — only a `letter_progress` row
 * from before the session model — keeps its saved label.
 *
 * **A mix-up is evidence about both letters (TODO E3).** Tapping क when asked
 * for ब says the child's idea of क is too loose, which a question that only
 * ever asks for क cannot catch. A mix-up alone never takes mastery away: once a
 * mastered letter has been picked by mistake `CHECK_AFTER_PICKS` times, the
 * planner asks for it once, in the Listen & tap of whatever the child plays
 * next. Right first time keeps it mastered and settles the mix-ups; wrong, or
 * answered by the app, puts it back to "still learning" until the child next
 * plays that letter.
 *
 * **A letter is taught in three lessons (G1), and judged on two of them
 * together.** A lesson alone is five or six answers, so the status is judged on
 * the letter's latest Listen & tap answers and its latest word-game answers
 * pooled — the same eleven or so, by the same rules, as when one session held
 * every game. A session from before lessons replaces both at once, which is
 * exactly how it was judged then. A lesson can only make a letter mastered once
 * the letter has word-game answers: Find it alone is not enough.
 *
 * Pure: sessions and saved rows in, statuses out.
 */

/** Mistaken picks of a mastered letter before it is asked for again. One tap can be a guess. */
export const CHECK_AFTER_PICKS = 2;

/** A `letter_progress` row as saved — the fields this module reads. */
export interface SavedProgress {
  letter: string;
  mastered?: boolean | null;
  last_cognitive_state?: string | null;
  sessions_count?: number | null;
}

export interface LetterStatus {
  state: CognitiveState;
  mastered: boolean;
  /** Sessions on this letter, finished or not — or the saved count, if larger. */
  sessions: number;
  /** Judged at least once: from a finished session's answers, or a saved row. */
  judged: boolean;
  /**
   * Unaided picks of this letter in place of another since it was last judged
   * or checked, keyed by the letter that was asked for. Counted only while the
   * letter is mastered.
   */
  pickedFor: Record<string, number>;
  /** Mastered, and picked by mistake often enough to be asked for once more. */
  checkDue: boolean;
  /** The lessons the child has finished on this letter, at least once each. */
  lessons: Record<LessonKind, boolean>;
  /**
   * In words finished: the letter's three lessons are done and the course
   * moves on. Not the same as mastered — that is how well, this is how far.
   */
  complete: boolean;
  /** The lesson a child opening this letter plays now. */
  nextLesson: LessonKind;
  /** Share missed of the answers the status was judged on; null if never judged from answers. */
  errorRate: number | null;
}

/**
 * A single letter, not a matra, a half-form or a whole word. The word games
 * have recorded matras and whole words as `selected_letter` (see the W3 grapheme
 * fix); counting those as confusions would offer a child a vowel sign as a
 * "letter" distractor, or a word as a mix-up.
 */
export const isLetter = (s: string) => /^\p{Lo}$/u.test(s);

const STATES: CognitiveState[] = [
  "gross_shape_blindness",
  "feature_neglect",
  "visual_mastery",
  "insufficient_data",
];
const asState = (v: unknown): CognitiveState =>
  STATES.includes(v as CognitiveState) ? (v as CognitiveState) : "insufficient_data";

const blank = (): LetterStatus => ({
  state: "insufficient_data",
  mastered: false,
  sessions: 0,
  judged: false,
  pickedFor: {},
  checkDue: false,
  lessons: { meet: false, find: false, words: false },
  complete: false,
  nextLesson: "meet",
  errorRate: null,
});

const ALL_LESSONS = (): Record<LessonKind, boolean> => ({ meet: true, find: true, words: true });
const WORD_GAMES = ["word_fill", "word_spelling"];

export function letterStatuses(
  sessions: LearningSession[],
  saved: SavedProgress[] = [],
): Record<string, LetterStatus> {
  const out: Record<string, LetterStatus> = {};
  const get = (letter: string) => (out[letter] ??= blank());

  // The saved label is only the starting point; answers override it.
  saved.forEach((row) => {
    if (!row?.letter) return;
    const st = get(row.letter);
    const state = asState(row.last_cognitive_state);
    st.mastered = Boolean(row.mastered) || state === "visual_mastery";
    st.state = st.mastered ? "visual_mastery" : state;
    st.sessions = Math.max(st.sessions, row.sessions_count ?? 0);
    st.judged = true;
  });

  const played: Record<string, number> = {};
  // The answers each letter is judged on: its latest Listen & tap and its
  // latest word games, which since G1 come from different sessions.
  const pools: Record<string, { heard: QuestionAttempt[]; inWords: QuestionAttempt[] }> = {};
  // The last lesson finished on each letter, which decides the next one.
  const last: Record<string, LessonKind> = {};
  const ordered = [...sessions].sort(
    (a, b) => Date.parse(a.started_at) - Date.parse(b.started_at),
  );

  for (const s of ordered) {
    get(s.letter);
    played[s.letter] = (played[s.letter] ?? 0) + 1;
    const attempts = sessionAttempts(s);
    const checked = new Set<string>();

    for (const a of attempts) {
      // A check question: the first answer on another letter decides it. The
      // retries that follow a wrong tap are the same question.
      if (a.target_letter !== s.letter && !checked.has(a.target_letter)) {
        checked.add(a.target_letter);
        const st = out[a.target_letter];
        if (st) {
          if (st.mastered && isMiss(a)) {
            st.mastered = false;
            st.state = "feature_neglect";
          }
          st.pickedFor = {};
        }
      }

      // A mix-up: a mastered letter tapped, unaided, in place of another.
      if (
        !a.was_guided_win &&
        a.selected_letter !== a.target_letter &&
        isLetter(a.selected_letter)
      ) {
        const st = out[a.selected_letter];
        if (st?.mastered) {
          st.pickedFor[a.target_letter] = (st.pickedFor[a.target_letter] ?? 0) + 1;
        }
      }
    }

    // The session's own letter, judged on its own questions by today's rules.
    // An abandoned session was never judged; a finished one with no questions
    // on its letter has nothing to judge, so it leaves the status as it was.
    if (s.status === "completed") {
      const st = get(s.letter);
      const lesson = s.level_config?.lesson;
      // A session from before lessons played every game: all three at once.
      if (lesson) st.lessons[lesson] = true;
      else st.lessons = ALL_LESSONS();
      last[s.letter] = lesson ?? "words";

      const own = (words: boolean) =>
        s.activities
          .filter((a) => WORD_GAMES.includes(a.type) === words)
          .flatMap((a) => (a.outcome?.kind === "questions" ? a.outcome.attempts : []))
          .filter((a) => a.target_letter === s.letter);
      const heard = own(false);
      const inWords = own(true);
      if (heard.length + inWords.length > 0) {
        const pool = (pools[s.letter] ??= { heard: [], inWords: [] });
        if (!lesson) {
          pool.heard = heard;
          pool.inWords = inWords;
        } else {
          if (heard.length > 0) pool.heard = heard;
          if (inWords.length > 0) pool.inWords = inWords;
        }
        const judgedOn = [...pool.heard, ...pool.inWords];
        let { state } = diagnose(judgedOn, s.letter);
        if (lesson && state === "visual_mastery" && pool.inWords.length === 0) {
          state = "feature_neglect";
        }
        if (state !== "insufficient_data") {
          st.state = state;
          st.mastered = state === "visual_mastery";
          st.judged = true;
          st.pickedFor = {};
          st.errorRate = overallErrorRate(judgedOn);
        }
      }
    }
  }

  // A letter known only from a saved row — from before sessions were kept —
  // was played whole, like any session from before lessons.
  saved.forEach((row) => {
    if (!row?.letter || played[row.letter]) return;
    const st = out[row.letter];
    if (st && (row.sessions_count ?? 0) > 0) {
      st.lessons = ALL_LESSONS();
      last[row.letter] = "words";
    }
  });

  for (const [letter, st] of Object.entries(out)) {
    st.complete = st.lessons.words;
    st.nextLesson = lessonAfter(last[letter] ?? null);
    st.sessions = Math.max(st.sessions, played[letter] ?? 0);
    st.checkDue = st.mastered && picksOf(st) >= CHECK_AFTER_PICKS;
  }
  return out;
}

const picksOf = (st: LetterStatus) =>
  Object.values(st.pickedFor).reduce((sum, n) => sum + n, 0);

export interface DueCheck {
  letter: string;
  /** How many times it was picked by mistake. */
  picks: number;
  /** The letters it was picked in place of, most often first. */
  pickedFor: string[];
}

/** Letters due a check question, the most often mistaken first. */
export function checksDue(statuses: Record<string, LetterStatus>): DueCheck[] {
  const order = (l: string) => LETTER_SEQUENCE.indexOf(l as (typeof LETTER_SEQUENCE)[number]);
  return Object.entries(statuses)
    .filter(([, st]) => st.checkDue)
    .map(([letter, st]) => ({
      letter,
      picks: picksOf(st),
      pickedFor: Object.entries(st.pickedFor)
        .sort((a, b) => b[1] - a[1])
        .map(([l]) => l),
    }))
    .sort((a, b) => b.picks - a.picks || order(a.letter) - order(b.letter));
}

// ── The roadmap ──────────────────────────────────────────────────────────────

/** One page per unit of the course (data/curriculum.ts). */
export const TOTAL_PAGES = TEACHING_UNITS.length;
/**
 * The mark the report draws on a page's average. Before G1 a page opened when
 * the page before it averaged this; pages now open by completion (`pageOpen`).
 */
export const PAGE_UNLOCK_SCORE = 75;

/** A letter's points on the roadmap — how well it is known, 0–100. */
export function completionScore(st: LetterStatus | undefined): number {
  if (!st) return 0;
  if (st.mastered) return 100;
  if (st.state === "feature_neglect") return 60;
  if (st.state === "gross_shape_blindness") return 25;
  return 0; // insufficient_data
}

export const pageLetters = (page: number): string[] => [...(TEACHING_UNITS[page] ?? [])];

/** The page's average completion score, 0–100, unrounded. */
export function pageAverage(page: number, statuses: Record<string, LetterStatus>): number {
  const letters = pageLetters(page);
  if (letters.length === 0) return 0;
  return letters.reduce((sum, l) => sum + completionScore(statuses[l]), 0) / letters.length;
}

/**
 * Page 1 is always open; a later page opens when every letter on the page
 * before it is complete — its three lessons finished, however well (plan §3,
 * principle 7: move forward by finishing). A page the child has already played
 * on stays open: statuses are judged afresh on every read, and a child whose
 * history predates the units has played letters all over them.
 */
export function pageOpen(page: number, statuses: Record<string, LetterStatus>): boolean {
  if (page <= 0) return true;
  const before = pageLetters(page - 1);
  if (before.length > 0 && before.every((l) => statuses[l]?.complete)) return true;
  return pageLetters(page).some((l) => (statuses[l]?.sessions ?? 0) > 0);
}
