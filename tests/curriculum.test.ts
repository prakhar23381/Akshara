import {
  UNITS,
  TEACHING_ORDER,
  TEACHING_UNITS,
  LESSON_KINDS,
  LESSON_STEPS,
  lessonAfter,
} from "../src/app/data/curriculum";
import { LETTER_SEQUENCE, type LevelConfig } from "../src/app/types/levelConfig";
import { DISTRACTOR_POOLS } from "../src/app/lib/adaptiveEngine";
import { buildStepOrder } from "../src/app/types/session";

let pass = 0;
let fail = 0;
function ok(name: string, cond: boolean, detail = "") {
  if (cond) pass++;
  else fail++;
  console.log(`  ${cond ? "✓" : "✗"} ${name}${cond || !detail ? "" : ` — ${detail}`}`);
}

console.log("\n-- the teaching order --");
const flat = UNITS.flat();
ok("every letter is taught", LETTER_SEQUENCE.every((l) => flat.includes(l)),
  LETTER_SEQUENCE.filter((l) => !flat.includes(l)).join(" "));
ok("no letter is taught twice", new Set(flat).size === flat.length);
ok("and nothing that is not a letter of the course", flat.every((l) => (LETTER_SEQUENCE as readonly string[]).includes(l)));
ok("the order in use covers the same letters", [...TEACHING_ORDER].sort().join() === [...LETTER_SEQUENCE].sort().join());
ok("pages are the units", TEACHING_UNITS.length === UNITS.length);

// Rule 1 of the plan (§4.1): look-alikes are never introduced together.
const clashes: string[] = [];
UNITS.forEach((unit, i) =>
  unit.forEach((a) =>
    unit.forEach((b) => {
      if (a < b && (DISTRACTOR_POOLS[a]?.hard.includes(b) || DISTRACTOR_POOLS[b]?.hard.includes(a))) {
        clashes.push(`unit ${i + 1}: ${a}/${b}`);
      }
    }),
  ),
);
ok("no two look-alikes share a unit", clashes.length === 0, clashes.join(", "));

// Rule 3: a "puff of air" letter comes after its plain partner.
const pairs = [["क", "ख"], ["ग", "घ"], ["च", "छ"], ["ज", "झ"], ["ट", "ठ"], ["ड", "ढ"], ["त", "थ"], ["प", "फ"], ["ब", "भ"]];
const early = pairs.filter(([plain, puff]) => TEACHING_ORDER.indexOf(puff) < TEACHING_ORDER.indexOf(plain));
ok("each puff-of-air letter follows its plain partner", early.length === 0, early.map((p) => p.join("/")).join(" "));

console.log("\n-- lessons --");
ok("Meet comes first", lessonAfter(null) === "meet");
ok("then Find it", lessonAfter("meet") === "find");
ok("then In words", lessonAfter("find") === "words");
ok("and a complete letter goes back to Find it, never to Meet", lessonAfter("words") === "find");
ok("the barakhadi is in no lesson", LESSON_KINDS.every((k) => !LESSON_STEPS[k].includes("matras")));
const all = LESSON_KINDS.flatMap((k) => LESSON_STEPS[k]);
ok("each scored game is in exactly one lesson, bar Listen & tap",
  ["word_fill", "word_spelling", "memory", "tracing"].every((t) => all.filter((x) => x === t).length === 1));

console.log("\n-- a session keeps the order it was planned with --");
const cfg = (over: Partial<LevelConfig>): LevelConfig => ({
  user_id: "u", target_alphabet: "क", cognitive_state: "feature_neglect",
  distractor_similarity: "high", visual_aid_intensity: "static", input_mode: "tap",
  scaffold_intensity: 0.5, distractor_pool: ["ख", "फ", "ट"], feature_to_highlight: "",
  phonological_note: "", hesitation_trigger_stage1_ms: 14000, hesitation_trigger_stage2_ms: 19000,
  reasoning: "", provider_used: "on-device", ...over,
});
ok("a lesson's order is its snapshot",
  buildStepOrder(cfg({ lesson: "words", steps: [...LESSON_STEPS.words] })).join() === "word_fill,word_spelling");
ok("the snapshot wins over the old flags",
  !buildStepOrder(cfg({ steps: [...LESSON_STEPS.find], include_matras: true, input_mode: "trace" })).includes("matras"));
ok("a session from before lessons keeps its old order",
  buildStepOrder(cfg({ include_matras: true })).join() ===
    "intro,pronunciation,example_words,matras,memory,identify,word_fill,word_spelling");

console.log(`\nRESULT ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
