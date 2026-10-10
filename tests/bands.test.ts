/**
 * The report colours error rates red / amber / green. The bands must be the
 * engine's own decision lines, not numbers chosen for the chart, or a colour
 * would claim the app does something it does not.
 */
import { errorBand, readableReasoning, GOOD_BELOW_PCT, CRITICAL_ABOVE_PCT } from "../src/app/lib/reportBands";
import { analyzeLocally, ERROR_THRESHOLD_FAIL, ERROR_THRESHOLD_MASTERY } from "../src/app/lib/adaptiveEngine";
import type { QuestionAttempt } from "../src/app/types/levelConfig";

let pass = 0;
let fail = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  if (cond) { pass++; console.log("  ✓", name); }
  else { fail++; console.log("  ✗", name, extra); }
};

console.log("-- bands are the engine's thresholds --");
ok("green ends where the engine's mastery line is", GOOD_BELOW_PCT === ERROR_THRESHOLD_MASTERY * 100);
ok("red starts where the engine's struggling line is", CRITICAL_ABOVE_PCT === ERROR_THRESHOLD_FAIL * 100);
ok("9.9% wrong is secure", errorBand(9.9) === "good");
ok("exactly 10% is developing, as the engine treats it", errorBand(10) === "warning");
ok("exactly 30% is developing, as the engine treats it", errorBand(30) === "warning");
ok("30.1% wrong needs support", errorBand(30.1) === "critical");
ok("no data is not a band", errorBand(null) === "none" && errorBand(undefined) === "none");

// The engine itself, on the same numbers: the report's green must be the
// engine's mastery, and its red the engine's struggling.
const attempts = (wrong: number, total: number): QuestionAttempt[] =>
  Array.from({ length: total }, (_, i) => ({
    target_letter: "क", selected_letter: i < wrong ? "ख" : "क", module_type: "similar",
    time_to_interact_ms: 3000, was_guided_win: false, hover_duration_ms: 0, jitter_count: 0,
  }));
const stateAt = (wrong: number, total: number) =>
  analyzeLocally({ user_id: "c", target_alphabet: "क", session_id: "s", session_number: 1,
    avg_latency_ms: 4000, consecutive_fails_peak: 0, attempts: attempts(wrong, total) }).state;
ok("where the report says secure, the engine says mastered",
  errorBand(5) === "good" && stateAt(1, 20) === "visual_mastery");
ok("where the report says needs support, the engine says struggling",
  errorBand(40) === "critical" && stateAt(8, 20) === "feature_neglect");

console.log("\n-- engine reasoning, for a parent --");
const r = readableReasoning("Prior state: feature_neglect → starting घ. Treating as Feature Neglect (database+device).");
ok("identifier states are translated", !/feature_neglect/.test(r) && r.includes("learning the fine detail"), r);
ok("Title Case states are translated", !/Feature Neglect/.test(r), r);
ok("the data source is said in words", r.includes("from the account and this device"), r);
ok("empty reasoning stays empty", readableReasoning(null) === "");

console.log(`\nRESULT ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
