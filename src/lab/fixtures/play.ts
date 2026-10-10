import { planSession, analyzeLocally } from "../../app/lib/adaptiveEngine";
import { buildLearnerProfile } from "../../app/lib/learnerProfile";
import { computeSessionMetrics } from "../../app/lib/sessionMetrics";
import { upsertSession } from "../../app/lib/sessionStore";
import {
  LETTER_SEQUENCE,
  type LevelConfig,
  type ModuleType,
  type QuestionAttempt,
} from "../../app/types/levelConfig";
import type { ActivityRecord, LearningSession } from "../../app/types/session";

/**
 * Plays scripted sessions through the real engine.
 *
 * Every session is configured by `planSession` from the history before it and
 * diagnosed by `analyzeLocally`, so fixtures carry genuine planner reasoning,
 * confusions and targeted letters rather than hand-typed JSON. Shared by the
 * report lab and `scripts/visual/seed.ts`.
 */

/** In a list of picks: the child stalled and the app supplied the answer. */
export const SUPPLIED = "?";

/** The child's answers, in order — or a function of the session's config, so
 *  a wrong answer can come from the distractors actually on screen. */
export type Picks = string[] | ((config: LevelConfig) => string[]);

export interface SessionScript {
  letter: string;
  /** ISO start time. */
  when: string;
  identify: Picks;
  /** Word games: the first three go to Fill the blank, the rest to Spelling. */
  words: Picks;
  status?: "completed" | "abandoned";
  /** Typical response in ms for Listen & tap; the word games take 1s longer. */
  ms?: number;
  /** Tracing score, recorded only when the planner asked for tracing. */
  tracing?: number;
}

export interface PlayerOptions {
  /** First block of every session id — distinct per child. */
  idPrefix?: string;
  /**
   * Close sessions the way the app does, with metrics computed. Off by
   * default because the visual seed predates it and its output is compared
   * byte for byte.
   */
  metrics?: boolean;
}

const attempts = (
  target: string,
  picks: string[],
  module: ModuleType,
  ms: number,
): QuestionAttempt[] =>
  picks.map((p, i) => {
    const supplied = p === SUPPLIED;
    return {
      target_letter: target,
      selected_letter: supplied ? target : p,
      module_type: module,
      // The app records a supplied answer with latency 0.
      time_to_interact_ms: supplied ? 0 : ms + (i % 3) * 700,
      was_guided_win: supplied,
      hover_duration_ms: 0,
      jitter_count: 0,
    };
  });

export function createPlayer(uid: string, opts: PlayerOptions = {}) {
  const history: LearningSession[] = [];
  const prefix = opts.idPrefix ?? "00000000";
  let n = 0;

  function play(script: SessionScript): LearningSession {
    const { letter, when } = script;
    const status = script.status ?? "completed";
    const profile = buildLearnerProfile(history);
    const { levelConfig } = planSession(uid, letter, profile, []);
    const resolve = (p: Picks) => (typeof p === "function" ? p(levelConfig) : p);
    const identify = resolve(script.identify);
    const words = resolve(script.words);

    const module: ModuleType = levelConfig.distractor_similarity === "low" ? "dissimilar" : "similar";
    const ms = script.ms ?? 4200;
    const idAttempts = attempts(letter, identify, module, ms);
    const wordAttempts = attempts(letter, words, "similar", ms + 1000);

    const t0 = Date.parse(when);
    const at = (m: number) => new Date(t0 + m * 60_000).toISOString();
    const v = (type: ActivityRecord["type"], m: number, outcome: ActivityRecord["outcome"]): ActivityRecord => ({
      type,
      started_at: at(m),
      completed_at: at(m + 1),
      outcome,
    });
    const activities: ActivityRecord[] = [
      v("intro", 0, { kind: "viewed", dwell_ms: 4000 }),
      v("pronunciation", 1, { kind: "viewed", dwell_ms: 5000 }),
      v("example_words", 2, { kind: "viewed", dwell_ms: 6000 }),
      v("matras", 3, { kind: "viewed", dwell_ms: 9000 }),
    ];
    if (script.tracing !== undefined && levelConfig.input_mode === "trace") {
      const score = Math.max(0, Math.min(100, Math.round(script.tracing)));
      activities.push(
        v("tracing", 3, { kind: "tracing", score, passed: score >= 60, tries: score >= 60 ? 1 : 2, model: "easy" }),
      );
    }
    activities.push(
      v("memory", 4, { kind: "memory", moves: 6 + (identify.length % 4), pairs: 3, duration_ms: 40000 }),
      v("identify", 5, { kind: "questions", attempts: idAttempts }),
    );
    if (status === "completed") {
      activities.push(v("word_fill", 7, { kind: "questions", attempts: wordAttempts.slice(0, 3) }));
      activities.push(v("word_spelling", 8, { kind: "questions", attempts: wordAttempts.slice(3) }));
    }

    const all = activities.flatMap((a) => (a.outcome?.kind === "questions" ? a.outcome.attempts : []));
    const diag = analyzeLocally({
      user_id: uid,
      target_alphabet: letter,
      session_id: "x",
      session_number: 1,
      avg_latency_ms: 4500,
      consecutive_fails_peak: 0,
      attempts: all,
    });
    const s: LearningSession = {
      session_id: `${prefix}-0000-4000-8000-${String(++n).padStart(12, "0")}`,
      user_id: uid,
      letter,
      session_number: history.filter((h) => h.letter === letter).length + 1,
      status,
      started_at: at(0),
      ended_at: at(status === "completed" ? 9 : 6),
      level_config: levelConfig,
      activities,
      metrics: opts.metrics ? computeSessionMetrics(all) : null,
      cognitive_state: status === "completed" ? diag.state : null,
      reasoning: status === "completed" ? diag.levelConfig.reasoning : null,
      schema_version: 2,
    };
    history.push(s);
    return s;
  }

  return { history, play };
}

const TABLE = "akshara_db_learning_sessions";

/**
 * Sessions as stored rows, through the app's own writer, so the report reads
 * exactly the shape it reads in production.
 *
 * Needs offline mode: `upsertSession` mirrors to Supabase whenever it is
 * configured and offline mode is off, and a fixture must never reach the live
 * database. The lab's isolated storage sets it.
 */
export function rowsOf(history: LearningSession[]): Record<string, any>[] {
  if (localStorage.getItem("akshara_offline_mode") !== "true") {
    throw new Error("rowsOf: offline mode is off — this would mirror fixture sessions to the live database");
  }
  localStorage.removeItem(TABLE);
  history.forEach(upsertSession);
  const rows = JSON.parse(localStorage.getItem(TABLE) ?? "[]");
  localStorage.removeItem(TABLE);
  return rows;
}

/** One `letter_progress` row per letter played, from its latest completed session. */
export function progressOf(uid: string, history: LearningSession[]) {
  return LETTER_SEQUENCE.filter((l) => history.some((h) => h.letter === l)).map((l) => {
    const last = [...history].reverse().find((h) => h.letter === l && h.status === "completed");
    return {
      user_id: uid,
      letter: l,
      letter_index: LETTER_SEQUENCE.indexOf(l),
      mastered: last?.cognitive_state === "visual_mastery",
      sessions_count: history.filter((h) => h.letter === l).length,
      last_cognitive_state: last?.cognitive_state ?? "insufficient_data",
    };
  });
}

/** A small seeded generator (mulberry32), so every scenario is the same every load. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
