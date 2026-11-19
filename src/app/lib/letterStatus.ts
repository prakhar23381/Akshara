import {
  LETTER_SEQUENCE,
  type CognitiveState,
  type LetterLesson,
  type QuestionAttempt,
} from "../types/levelConfig";
import { isLetterLesson, type LearningSession } from "../types/session";
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
 * **Mastered means it held on two different days (G2, plan question E3).** The
 * judgement can reach mastery in one sitting; that is `masteredOnce`, and the
 * letter is `mastered` once the judgement has come out mastered on a second
 * calendar day (the device's time zone) without falling below in between.
 * Judged on read like everything here, so it applies to every session already
 * saved: a letter mastered on a single day before G2 reads as mastered once.
 * The stage the engine teaches at is unchanged by it — only the label is.
 *
 * **Review answers never judge a letter (G2).** The warm-up, lessons side by
 * side, practice and unit checks ask about letters learned earlier. Their
 * answers count as mix-ups — so a mastered letter picked by mistake still
 * earns its check question — but a stage moves only through that check (plan
 * §6.1). A review lesson's `letter` is just the first of its letters.
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
  /** Judged mastered, but on one day only so far: not yet `mastered`. */
  masteredOnce: boolean;
  /** When the current run of mastery became `mastered` (the session on its second day); null otherwise or if only saved. */
  masteredAt: string | null;
  /** The lessons the child has finished on this letter, at least once each. */
  lessons: Record<LetterLesson, boolean>;
  /**
   * In words finished: the letter's three lessons are done and the course
   * moves on. Not the same as mastered — that is how well, this is how far.
   */
  complete: boolean;
  /** The lesson a child opening this letter plays now. */
  nextLesson: LetterLesson;
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


/** Mastery must hold on this many different days (plan question E3). */
export const MASTERY_DAYS = 2;

/** A calendar day in the device's time zone, which is the child's. */
export const dayOf = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

const blank = (): LetterStatus => ({
  state: "insufficient_data",
  mastered: false,
  masteredOnce: false,
  masteredAt: null,
  sessions: 0,
  judged: false,
  pickedFor: {},
  checkDue: false,
  lessons: { meet: false, find: false, words: false },
  complete: false,
  nextLesson: "meet",
  errorRate: null,
});

const ALL_LESSONS = (): Record<LetterLesson, boolean> => ({ meet: true, find: true, words: true });
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
  const last: Record<string, LetterLesson> = {};
  // The days on which each letter's judgement came out mastered, since it last
  // fell below mastery.
  const masteryDays: Record<string, Set<string>> = {};
  const ordered = [...sessions].sort(
    (a, b) => Date.parse(a.started_at) - Date.parse(b.started_at),
  );

  for (const s of ordered) {
    const teaches = isLetterLesson(s);
    if (teaches) {
      get(s.letter);
      played[s.letter] = (played[s.letter] ?? 0) + 1;
    }
    const checked = new Set<string>();

    for (const act of s.activities) {
      if (act.outcome?.kind !== "questions") continue;
      for (const a of act.outcome.attempts) {
      // A check question: in a letter lesson's Listen & tap, the first answer
      // on another letter decides it. The retries that follow a wrong tap are
      // the same question. Warm-up and review answers are never checks.
      if (
        teaches &&
        act.type === "identify" &&
        a.target_letter !== s.letter &&
        !checked.has(a.target_letter)
      ) {
        checked.add(a.target_letter);
        const st = out[a.target_letter];
        if (st) {
          if (st.mastered && isMiss(a)) {
            st.mastered = false;
            st.masteredOnce = false;
            st.masteredAt = null;
            st.state = "feature_neglect";
            masteryDays[a.target_letter] = new Set();
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
    }

    // The session's own letter, judged on its own questions by today's rules.
    // An abandoned session was never judged; a finished one with no questions
    // on its letter has nothing to judge, so it leaves the status as it was.
    if (teaches && s.status === "completed") {
      const st = get(s.letter);
      const lesson = s.level_config?.lesson as LetterLesson | undefined;
      // A session from before lessons played every game: all three at once.
      if (lesson) st.lessons[lesson] = true;
      else st.lessons = ALL_LESSONS();
      last[s.letter] = lesson ?? "words";

      const own = (words: boolean) =>
        s.activities
          // Only Listen & tap and the word games judge a letter. Warm-up is
          // review (G2); See & match, Letter hunt and Teach Mitthu are
          // recorded and reported but never decide a stage (G3).
          .filter((a) => (words ? WORD_GAMES.includes(a.type) : a.type === "identify"))
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
          const days = (masteryDays[s.letter] ??= new Set());
          if (state === "visual_mastery") days.add(dayOf(s.started_at));
          else days.clear();
          st.state = state;
          const was = st.mastered && st.masteredAt !== null;
          st.mastered = days.size >= MASTERY_DAYS;
          st.masteredAt = st.mastered ? (was ? st.masteredAt : s.started_at) : null;
          st.masteredOnce = state === "visual_mastery" && !st.mastered;
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
/** A letter's points on the roadmap — how well it is known, 0–100. */
export function completionScore(st: LetterStatus | undefined): number {
  if (!st) return 0;
  if (st.mastered) return 100;
  // Mastered on one day: most of the way, short of the trophy (G2).
  if (st.state === "visual_mastery") return 80;
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
 * Page 1 is always open; a later page opens when the unit before it is
 * finished — its letters complete and its unit check done (G2; plan §6.3).
 * A page the child has already played on stays open: statuses are judged
 * afresh on every read, and a child whose history predates the units has
 * played letters all over them. `checkpointsDone` comes from `unitPlans`
 * (review.ts).
 */
export function pageOpen(
  page: number,
  statuses: Record<string, LetterStatus>,
  checkpointsDone: ReadonlySet<number>,
): boolean {
  if (page <= 0) return true;
  if (checkpointsDone.has(page - 1)) return true;
  return pageLetters(page).some((l) => (statuses[l]?.sessions ?? 0) > 0);
}
