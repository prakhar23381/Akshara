/**
 * Matras belong to their consonant. The word games used to split words by code
 * point, so a matra was handled as if it were a letter: left dangling on the
 * blank, recorded as a child's "chosen letter", and — for ङ and ञ, whose words
 * did not contain the letter at all — the wrong letter blanked and logged.
 *
 * The word-game checks run over every letter in the sequence, because these
 * defects lived in the long tail, not in the common letters.
 */
import {
  aksharas,
  baseConsonant,
  withBase,
  aksharaIndexOf,
  MATRAS,
  standalone,
} from "../src/app/lib/akshara";
import {
  buildFillQuestions,
  buildSpellingQuestions,
  distractorsFor,
} from "../src/app/screens/play/steps/wordQuestions";
import { buildStepOrder } from "../src/app/types/session";
import { getLetterContent } from "../src/app/data/letterContent";
import { LETTER_SEQUENCE, type LevelConfig } from "../src/app/types/levelConfig";
import { DISTRACTOR_POOLS } from "../src/app/lib/adaptiveEngine";

let pass = 0;
let fail = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  if (cond) {
    pass++;
    console.log("  ✓", name);
  } else {
    fail++;
    console.log("  ✗", name, extra);
  }
};

const isMatraOrMark = (s: string) => /^\p{M}+$/u.test(s);
const startsWithMark = (s: string) => /^\p{M}/u.test(s);

// ── segmentation ────────────────────────────────────────────────────────────
console.log("-- segmentation --");
const cases: [string, string[]][] = [
  ["खिलौना", ["खि", "लौ", "ना"]],
  ["गाय", ["गा", "य"]],
  ["घड़ी", ["घ", "ड़ी"]],
  ["चम्मच", ["च", "म्म", "च"]],
  ["गङ्गा", ["ग", "ङ्गा"]],
  ["क्षमा", ["क्ष", "मा"]],
  ["अनार", ["अ", "ना", "र"]],
  ["जगत्", ["ज", "ग", "त्"]],
];
cases.forEach(([word, want]) => {
  const got = aksharas(word);
  ok(`${word} → ${want.join(" · ")}`, JSON.stringify(got) === JSON.stringify(want), JSON.stringify(got));
});
ok("ि stays with its consonant, not on its own", !aksharas("खिलौना").some(isMatraOrMark));

ok("base of गा is ग", baseConsonant("गा") === "ग");
ok("base keeps the nukta: ड़ी → ड़, not ड", baseConsonant("ड़ी") === "ड़");
ok("a vowel has no base consonant", baseConsonant("अ") === "" && baseConsonant("इ") === "");
ok("base of a conjunct is its first consonant", baseConsonant("ङ्गा") === "ङ");
ok("swap keeps the matra: (गा, म) → मा", withBase("गा", "म") === "मा");
ok("swap keeps a conjunct tail: (ङ्गा, ड) → ड्गा", withBase("ङ्गा", "ड") === "ड्गा");
ok("र in प्र is not a leading consonant", aksharaIndexOf(aksharas("प्रकाश"), "र") === -1);

// ── every word, every letter ────────────────────────────────────────────────
console.log("\n-- every word, every letter --");
let lossy = 0;
let wordsChecked = 0;
LETTER_SEQUENCE.forEach((l) =>
  getLetterContent(l).exampleWords.forEach(({ word }) => {
    wordsChecked++;
    if (aksharas(word).join("") !== word) lossy++;
  }),
);
ok(`segmentation is lossless across all ${wordsChecked} words`, lossy === 0, `${lossy} lossy`);

const noFill = LETTER_SEQUENCE.filter((l) => buildFillQuestions(l, []).length === 0);
ok("every letter has at least one fill-in question", noFill.length === 0, noFill.join(" "));

