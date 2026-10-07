import { getLetterContent } from "../../../data/letterContent";
import { DISTRACTOR_POOLS } from "../../../lib/adaptiveEngine";

export const QUESTIONS_PER_ROUND = 3;

/**
 * Confusable letters for a target, preferring the ones this child has actually
 * confused. The static fallback is the engine's own `hard` pool rather than a
 * separate similarity table copied into each word game.
 */
export function distractorsFor(target: string, confused: string[], count: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (l: string) => {
    if (l !== target && !seen.has(l) && out.length < count) {
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

export interface FillQuestion {
  word: string;
  image: string;
  meaning: string;
  blankIndex: number;
  answer: string;
  options: string[];
}

export function buildFillQuestions(target: string, confused: string[]): FillQuestion[] {
  const { exampleWords } = getLetterContent(target);
  const distractors = distractorsFor(target, confused, 3);

  return exampleWords.slice(0, QUESTIONS_PER_ROUND).map((item) => {
    const chars = [...item.word];
    const blankIndex = Math.max(0, chars.findIndex((c) => c === target));
    return {
      word: item.word,
      image: item.image,
      meaning: item.meaning,
      blankIndex,
      answer: chars[blankIndex],
      options: shuffle([chars[blankIndex], ...distractors]),
    };
  });
}

export interface SpellingQuestion {
  image: string;
  meaning: string;
  answer: string;
  options: string[];
}

export function buildSpellingQuestions(
  target: string,
  confused: string[],
): SpellingQuestion[] {
  const { exampleWords } = getLetterContent(target);
  const distractors = distractorsFor(target, confused, 4);

  return exampleWords.slice(0, QUESTIONS_PER_ROUND).map((item) => {
    const chars = [...item.word];
    const at = chars.findIndex((c) => c === target);
    const wrong: string[] = [];
    if (at >= 0) {
      for (const d of distractors) {
        const copy = [...chars];
        copy[at] = d;
        const candidate = copy.join("");
        if (candidate !== item.word && !wrong.includes(candidate)) wrong.push(candidate);
        if (wrong.length >= 3) break;
      }
    }
    return {
      image: item.image,
      meaning: item.meaning,
      answer: item.word,
      options: shuffle([item.word, ...wrong]),
    };
  });
}
