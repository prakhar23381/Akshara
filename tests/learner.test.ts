/**
 * The games must adapt to what this child gets wrong. Before the learner
 * profile, nothing that configured a session read the child's history: every
 * session started from static pools, fixed nudge timers and, at most, the last
 * state reached on some other letter. These checks pin the loop shut.
 */
import {
  buildLearnerProfile,
  confusedWith,
  loadLearnerProfile,
  EMPTY_PROFILE,
} from "../src/app/lib/learnerProfile";
import {
  planSession,
  analyzeLocally,
  DISTRACTOR_POOLS,
  PERSONAL_SLOTS,
} from "../src/app/lib/adaptiveEngine";
import { upsertSession } from "../src/app/lib/sessionStore";
import type { LearningSession } from "../src/app/types/session";
import type {
  CognitiveState,
  LevelConfig,
  QuestionAttempt,
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

const attempt = (
  target: string,
  selected: string,
  ms = 4000,
  guided = false,
): QuestionAttempt => ({
  target_letter: target,
  selected_letter: selected,
  module_type: "similar",
  time_to_interact_ms: ms,
  was_guided_win: guided,
  hover_duration_ms: 0,
  jitter_count: 0,
});

const config = (letter: string): LevelConfig => ({
  ...analyzeLocally({
    user_id: "c",
    target_alphabet: letter,
    session_id: "x",
    session_number: 1,
    avg_latency_ms: 6000,
    consecutive_fails_peak: 0,
    attempts: [],
  }).levelConfig,
});

let clock = Date.parse("2026-10-01T10:00:00Z");
const session = (
  letter: string,
  attempts: QuestionAttempt[],
  opts: {
    user?: string;
    state?: CognitiveState | null;
    status?: LearningSession["status"];
  } = {},
): LearningSession => {
  clock += 3600_000;
  return {
    session_id: `s-${clock}`,
    user_id: opts.user ?? "child-a",
    letter,
    session_number: 1,
    status: opts.status ?? "completed",
    started_at: new Date(clock).toISOString(),
    ended_at: new Date(clock + 600_000).toISOString(),
    level_config: config(letter),
    activities: [
      {
        type: "identify",
        started_at: new Date(clock).toISOString(),
        completed_at: new Date(clock + 600_000).toISOString(),
        outcome: { kind: "questions", attempts },
      },
    ],
    metrics: null,
    cognitive_state: opts.state === undefined ? "feature_neglect" : opts.state,
    reasoning: null,
    schema_version: 2,
  };
};

// ── profile ─────────────────────────────────────────────────────────────────
console.log("-- profile --");
{
  const p = buildLearnerProfile([
    session("भ", [attempt("भ", "म"), attempt("भ", "म"), attempt("भ", "न"), attempt("भ", "भ")]),
  ]);
  const ranked = confusedWith(p, "भ");
  ok("strongest confusion ranks first", ranked[0] === "म", JSON.stringify(ranked));
  ok("second confusion present", ranked.includes("न"));
  ok("a correct answer is not a confusion", !ranked.includes("भ"));
  ok(
    "a mistake also counts in reverse, at half weight",
    Math.abs((p.confusions["म"]?.["भ"] ?? 0) - 1) < 1e-9,
    JSON.stringify(p.confusions["म"]),
  );
}
{
  const p = buildLearnerProfile([
    session("क", [attempt("क", "ख", 4000, true), attempt("क", "ा"), attempt("क", "खा")]),
  ]);
  ok("guided wins are not confusions", !confusedWith(p, "क").includes("ख"));
  ok(
    "matras and whole words are never counted as letters",
    confusedWith(p, "क").length === 0,
    JSON.stringify(p.confusions),
  );
}
{
  const older = session("ग", [attempt("ग", "घ")]);
  const newer = session("ग", [attempt("ग", "ध")]);
  const p = buildLearnerProfile([older, newer]);
  ok(
    "recent confusions outweigh old ones",
    confusedWith(p, "ग")[0] === "ध",
    JSON.stringify(p.confusions["ग"]),
  );
}
{
  const a = session("क", [attempt("क", "ख")], { state: "gross_shape_blindness" });
  const b = session("ख", [attempt("ख", "ख")], { state: "visual_mastery" });
  const p = buildLearnerProfile([a, b]);
  ok("state is tracked per letter", p.stateByLetter["क"] === "gross_shape_blindness");
  ok("latest state is the newest on any letter", p.latestState === "visual_mastery");
}
{
  const done = session("ट", [attempt("ट", "ठ")], { state: "feature_neglect" });
  const quit = session("ट", [attempt("ट", "ड")], { status: "abandoned", state: "visual_mastery" });
  const p = buildLearnerProfile([done, quit]);
  ok("an abandoned session sets no state", p.stateByLetter["ट"] === "feature_neglect");
  ok("but its mistakes still count", confusedWith(p, "ट").includes("ड"));
}
{
  const p = buildLearnerProfile([
    session("म", [attempt("म", "म", 9000), attempt("म", "म", 11000), attempt("म", "भ", 10000)]),
  ]);
  ok("latency median is the child's own", p.latencyMedianMs === 10000, String(p.latencyMedianMs));
}

// ── planning a session ──────────────────────────────────────────────────────
console.log("\n-- planning a session --");
{
  const fresh = planSession("c", "क", EMPTY_PROFILE);
  const old = analyzeLocally({
    user_id: "c",
    target_alphabet: "क",
    session_id: "x",
    session_number: 1,
    avg_latency_ms: 6000,
    consecutive_fails_peak: 0,
    attempts: [],
  }).levelConfig;
  ok("a brand-new child gets the standard assessment", fresh.state === "insufficient_data");
  ok(
    "with no history the pool is exactly the old one",
    JSON.stringify(fresh.levelConfig.distractor_pool) === JSON.stringify(old.distractor_pool),
  );
  ok("with no history the timers are the old 14s/19s", fresh.levelConfig.hesitation_trigger_stage1_ms === 14000);
  ok("no confusions claimed for a new child", fresh.levelConfig.confused_letters?.length === 0);
}
{
  const p = buildLearnerProfile([
    session("भ", [attempt("भ", "म"), attempt("भ", "म"), attempt("भ", "न")], {
      state: "feature_neglect",
    }),
  ]);
  const plan = planSession("c", "भ", p);
  const pool = plan.levelConfig.distractor_pool;
  ok("the child's top confusion leads the pool", pool[0] === "म", JSON.stringify(pool));
  ok(
    "feature-neglect allows two personal slots",
    plan.levelConfig.confused_letters?.length === PERSONAL_SLOTS.feature_neglect,
    JSON.stringify(plan.levelConfig.confused_letters),
  );
  ok("pool size is unchanged", pool.length === DISTRACTOR_POOLS["भ"].hard.length);
  ok("the reasoning says why", /own confusions: म/.test(plan.levelConfig.reasoning));
}
{
  // A low-similarity state, where every question is labelled "dissimilar".
  const p = buildLearnerProfile([
    session("क", [attempt("क", "ख"), attempt("क", "फ"), attempt("क", "ट")], {
      state: "gross_shape_blindness",
    }),
  ]);
  const plan = planSession("c", "क", p);
  ok(
    "gross-shape stage caps personal letters at one",
    plan.levelConfig.confused_letters?.length === 1,
    JSON.stringify(plan.levelConfig.confused_letters),
  );
}
{
  const p = buildLearnerProfile([
    session("क", [attempt("क", "ख")], { state: "gross_shape_blindness" }),
    session("ख", [attempt("ख", "ख")], { state: "visual_mastery" }),
  ]);
  ok(
    "a letter resumes from its OWN last state, not another letter's",
    planSession("c", "क", p).state === "gross_shape_blindness",
  );
  ok(
    "an unseen letter still borrows (capped) from the latest state",
    planSession("c", "ग", p).state === "feature_neglect",
  );
}
{
  const p = buildLearnerProfile([
    session("म", [attempt("म", "म", 9000), attempt("म", "भ", 9000)]),
  ]);
  const plan = planSession("c", "म", p);
  ok(
    "nudge timing follows the child's response time",
    plan.levelConfig.hesitation_trigger_stage1_ms === 9000 + 8000,
    String(plan.levelConfig.hesitation_trigger_stage1_ms),
  );
}
{
  const p = buildLearnerProfile([
    session("भ", [attempt("भ", "म"), attempt("भ", "म")], { state: "feature_neglect" }),
  ]);
  const first = planSession("c", "भ", p).levelConfig.distractor_pool;
  const second = planSession("c", "भ", p, first).levelConfig.distractor_pool;
  ok("a repeat session still rotates the grid", JSON.stringify(first) !== JSON.stringify(second));
  ok("rotation never drops the child's confusion", second.includes("म"), JSON.stringify(second));
}

// ── loading history ─────────────────────────────────────────────────────────
console.log("\n-- loading history --");
{
  localStorage.setItem("akshara_offline_mode", "true");
  upsertSession(session("स", [attempt("स", "ष"), attempt("स", "ष")], { user: "child-a" }));
  upsertSession(session("स", [attempt("स", "श"), attempt("स", "श"), attempt("स", "श")], { user: "child-b" }));

  loadLearnerProfile("child-a").then((a) => {
    ok("a child's profile reads only their own sessions", !confusedWith(a, "स").includes("श"), JSON.stringify(a.confusions["स"]));
    ok("and does read theirs", confusedWith(a, "स")[0] === "ष");
    ok("a guest's history is the device", a.source === "device");

    console.log(`\nRESULT ${pass} passed, ${fail} failed`);
    if (fail > 0) process.exit(1);
  }).catch((err) => {
    // An async failure must fail the file, not vanish into an unhandled promise.
    console.log("  ✗ loading history threw", err);
    process.exit(1);
  });
}
