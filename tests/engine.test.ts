/**
 * The on-device engine is what actually adapts for a child on the hosted app —
 * there is no backend there. These checks pin the behaviour that used to live on
 * the server, so a divergence between the two shows up here rather than as a
 * child being handed the wrong level.
 *
 * The six diagnosis cases mirror backend/tests/test_pipeline.py one for one.
 */
import {
  diagnose,
  carryForward,
  analyzeLocally,
  NEW_LETTER_STATE_CAP,
} from "../src/app/lib/adaptiveEngine";
import type {
  CognitiveState,
  QuestionAttempt,
  SessionPayload,
} from "../src/app/types/levelConfig";

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

const at = (
  module: "dissimilar" | "similar" | "scaffold",
  correct: boolean,
  selected = "ल",
): QuestionAttempt => ({
  target_letter: "घ",
  selected_letter: correct ? "घ" : selected,
  module_type: module,
  time_to_interact_ms: 3000,
  was_guided_win: false,
  hover_duration_ms: 0,
  jitter_count: 0,
});

const payload = (
  attempts: QuestionAttempt[],
  prior?: CognitiveState | null,
): SessionPayload => ({
  user_id: "child-1",
  target_alphabet: "घ",
  session_id: "s1",
  session_number: 1,
  avg_latency_ms: 6000,
  consecutive_fails_peak: 0,
  attempts,
  prior_cognitive_state: prior,
});

const many = (n: number, f: () => QuestionAttempt) => Array.from({ length: n }, f);

console.log("\n-- diagnosis parity with backend/tests/test_pipeline.py --");

ok(
  "no attempts → insufficient_data",
  diagnose([], "घ").state === "insufficient_data",
);

// 50% dissimilar error: cannot tell घ from a different shape.
ok(
  "dissimilar error above 30% → gross_shape_blindness",
  diagnose([...many(5, () => at("dissimilar", false)), ...many(5, () => at("dissimilar", true))], "घ")
    .state === "gross_shape_blindness",
);

// 25% dissimilar: above mastery (10%), below fail (30%) — hold, do not advance.
ok(
  "dissimilar between 10% and 30% → stays gross_shape_blindness",
  diagnose([at("dissimilar", false), ...many(3, () => at("dissimilar", true))], "घ")
    .state === "gross_shape_blindness",
);

ok(
  "dissimilar mastered with no similar data → feature_neglect",
  diagnose(many(10, () => at("dissimilar", true)), "घ").state === "feature_neglect",
);

ok(
  "similar error above 30% → feature_neglect",
  diagnose([...many(4, () => at("similar", false, "ध")), ...many(6, () => at("similar", true))], "घ")
    .state === "feature_neglect",
);

ok(
  "similar error below 10% → visual_mastery",
  diagnose(many(10, () => at("similar", true)), "घ").state === "visual_mastery",
);

console.log("\n-- scaffold counts towards similar, not dissimilar --");
// 100% scaffold errors must read as a similar-module failure. If scaffold fell
// to dissimilar, a child failing feature work would be sent back to shapes.
ok(
  "all-scaffold errors diagnose as feature_neglect",
  diagnose(many(5, () => at("scaffold", false, "ध")), "घ").state === "feature_neglect",
);

console.log("\n-- carry-forward (was a server-side SELECT per level) --");

const cold = diagnose([], "घ");
ok("cold start stays cold with no prior", carryForward(cold, null, "घ").state === "insufficient_data");
ok(
  "insufficient_data prior is not carried",
  carryForward(cold, "insufficient_data", "घ").state === "insufficient_data",
);
ok(
  "feature_neglect carries through unchanged",
  carryForward(cold, "feature_neglect", "घ").state === "feature_neglect",
);
ok(
  "gross_shape_blindness carries through unchanged",
  carryForward(cold, "gross_shape_blindness", "घ").state === "gross_shape_blindness",
);
ok(
  "visual_mastery is capped at feature_neglect on a new letter",
  carryForward(cold, "visual_mastery", "घ").state === "feature_neglect",
);
ok("the cap is the one the backend declares", NEW_LETTER_STATE_CAP.visual_mastery === "feature_neglect");
ok(
  "carrying forward says so in the reasoning",
  carryForward(cold, "visual_mastery", "घ").reasoning.includes("Carrying forward"),
);

// The guard that matters: a session WITH attempts must never be overwritten by
// a stale prior state.
const measured = diagnose(many(10, () => at("similar", true)), "घ");
ok(
  "a diagnosed session ignores the prior state",
  carryForward(measured, "gross_shape_blindness", "घ").state === "visual_mastery",
);

console.log("\n-- the level config a carried-forward child receives --");
const warm = analyzeLocally(payload([], "visual_mastery"));
ok("state is the capped one", warm.levelConfig.cognitive_state === "feature_neglect");
ok("so distractors are the hard pool", warm.levelConfig.distractor_similarity === "high");
ok("and tracing is skipped", warm.levelConfig.input_mode === "tap");

const fresh = analyzeLocally(payload([]));
ok("a true cold start still traces", fresh.levelConfig.input_mode === "trace");
ok("and gets the easy pool", fresh.levelConfig.distractor_similarity === "low");
ok(
  "the two differ, which is the whole point",
  fresh.levelConfig.cognitive_state !== warm.levelConfig.cognitive_state,
);

console.log("\n-- distractor pool integrity --");
const pool = analyzeLocally(payload(many(10, () => at("similar", false, "ध")))).levelConfig
  .distractor_pool;
ok("pool is non-empty", pool.length > 0, String(pool.length));
ok("target is never its own distractor", !pool.includes("घ"), pool.join(""));
ok("no duplicates in the pool", new Set(pool).size === pool.length, pool.join(""));

console.log(`\nRESULT ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
