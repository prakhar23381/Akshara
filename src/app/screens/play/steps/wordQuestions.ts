import { getLetterContent } from "../../../data/letterContent";
import { DISTRACTOR_POOLS } from "../../../lib/adaptiveEngine";
import {
  aksharas,
  aksharaIndexOf,
  baseConsonant,
  withBase,
} from "../../../lib/akshara";

export const QUESTIONS_PER_ROUND = 3;

/**
 * Confusable letters for a target, preferring the ones this child has actually
 * confused. The static fallback is the engine's own `hard` pool rather than a
 * separate similarity table copied into each word game.
 *
 * Consonants only. Several `hard` pools include the vowel इ because it looks
 * like ङ, ड and ह — fine as a tile in Listen-to-Letter, but a vowel cannot carry
 * a matra, so swapping it into गा produced a string that is not Hindi at all.
 */
export function distractorsFor(target: string, confused: string[], count: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (l: string) => {
    if (l !== target && baseConsonant(l) === l && !seen.has(l) && out.length < count) {
      seen.add(l);
      out.push(l);
    }
  };
  confused.forEach(push);
  (DISTRACTOR_POOLS[target]?.hard ?? []).forEach(push);
  ["म", "ग", "ब", "क"].forEach(push);
  return out;
}

export function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * An answer option, and the letter choosing it means the child picked.
 *
 * The attempt is recorded at letter level, because that is what the engine
 * diagnoses and what the confusion profile ranks. Before, the word games
 * worked that letter out from code points — so a child could be recorded as
 * having chosen a matra, or a whole word, as their "letter".
 */
export interface WordOption {
  text: string;
  consonant: string;
}

export interface FillQuestion {
  word: string;
  image: string;
  meaning: string;
  /** The word in aksharas — what is rendered, one unit per slot. */
  parts: string[];
  /** Which akshara is blanked. */
  blankIndex: number;
  /** The blanked akshara: the target with its own matra, e.g. गा in गाय. */
  answer: string;
  options: WordOption[];
}

/**
 * Fill-in-the-blank, one akshara at a time.
 *
 * The blank is the whole akshara and every option carries the same matra: for
 * गाय the choices are गा · मा · भा …, not ग · म · भ next to a stranded ा. That is
 * how the word is actually written, and it means the matra is never left
 * hanging off the blank's "?" — or, for ि, drawn on the wrong side of it.
 *
 * A word is used only if the target leads one of its aksharas. The old code
 * fell back to index 0 when it could not find the letter, which is how the
 * session for ङ asked the child to fill in ग and recorded it as ग.
 */
export function buildFillQuestions(target: string, confused: string[]): FillQuestion[] {
  const { exampleWords } = getLetterContent(target);
  const distractors = distractorsFor(target, confused, 3);

  return exampleWords
    .flatMap((item): FillQuestion[] => {
      const parts = aksharas(item.word);
      const blankIndex = aksharaIndexOf(parts, target);
      if (blankIndex < 0) return [];
      const answer = parts[blankIndex];
      const options: WordOption[] = [{ text: answer, consonant: target }];
      distractors.forEach((d) => {
        const text = withBase(answer, d);
        if (!options.some((o) => o.text === text)) options.push({ text, consonant: d });
      });
      if (options.length < 2) return [];
      return [
        {
          word: item.word,
          image: item.image,
          meaning: item.meaning,
          parts,
          blankIndex,
          answer,
          options: shuffle(options),
        },
      ];
    })
    .slice(0, QUESTIONS_PER_ROUND);
}

export interface SpellingQuestion {
  image: string;
  meaning: string;
  answer: string;
  options: WordOption[];
}

/**
 * "Which spelling is correct?" Each wrong spelling swaps one letter the child
 * confuses into the target's akshara, keeping its matra.
 *
 * A word with no usable misspelling is skipped rather than shown. Previously,
 * when the target was not found, the question rendered with a single option —
 * a choice with nothing to choose between.
 */
export function buildSpellingQuestions(
  target: string,
  confused: string[],
): SpellingQuestion[] {
  const { exampleWords } = getLetterContent(target);
  const distractors = distractorsFor(target, confused, 4);

  return exampleWords
    .flatMap((item): SpellingQuestion[] => {
      const parts = aksharas(item.word);
      const at = aksharaIndexOf(parts, target);
      if (at < 0) return [];
      const wrong: WordOption[] = [];
      for (const d of distractors) {
        const copy = [...parts];
        copy[at] = withBase(parts[at], d);
        const text = copy.join("");
        if (text !== item.word && !wrong.some((w) => w.text === text)) {
          wrong.push({ text, consonant: d });
        }
        if (wrong.length >= 3) break;
      }
      if (wrong.length === 0) return [];
      return [
        {
          image: item.image,
          meaning: item.meaning,
          answer: item.word,
          options: shuffle([{ text: item.word, consonant: target }, ...wrong]),
        },
      ];
    })
    .slice(0, QUESTIONS_PER_ROUND);
}
