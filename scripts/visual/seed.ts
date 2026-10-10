import { upsertSession } from "../../src/app/lib/sessionStore";
import { planSession, analyzeLocally } from "../../src/app/lib/adaptiveEngine";
import { buildLearnerProfile } from "../../src/app/lib/learnerProfile";
import type { LearningSession } from "../../src/app/types/session";
import type { QuestionAttempt, ModuleType } from "../../src/app/types/levelConfig";

const UID = "guest-user-id";
const history: LearningSession[] = [];
let n = 0;

const att = (target: string, picks: string[], module: ModuleType, ms = 4200): QuestionAttempt[] =>
  picks.map((p, i) => ({
    target_letter: target, selected_letter: p, module_type: module,
    time_to_interact_ms: ms + (i % 3) * 700, was_guided_win: false, hover_duration_ms: 0, jitter_count: 0,
  }));

function play(letter: string, when: string, identify: string[], words: string[], status: "completed" | "abandoned" = "completed"): LearningSession {
  const profile = buildLearnerProfile(history);
  const { levelConfig } = planSession(UID, letter, profile, []);
  const module: ModuleType = levelConfig.distractor_similarity === "low" ? "dissimilar" : "similar";
  const idAttempts = att(letter, identify, module);
  const wordAttempts = att(letter, words, "similar", 5200);
  const t0 = Date.parse(when);
  const at = (m: number) => new Date(t0 + m * 60_000).toISOString();
  const v = (type: any, m: number, outcome: any) => ({ type, started_at: at(m), completed_at: at(m + 1), outcome });
  const activities: any[] = [
    v("intro", 0, { kind: "viewed", dwell_ms: 4000 }),
    v("pronunciation", 1, { kind: "viewed", dwell_ms: 5000 }),
    v("example_words", 2, { kind: "viewed", dwell_ms: 6000 }),
    v("matras", 3, { kind: "viewed", dwell_ms: 9000 }),
    v("memory", 4, { kind: "memory", moves: 6 + identify.length % 4, pairs: 3, duration_ms: 40000 }),
    v("identify", 5, { kind: "questions", attempts: idAttempts }),
  ];
  if (status === "completed") {
    activities.push(v("word_fill", 7, { kind: "questions", attempts: wordAttempts.slice(0, 3) }));
    activities.push(v("word_spelling", 8, { kind: "questions", attempts: wordAttempts.slice(3) }));
  }
  const all = activities.flatMap((a) => (a.outcome.kind === "questions" ? a.outcome.attempts : []));
  const diag = analyzeLocally({ user_id: UID, target_alphabet: letter, session_id: "x", session_number: 1,
    avg_latency_ms: 4500, consecutive_fails_peak: 0, attempts: all });
  const s: LearningSession = {
    session_id: `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`,
    user_id: UID, letter, session_number: history.filter((h) => h.letter === letter).length + 1,
    status, started_at: at(0), ended_at: at(status === "completed" ? 9 : 6),
    level_config: levelConfig, activities, metrics: null,
    cognitive_state: status === "completed" ? diag.state : null,
    reasoning: status === "completed" ? diag.levelConfig.reasoning : null,
    schema_version: 2,
  };
  history.push(s);
  return s;
}

const K = "क", KH = "ख", G = "ग", GH = "घ";
play(K, "2026-10-03T10:00:00Z", [K, "ख", K, "ख", K], [K, "ख", K, "फ", K, K]);
play(K, "2026-10-05T10:00:00Z", [K, K, "ख", K, K], [K, K, K, "ख", K, K]);
play(KH, "2026-10-06T10:00:00Z", [KH, K, KH, K, KH], [KH, "थ", KH, KH, K, KH]);
play(K, "2026-10-07T10:00:00Z", [K, K, K, K, K], [K, K, K, K, K, K]);
play(KH, "2026-10-08T10:00:00Z", [KH, KH, K, KH, KH], [KH, KH, KH, K, KH, KH]);
play(G, "2026-10-09T10:00:00Z", [G, "घ", "घ", "ध"], [], "abandoned");
play(GH, "2026-10-10T09:00:00Z", [GH, GH, "ग", GH, GH], [GH, GH, "ध", GH, GH, GH]);

history.forEach(upsertSession);
const progress = [...new Set(history.map((h) => h.letter))].map((l, i) => {
  const last = [...history].reverse().find((h) => h.letter === l && h.status === "completed");
  return { user_id: UID, letter: l, letter_index: i, mastered: last?.cognitive_state === "visual_mastery",
    sessions_count: history.filter((h) => h.letter === l).length,
    last_cognitive_state: last?.cognitive_state ?? "insufficient_data" };
});
const base: Record<string, string> = {
  akshara_offline_mode: "true",
  akshara_mock_session: JSON.stringify({ access_token: "mock", user: { id: UID, email: "guest@akshara.org",
    user_metadata: { display_name: "Aarav", avatar: "🦁" } } }),
  akshara_db_user_profiles: JSON.stringify([{ id: UID, display_name: "Aarav", age: 7, avatar: "🦁", profile_complete: true }]),
  akshara_db_letter_progress: JSON.stringify(progress),
  akshara_db_learning_sessions: localStorage.getItem("akshara_db_learning_sessions")!,
};

// One in-progress session on ख, parked at each step in turn.
const order = ["intro", "pronunciation", "example_words", "matras", "memory", "identify", "word_fill", "word_spelling"];
const scenarios: Record<string, Record<string, string>> = { report: base };
for (const step of ["matras", "memory", "identify", "word_fill", "word_spelling"]) {
  const profile = buildLearnerProfile(history);
  const { levelConfig } = planSession(UID, KH, profile, []);
  const now = new Date().toISOString();
  const done = order.slice(0, order.indexOf(step)).map((type) => ({ type, started_at: now, completed_at: now,
    outcome: type === "memory" ? { kind: "memory", moves: 7, pairs: 3, duration_ms: 30000 }
      : ["identify", "word_fill"].includes(type) ? { kind: "questions", attempts: [] } : { kind: "viewed", dwell_ms: 3000 } }));
  const live: LearningSession = { session_id: `11111111-0000-4000-8000-${step.length.toString().padStart(12, "0")}`,
    user_id: UID, letter: KH, session_number: 3, status: "in_progress", started_at: now, ended_at: null,
    level_config: levelConfig, activities: done as any, metrics: null, cognitive_state: null, reasoning: null, schema_version: 2 };
  const rows = JSON.parse(base.akshara_db_learning_sessions);
  scenarios["play-" + step] = { ...base, akshara_db_learning_sessions: JSON.stringify([...rows, { ...live, id: live.session_id, created_at: now }]),
    akshara_active_session_id: live.session_id };
}
console.log(JSON.stringify({ scenarios, khConfig: planSession(UID, KH, buildLearnerProfile(history), []).levelConfig }));