const fillProblems: string[] = [];
const spellProblems: string[] = [];
LETTER_SEQUENCE.forEach((l) => {
  buildFillQuestions(l, []).forEach((q) => {
    if (baseConsonant(q.answer) !== l) fillProblems.push(`${l}: blank ${q.answer} is not ${l}`);
    if (q.parts.join("") !== q.word) fillProblems.push(`${l}: ${q.word} not rebuilt`);
    q.options.forEach((o) => {
      if (startsWithMark(o.text)) fillProblems.push(`${l}: option "${o.text}" starts with a mark`);
      if (baseConsonant(o.text) !== o.consonant)
        fillProblems.push(`${l}: option ${o.text} records ${o.consonant}`);
    });
    if (q.options.filter((o) => o.text === q.answer).length !== 1)
      fillProblems.push(`${l}: answer not exactly once`);
  });
  buildSpellingQuestions(l, []).forEach((q) => {
    if (q.options.length < 2) spellProblems.push(`${l}: ${q.options.length} option(s)`);
    if (q.options.filter((o) => o.text === q.answer).length !== 1)
      spellProblems.push(`${l}: answer not exactly once`);
    q.options.forEach((o) => {
      if (o.text !== q.answer && o.consonant === l)
        spellProblems.push(`${l}: wrong spelling ${o.text} records the target`);
    });
  });
});
ok("every blank is an akshara led by the target", !fillProblems.some((p) => p.includes("blank")), fillProblems.join("; "));
ok("no fill option starts with a stranded matra", !fillProblems.some((p) => p.includes("mark")), fillProblems.join("; "));
ok("every option records the consonant it shows", !fillProblems.some((p) => p.includes("records")), fillProblems.join("; "));
ok("fill: the answer appears exactly once", !fillProblems.some((p) => p.includes("exactly")), fillProblems.join("; "));
ok("no spelling question has fewer than two options", !spellProblems.some((p) => p.includes("option(s)")), spellProblems.join("; "));
ok("spelling: the answer appears exactly once", !spellProblems.some((p) => p.includes("exactly")), spellProblems.join("; "));
ok("a wrong spelling never records the target as chosen", !spellProblems.some((p) => p.includes("records")), spellProblems.join("; "));

// The two letters that were wrong before.
for (const l of ["ङ", "ञ"]) {
  const fill = buildFillQuestions(l, []);
  ok(`${l}: fill-in blanks ${l} itself`, fill.length > 0 && fill.every((q) => baseConsonant(q.answer) === l), JSON.stringify(fill.map((q) => q.answer)));
  ok(`${l}: spelling has real choices`, buildSpellingQuestions(l, []).every((q) => q.options.length >= 2));
}

// ── distractors ─────────────────────────────────────────────────────────────
console.log("\n-- distractors --");
const withVowel = Object.keys(DISTRACTOR_POOLS).filter((l) => DISTRACTOR_POOLS[l].hard.includes("इ"));
ok("(some pools really do contain the vowel इ)", withVowel.length > 0, withVowel.join(" "));
ok(
  "word games never use a vowel as a distractor",
  withVowel.every((l) => !distractorsFor(l, ["इ"], 4).includes("इ")),
);
ok(
  "the child's confusion leads the wrong options",
  distractorsFor("भ", ["न"], 3)[0] === "न",
  JSON.stringify(distractorsFor("भ", ["न"], 3)),
);

// ── the barakhadi step ──────────────────────────────────────────────────────
console.log("\n-- barakhadi --");
ok("twelve forms, as the name says", MATRAS.length === 12);
ok("the inherent अ has no sign", MATRAS[0].sign === "" && MATRAS[0].vowel === "अ");
ok("a sign is shown on a dotted circle", standalone("ा") === "◌ा");
ok(
  "every consonant combines with every sign into one akshara",
  LETTER_SEQUENCE.every((l) => MATRAS.every((m) => aksharas(l + m.sign).length === 1)),
);

const cfg = (extra: Partial<LevelConfig>): LevelConfig =>
  ({ input_mode: "tap", ...extra }) as LevelConfig;
const withMatras = buildStepOrder(cfg({ include_matras: true }));
ok("a planned session includes the matra step", withMatras.includes("matras"));
ok(
  "matras come straight after the example words",
  withMatras.indexOf("matras") === withMatras.indexOf("example_words") + 1,
  JSON.stringify(withMatras),
);
ok(
  "an older session's step order is unchanged",
  !buildStepOrder(cfg({})).includes("matras") && buildStepOrder(cfg({})).length === 7,
);

console.log(`\nRESULT ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
