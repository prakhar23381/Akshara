/**
 * The report is the artifact a parent or specialist actually reads, so its
 * figures must be traceable to recorded sessions. These checks assert the
 * per-session rows and that nothing is invented when data is thin.
 */
import {
  buildProgressReport,
  fetchProgressReport,
  mergeRows,
} from "../src/app/api/client";
import { upsertSession, loadRowsFor } from "../src/app/lib/sessionStore";
import { normaliseRow } from "../src/app/lib/learnerProfile";
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

// Two children on one device. The guest profile is listed first on purpose:
// the report used to take `profiles[0]`, whoever that was.
localStorage.setItem(
  "akshara_db_user_profiles",
  JSON.stringify([
    { id: "guest-user-id", display_name: "Guest Explorer", age: 6 },
    { id: "child-1", display_name: "Aarav", age: 7 },
  ]),
);
localStorage.setItem(
  "akshara_db_letter_progress",
  JSON.stringify([
    { user_id: "child-1", letter: "घ", mastered: false, sessions_count: 2, last_cognitive_state: "feature_neglect" },
    { user_id: "child-2", letter: "क", mastered: true, sessions_count: 3, last_cognitive_state: "visual_mastery" },
  ]),
);
// Another child's session on the same device must not reach child-1's report.
upsertSession(
  session({
    session_id: "s-other-child",
    user_id: "child-2",
    letter: "क",
    started_at: new Date("2026-10-07T09:00:00Z").toISOString(),
    ended_at: new Date("2026-10-07T09:05:00Z").toISOString(),
  }),
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

async function main() {
const report = await fetchProgressReport("child-1");
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

console.log("\n-- what the app did, per session --");
ok("each session carries the planner's reasoning", typeof done.plan_reasoning === "string" && done.plan_reasoning.length > 0, String(done.plan_reasoning));
ok("…and the engine's conclusion", done.diagnosis === "r", String(done.diagnosis));
ok("…and the letters it targeted (none in this config)", Array.isArray(done.targeted) && done.targeted.length === 0, JSON.stringify(done.targeted));

console.log("\n-- one child per report --");
ok("another child's session is excluded", !rows.some((r) => r.session_id === "s-other-child"));
ok("another child's letter does not appear", !report.letter_stats["क"], Object.keys(report.letter_stats).join(" "));
ok("another child's mastery is not counted", report.letters_mastered === 0, String(report.letters_mastered));
ok("named from this child's profile, not profiles[0]", report.display_name === "Aarav", report.display_name);
ok("session total counts only this child", report.total_sessions === 2, String(report.total_sessions));
ok("a guest / unconfigured report says it is device-only", report.data_source === "device", String(report.data_source));

const unnamed = await fetchProgressReport("child-3", "Meera");
ok("falls back to the signed-in name when no profile row has one", unnamed.display_name === "Meera", unnamed.display_name);
ok("a child with no sessions gets an empty report, not someone else's", unnamed.empty === true, String(unnamed.empty));

console.log("\n-- database rows merged in --");
// A session that exists only in the database, with Postgres's timestamp format.
const remoteOnly = {
  ...loadRowsFor("child-2")[0],
  id: "s-remote",
  session_id: "s-remote",
  user_id: "child-1",
  started_at: "2026-10-08T09:00:00.5+00:00",
  created_at: "2026-10-08T09:00:00.5+00:00",
  ended_at: "2026-10-08T09:06:00+00:00",
};
// And a stale database copy of a session this device holds more recently.
const staleCopy = { ...loadRowsFor("child-1").find((r) => r.session_id === "s-abandoned"), status: "in_progress" };
const merged = mergeRows([remoteOnly, staleCopy].map(normaliseRow), loadRowsFor("child-1"));
ok("database-only session is included", merged.some((r) => r.session_id === "s-remote"));
ok("no session is duplicated", merged.length === 3, String(merged.length));
ok("the device copy wins over a stale database copy",
  merged.find((r) => r.session_id === "s-abandoned")?.status === "abandoned");
ok("Postgres timestamps are normalised to ISO", normaliseRow(remoteOnly).started_at === "2026-10-08T09:00:00.500Z",
  String(normaliseRow(remoteOnly).started_at));

const fromDb = buildProgressReport({ rows: merged, progress: [], displayName: "Aarav", source: "database+device" });
ok("a database-only session reaches the session list", (fromDb.sessions ?? []).some((r) => r.session_id === "s-remote"));
ok("and is ordered by time among device sessions", fromDb.sessions?.[0]?.session_id === "s-remote", fromDb.sessions?.[0]?.session_id);
ok("the report records its source", fromDb.data_source === "database+device");

console.log(`\nRESULT ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
}

main().catch((err) => {
  console.log("  ✗ report test threw", err);
  process.exit(1);
});
