/**
 * Simulates a full play-through against the real session model and store,
 * exercising the behaviour I cannot click through: that one session id spans
 * every activity, that a refresh resumes on the right step, and that quitting
 * part-way keeps what was collected.
 */
import {
  buildStepOrder,
  nextStep,
  sessionAttempts,
  sessionProgressPct,
  type ActivityType,
  type LearningSession,
} from "../src/app/types/session";
import {
  loadAllSessions,
  loadSession,
  setActiveSessionId,
  getActiveSessionId,
  upsertSession,
} from "../src/app/lib/sessionStore";
import { computeSessionMetrics } from "../src/app/lib/sessionMetrics";
import type { LevelConfig, QuestionAttempt } from "../src/app/types/levelConfig";

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

const config = (mode: "trace" | "tap"): LevelConfig => ({
  user_id: "child-1",
  target_alphabet: "घ",
  cognitive_state: mode === "trace" ? "gross_shape_blindness" : "feature_neglect",
  distractor_similarity: mode === "trace" ? "low" : "high",
  visual_aid_intensity: "static",
  input_mode: mode,
  scaffold_intensity: 0.6,
  distractor_pool: ["ग", "ध", "ज"],
  feature_to_highlight: "knot_upper_right",
  phonological_note: "",
  hesitation_trigger_stage1_ms: 14000,
  hesitation_trigger_stage2_ms: 19000,
  reasoning: "seed",
  provider_used: "on-device",
});

const attempt = (selected: string): QuestionAttempt => ({
  target_letter: "घ",
  selected_letter: selected,
  module_type: "similar",
  time_to_interact_ms: 2600,
  was_guided_win: false,
  hover_duration_ms: 0,
  jitter_count: 0,
});

/** A tiny stand-in for SessionContext's reducer logic. */
function makeSession(levelConfig: LevelConfig): LearningSession {
  return {
    session_id: "sess-full-1",
    user_id: "child-1",
    letter: "घ",
    session_number: 3,
    status: "in_progress",
    started_at: new Date().toISOString(),
    ended_at: null,
    level_config: levelConfig,
    activities: [],
    metrics: null,
    cognitive_state: null,
    reasoning: null,
    schema_version: 2,
  };
}

function complete(
  s: LearningSession,
  type: ActivityType,
  outcome: LearningSession["activities"][number]["outcome"] = null,
): LearningSession {
  const activities = [...s.activities];
  const i = activities.findIndex((a) => a.type === type);
  const rec = {
    type,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    outcome,
  };
  if (i >= 0) activities[i] = { ...activities[i], ...rec };
  else activities.push(rec);
  const next = { ...s, activities };
  upsertSession(next);
  return next;
}

console.log("\n-- a full play-through, tracing config --");
let s = makeSession(config("trace"));
setActiveSessionId(s.session_id);
upsertSession(s);

const order = buildStepOrder(s.level_config);
ok("sequence starts at intro", nextStep(s) === "intro", String(nextStep(s)));

s = complete(s, "intro", { kind: "viewed", dwell_ms: 3000 });
s = complete(s, "pronunciation", { kind: "viewed", dwell_ms: 5200 });
s = complete(s, "example_words", { kind: "viewed", dwell_ms: 7100 });
ok("tracing comes next for a trace config", nextStep(s) === "tracing", String(nextStep(s)));

s = complete(s, "tracing", {
  kind: "tracing",
  score: 71,
  passed: true,
  tries: 2,
  model: "easy",
});
s = complete(s, "memory", { kind: "memory", moves: 9, pairs: 3, duration_ms: 42000 });

// Assessed activities accumulate attempts.
s = complete(s, "identify", {
  kind: "questions",
  attempts: [attempt("घ"), attempt("ध"), attempt("घ"), attempt("घ"), attempt("घ")],
});
s = complete(s, "word_fill", {
  kind: "questions",
  attempts: [attempt("घ"), attempt("ध"), attempt("घ")],
});
s = complete(s, "word_spelling", {
  kind: "questions",
  attempts: [attempt("घ"), attempt("घ"), attempt("घ")],
});

ok("every step consumed", nextStep(s) === null, String(nextStep(s)));
ok("progress is 100%", sessionProgressPct(s) === 100);
ok("one session id throughout", new Set(loadAllSessions().map((x) => x.session_id)).size === 1);

console.log("\n-- what the session captured --");
const attempts = sessionAttempts(s);
ok("attempts gathered from all three assessed activities", attempts.length === 11, String(attempts.length));
const metrics = computeSessionMetrics(attempts);
ok("2 errors counted", metrics.errors === 2, String(metrics.errors));
ok("feature-level breakdown populated", metrics.feature_level.attempts === 11);
ok("confusion recorded as घ→ध", metrics.confusion_counts["घ→ध"] === 2, JSON.stringify(metrics.confusion_counts));

const stored = loadSession(s.session_id)!;
const tracing = stored.activities.find((a) => a.type === "tracing");
ok("tracing score survived to storage", tracing?.outcome?.kind === "tracing" && tracing.outcome.score === 71);
const memory = stored.activities.find((a) => a.type === "memory");
ok("memory moves survived to storage", memory?.outcome?.kind === "memory" && memory.outcome.moves === 9);
const passive = stored.activities.find((a) => a.type === "pronunciation");
ok("dwell time survived to storage", passive?.outcome?.kind === "viewed" && passive.outcome.dwell_ms === 5200);

console.log("\n-- refresh mid-session resumes on the right step --");
let r = makeSession(config("trace"));
r = { ...r, session_id: "sess-resume-1" };
upsertSession(r);
setActiveSessionId(r.session_id);
r = complete(r, "intro", { kind: "viewed", dwell_ms: 3000 });
r = complete(r, "pronunciation", { kind: "viewed", dwell_ms: 4000 });
const rehydrated = loadSession("sess-resume-1")!;
ok("rehydrates from storage", rehydrated.session_id === "sess-resume-1");
ok("resumes at example_words", nextStep(rehydrated) === "example_words", String(nextStep(rehydrated)));
ok("keeps the same letter after refresh", rehydrated.letter === "घ");
ok("active pointer still set", getActiveSessionId() === "sess-resume-1");

console.log("\n-- quitting part-way keeps what was collected --");
let q = { ...makeSession(config("tap")), session_id: "sess-quit-1" };
upsertSession(q);
q = complete(q, "intro", { kind: "viewed", dwell_ms: 3000 });
q = complete(q, "identify", { kind: "questions", attempts: [attempt("घ"), attempt("ध")] });
const abandoned: LearningSession = {
  ...q,
  status: "abandoned",
  ended_at: new Date().toISOString(),
  metrics: computeSessionMetrics(sessionAttempts(q)),
};
upsertSession(abandoned);
const back = loadSession("sess-quit-1")!;
ok("abandoned session is still stored", back.status === "abandoned");
ok("its attempts are kept", sessionAttempts(back).length === 2, String(sessionAttempts(back).length));
ok("partial progress is below 100%", sessionProgressPct(back) < 100, String(sessionProgressPct(back)));

console.log("\n-- tap config skips tracing --");
const tapOrder = buildStepOrder(config("tap"));
ok("no tracing step", !tapOrder.includes("tracing"));
ok("7 steps instead of 8", tapOrder.length === 7 && order.length === 8);

console.log(`\nRESULT ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
