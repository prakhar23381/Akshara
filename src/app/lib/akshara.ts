/**
 * Devanagari split into aksharas — the units a Hindi reader actually sees.
 *
 * The word games used to split words with `[...word]`, which yields code
 * points. In Devanagari a matra is its own code point, so `खिलौना` came apart as
 * six "letters" — ख · ि · ल · ौ · न · ा — when a reader sees three: खि · लौ · ना.
 * Rendered one code point per span, a matra was left detached, glued to the
 * blank's "?", or shown on the wrong side: ि is drawn *before* its consonant,
 * so pulled out on its own it reads in the wrong order entirely.
 *
 * An akshara here is a consonant cluster (consonants joined by virama, each
 * optionally with a nukta) or an independent vowel, followed by any vowel signs
 * and other marks. That is the traditional orthographic syllable.
 *
 * This is written out rather than using `Intl.Segmenter`, because the segmenter
 * only treats a conjunct like `ङ्ग` as one unit from Unicode 15.1 (rule GB9c),
 * and which version a child's browser ships varies. Splitting a conjunct in one
 * browser and not another would change which part of a word gets blanked.
 */

const isConsonant = (cp: number) =>
  (cp >= 0x0915 && cp <= 0x0939) || // क … ह
  (cp >= 0x0958 && cp <= 0x095f) || // precomposed nukta forms क़ … य़
  (cp >= 0x0978 && cp <= 0x097f);

const NUKTA = 0x093c;
const VIRAMA = 0x094d;
const ZWJ = 0x200d;
const ZWNJ = 0x200c;

/** Vowel signs, nukta, virama, anusvara, candrabindu, visarga and joiners. */
const isMark = (cp: number) =>
  (cp >= 0x0900 && cp <= 0x0903) || // candrabindu, anusvara, visarga
  (cp >= 0x093a && cp <= 0x093c) || // vowel signs oe/ooe, nukta
  (cp >= 0x093e && cp <= 0x094f) || // matras, virama (skips 093D avagraha, a letter)
  (cp >= 0x0951 && cp <= 0x0957) ||
  (cp >= 0x0962 && cp <= 0x0963) || // vocalic l/ll signs
  cp === ZWJ ||
  cp === ZWNJ;

export function aksharas(word: string): string[] {
  const out: string[] = [];
  const cps = [...word];
  let current = "";
  let afterVirama = false;

  for (const ch of cps) {
    const cp = ch.codePointAt(0)!;
    if (current && isConsonant(cp) && afterVirama) {
      // A consonant after a virama joins the cluster: क्ष, ङ्ग, म्म.
      current += ch;
      afterVirama = false;
    } else if (current && isMark(cp)) {
      current += ch;
      if (cp === VIRAMA) afterVirama = true;
      else if (cp !== ZWJ && cp !== ZWNJ) afterVirama = false;
    } else {
      if (current) out.push(current);
      current = ch;
      afterVirama = false;
    }
  }
  if (current) out.push(current);
  return out;
}

/**
 * The leading consonant of an akshara, with its nukta if it has one — "" if it
 * starts with a vowel. `ड़` is not `ड`: they are different letters, so the nukta
 * is part of the identity, not a decoration.
 */
export function baseConsonant(akshara: string): string {
  const cps = [...akshara];
  if (cps.length === 0 || !isConsonant(cps[0].codePointAt(0)!)) return "";
  return cps[1]?.codePointAt(0) === NUKTA ? cps[0] + cps[1] : cps[0];
}

/** The same akshara with its leading consonant swapped: (गा, म) → मा. */
export function withBase(akshara: string, consonant: string): string {
  const base = baseConsonant(akshara);
  return base ? consonant + akshara.slice(base.length) : akshara;
}

/**
 * Where `target` sits as the *leading* consonant of an akshara in `word`, or -1.
 *
 * Only the leading position counts. A target buried second in a conjunct (the र
 * in प्र) cannot be blanked or swapped without producing something that is not a
 * readable syllable, so such a word is simply not used for that letter.
 */
export function aksharaIndexOf(parts: string[], target: string): number {
  return parts.findIndex((a) => baseConsonant(a) === target);
}

/**
 * The barakhadi (बारहखड़ी): a consonant with each vowel, the way Hindi teaches
 * matras. `vowel` is the independent vowel the sign stands for, shown beside
 * the sign because "आ की मात्रा" is how a child is taught to name it.
 * The inherent अ has no sign: the bare consonant already carries it.
 */
export const MATRAS: { sign: string; vowel: string }[] = [
  { sign: "", vowel: "अ" },
  { sign: "ा", vowel: "आ" },
  { sign: "ि", vowel: "इ" },
  { sign: "ी", vowel: "ई" },
  { sign: "ु", vowel: "उ" },
  { sign: "ू", vowel: "ऊ" },
  { sign: "े", vowel: "ए" },
  { sign: "ै", vowel: "ऐ" },
  { sign: "ो", vowel: "ओ" },
  { sign: "ौ", vowel: "औ" },
  { sign: "ं", vowel: "अं" },
  { sign: "ः", vowel: "अः" },
];

/**
 * A matra sign shown on its own, on a dotted circle — the standard way to print
 * a combining mark without a letter, so it reads as a separate sign rather than
 * attaching itself to whatever happens to be beside it.
 */
export const DOTTED_CIRCLE = "◌";
export const standalone = (sign: string) => (sign ? DOTTED_CIRCLE + sign : "");
