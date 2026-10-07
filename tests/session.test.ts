import {
  buildStepOrder, nextStep, isComplete, sessionProgressPct, sessionAttempts,
  type LearningSession, type ActivityType,
} from "../src/app/types/session";
import {
  upsertSession, loadSession, loadAllSessions, sweepStaleSessions,
  setActiveSessionId, getActiveSessionId,
} from "../src/app/lib/sessionStore";
import type { LevelConfig, QuestionAttempt } from "../src/app/types/levelConfig";

const cfg = (mode: "trace" | "tap"): LevelConfig => ({
  user_id: "u1", target_alphabet: "घ", cognitive_state: mode === "trace" ? "gross_shape_blindness" : "feature_neglect",
  distractor_similarity: mode === "trace" ? "low" : "high",
  visual_aid_intensity: "static", input_mode: mode, scaffold_intensity: 0.6,
  distractor_pool: ["ग", "ध", "ज"], feature_to_highlight: "knot_upper_right",
  phonological_note: "", hesitation_trigger_stage1_ms: 14000,
  hesitation_trigger_stage2_ms: 19000, reasoning: "test", provider_used: "on-device",
});

const mk = (over: Partial<LearningSession> = {}): LearningSession => ({
  session_id: "s-1", user_id: "u1", letter: "घ", session_number: 1,
  status: "in_progress", started_at: new Date().toISOString(), ended_at: null,
  level_config: cfg("trace"), activities: [], metrics: null,
  cognitive_state: null, reasoning: null, schema_version: 2, ...over,
});

const A = (t: string, s: string): QuestionAttempt => ({
  target_letter: t, selected_letter: s, module_type: "similar",
  time_to_interact_ms: 3000, was_guided_win: false, hover_duration_ms: 0, jitter_count: 0,
});

let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  if (cond) { pass++; console.log("  ✓", name); }
  else { fail++; console.log("  ✗", name, extra); }
};

console.log("\n-- step order --");
ok("trace config includes tracing", buildStepOrder(cfg("trace")).includes("tracing"));
ok("tap config omits tracing", !buildStepOrder(cfg("tap")).includes("tracing"));
ok("trace order is 8 steps", buildStepOrder(cfg("trace")).length === 8, String(buildStepOrder(cfg("trace")).length));
ok("tap order is 7 steps", buildStepOrder(cfg("tap")).length === 7);

console.log("\n-- step machine --");
let s = mk();
ok("first step is intro", nextStep(s) === "intro", String(nextStep(s)));
const done = (sess: LearningSession, t: ActivityType) => ({
  ...sess, activities: [...sess.activities,
    { type: t, started_at: new Date().toISOString(), completed_at: new Date().toISOString(), outcome: null }],
});
s = done(s, "intro");
ok("advances to pronunciation", nextStep(s) === "pronunciation", String(nextStep(s)));
ok("intro marked complete", isComplete(s, "intro"));
ok("progress 1/8 = 13%", sessionProgressPct(s) === 13, String(sessionProgressPct(s)));
for (const t of ["pronunciation","example_words","tracing","memory","identify","word_fill","word_spelling"] as ActivityType[]) s = done(s, t);
ok("no next step when all done", nextStep(s) === null, String(nextStep(s)));
ok("progress 100%", sessionProgressPct(s) === 100);

console.log("\n-- attempts gathered across activities --");
s = mk({ activities: [
  { type: "identify", started_at: "", completed_at: "", outcome: { kind: "questions", attempts: [A("घ","घ"), A("घ","ध")] } },
  { type: "word_fill", started_at: "", completed_at: "", outcome: { kind: "questions", attempts: [A("घ","घ")] } },
  { type: "tracing", started_at: "", completed_at: "", outcome: { kind: "tracing", score: 72, passed: true, tries: 2, model: "easy" } },
]});
ok("attempts span activities", sessionAttempts(s).length === 3, String(sessionAttempts(s).length));
ok("tracing outcome not counted as attempts", sessionAttempts(s).every(a => a.module_type === "similar"));

console.log("\n-- persistence --");
upsertSession(mk({ session_id: "p-1" }));
ok("round-trips", loadSession("p-1")?.session_id === "p-1");
upsertSession(mk({ session_id: "p-1", letter: "क" }));
ok("upsert does not duplicate", loadAllSessions().filter(x => x.session_id === "p-1").length === 1);
ok("upsert updates", loadSession("p-1")?.letter === "क");
const legacy = JSON.parse(localStorage.getItem("akshara_db_learning_sessions")!);
ok("row is valid v1 too (has error_rate_pct)", typeof legacy[0].error_rate_pct === "number");
ok("row carries schema_version 2", legacy[0].schema_version === 2);

console.log("\n-- stale sweep --");
const old = new Date(Date.now() - 9 * 3600_000).toISOString();
upsertSession(mk({ session_id: "stale-1", started_at: old }));
setActiveSessionId("stale-1");
const swept = sweepStaleSessions();
ok("stale session swept", swept === 1, String(swept));
ok("marked abandoned", JSON.parse(localStorage.getItem("akshara_db_learning_sessions")!).find((r:any)=>r.session_id==="stale-1").status === "abandoned");
ok("active pointer cleared", getActiveSessionId() === null, String(getActiveSessionId()));
upsertSession(mk({ session_id: "fresh-1" }));
ok("fresh session not swept", sweepStaleSessions() === 0);

console.log(`\nRESULT ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
