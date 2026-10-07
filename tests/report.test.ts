/**
 * The report is the artifact a parent or specialist actually reads, so its
 * figures must be traceable to recorded sessions. These checks assert the
 * per-session rows and that nothing is invented when data is thin.
 */
import { buildProgressReport } from "../src/app/api/client";
import { upsertSession } from "../src/app/lib/sessionStore";
import type { LearningSession } from "../src/app/types/session";
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
  cognitive_state: "feature_neglect",
  distractor_similarity: "high",
  visual_aid_intensity: "static",
  input_mode: mode,
  scaffold_intensity: 0.55,
  distractor_pool: ["ग", "ध", "ज"],
  feature_to_highlight: "knot_upper_right",
  phonological_note: "",
  hesitation_trigger_stage1_ms: 14000,
  hesitation_trigger_stage2_ms: 19000,
  reasoning: "seed",
  provider_used: "on-device",
});

const attempt = (target: string, selected: string, guided = false): QuestionAttempt => ({
  target_letter: target,
  selected_letter: selected,
  module_type: "similar",
  time_to_interact_ms: guided ? 0 : 3000,
  was_guided_win: guided,
  hover_duration_ms: 0,
  jitter_count: 0,
});

function session(over: Partial<LearningSession>): LearningSession {
  return {
    session_id: "x",
    user_id: "child-1",
    letter: "घ",
    session_number: 1,
    status: "completed",
    started_at: new Date("2026-10-05T09:00:00Z").toISOString(),
    ended_at: new Date("2026-10-05T09:08:00Z").toISOString(),
    level_config: config("tap"),
    activities: [],
    metrics: null,
    cognitive_state: "feature_neglect",
    reasoning: "r",
    schema_version: 2,
    ...over,
  };
}

localStorage.setItem(
  "akshara_db_user_profiles",
  JSON.stringify([{ display_name: "Aarav", age: 7 }]),
);
localStorage.setItem(
  "akshara_db_letter_progress",
  JSON.stringify([
    { letter: "घ", mastered: false, sessions_count: 2, last_cognitive_state: "feature_neglect" },
  ]),
);

// A complete session with every activity type represented.
upsertSession(
  session({
    session_id: "s-complete",
    activities: [
      { type: "intro", started_at: "", completed_at: "t", outcome: { kind: "viewed", dwell_ms: 3000 } },
      { type: "pronunciation", started_at: "", completed_at: "t", outcome: { kind: "viewed", dwell_ms: 4000 } },
      { type: "example_words", started_at: "", completed_at: "t", outcome: { kind: "viewed", dwell_ms: 5000 } },
      { type: "memory", started_at: "", completed_at: "t", outcome: { kind: "memory", moves: 11, pairs: 3, duration_ms: 40000 } },
      {
        type: "identify",
        started_at: "",
        completed_at: "t",
        outcome: {
          kind: "questions",
          attempts: [
            attempt("घ", "घ"),
            attempt("घ", "ध"),
            attempt("घ", "घ"),
            attempt("घ", "घ", true),
          ],
        },
      },
      { type: "word_fill", started_at: "", completed_at: "t", outcome: { kind: "questions", attempts: [attempt("घ", "घ")] } },
      { type: "word_spelling", started_at: "", completed_at: "t", outcome: { kind: "questions", attempts: [attempt("घ", "घ")] } },
    ],
  }),
);

// An abandoned session: stopped after two activities.
upsertSession(
  session({
    session_id: "s-abandoned",
    session_number: 2,
    status: "abandoned",
    started_at: new Date("2026-10-06T09:00:00Z").toISOString(),
    ended_at: new Date("2026-10-06T09:02:00Z").toISOString(),
    level_config: config("trace"),
    activities: [
      { type: "intro", started_at: "", completed_at: "t", outcome: { kind: "viewed", dwell_ms: 3000 } },
      { type: "tracing", started_at: "", completed_at: "t", outcome: { kind: "tracing", score: 64, passed: true, tries: 3, model: "easy" } },
    ],
  }),
);

const report = buildProgressReport();
const rows = report.sessions ?? [];

console.log("\n-- sessions appear in the report --");
ok("two sessions listed", rows.length === 2, String(rows.length));
ok("newest first", rows[0].session_id === "s-abandoned", rows[0]?.session_id);

const done = rows.find((r) => r.session_id === "s-complete")!;
const quit = rows.find((r) => r.session_id === "s-abandoned")!;

console.log("\n-- a completed session --");
ok("7 of 7 activities for a tap config", done.activities_done === 7 && done.activities_total === 7,
  `${done.activities_done}/${done.activities_total}`);
ok("6 attempts gathered across three activities", done.attempts === 6, String(done.attempts));
ok("4 unaided wins", done.true_wins === 4, String(done.true_wins));
ok("1 guided win", done.guided_wins === 1, String(done.guided_wins));
ok("accuracy 66.7%", done.accuracy_pct === 66.7, String(done.accuracy_pct));
ok("rescue 16.7%", done.rescue_pct === 16.7, String(done.rescue_pct));
ok("duration 8 minutes", done.duration_ms === 8 * 60_000, String(done.duration_ms));
ok("memory moves captured", done.memory_moves === 11, String(done.memory_moves));
ok("confusion घ→ध recorded once", done.confusions["घ→ध"] === 1, JSON.stringify(done.confusions));

console.log("\n-- an abandoned session is kept, not hidden --");
ok("status preserved", quit.status === "abandoned", quit.status);
ok("partial activity count", quit.activities_done === 2 && quit.activities_total === 8,
  `${quit.activities_done}/${quit.activities_total}`);
ok("tracing score survived", quit.tracing_score === 64, String(quit.tracing_score));
ok("no attempts, so accuracy is null not zero", quit.accuracy_pct === null, String(quit.accuracy_pct));

console.log("\n-- report-level integrity --");
ok("letter stats still built", Object.keys(report.letter_stats).length > 0);
ok("report is not flagged empty", report.empty === false, String(report.empty));
ok("provider is on-device", report.provider === "on-device", report.provider);
ok("generated_at present", typeof report.generated_at === "string");

console.log(`\nRESULT ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
