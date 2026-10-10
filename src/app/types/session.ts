import type { CognitiveState, LevelConfig, QuestionAttempt } from "./levelConfig";
import type { SessionMetrics } from "../lib/sessionMetrics";

/**
 * One child, one letter, one continuous play-through of the activity sequence.
 *
 * Before this existed, a "session" was only an id generated lazily inside
 * useSessionTracker — at GameScreen, step 6 of 9 — sent to the backend, parsed,
 * and then discarded, because `learning_sessions` has no `session_id` column.
 * The row was written once at the very end, so a child who stopped early left
 * no record at all and five of the eight activities were never measured.
 */

export type ActivityType =
  // Passive: the child is shown something.
  | "intro"
  | "pronunciation"
  | "example_words"
  | "matras"
  // Skill: the child produces something, scored but not a question.
  | "tracing"
  | "memory"
  // Assessed: question/answer, feeds the diagnosis.
  | "identify"
  | "word_fill"
  | "word_spelling";

/** Activities whose attempts drive the cognitive-state diagnosis. */
export const ASSESSED_ACTIVITIES: ActivityType[] = [
  "identify",
  "word_fill",
  "word_spelling",
];

export type ActivityOutcome =
  | { kind: "viewed"; dwell_ms: number }
  | {
      kind: "tracing";
      score: number;
      passed: boolean;
      tries: number;
      model: "easy" | "strict";
    }
  | { kind: "memory"; moves: number; pairs: number; duration_ms: number }
  | { kind: "questions"; attempts: QuestionAttempt[] };

export interface ActivityRecord {
  type: ActivityType;
  started_at: string;
  completed_at: string | null;
  outcome: ActivityOutcome | null;
}

export type SessionStatus = "in_progress" | "completed" | "abandoned";

export interface LearningSession {
  session_id: string;
  user_id: string;
  letter: string;
  session_number: number;
  status: SessionStatus;
  started_at: string;
  ended_at: string | null;
  /** The config that drove this session, snapshotted so the report can explain it. */
  level_config: LevelConfig;
  activities: ActivityRecord[];
  /** Computed when the session closes. */
  metrics: SessionMetrics | null;
  cognitive_state: CognitiveState | null;
  reasoning: string | null;
  schema_version: 2;
}

/**
 * The activity sequence for a session.
 *
 * Derived from the level config rather than hardcoded, so the order lives in one
 * place instead of being implied by nine separate `navigate()` calls. Tracing is
 * included only when the config asks for it — STATE_RULES sets
 * `input_mode: "trace"` for GROSS_SHAPE_BLINDNESS and INSUFFICIENT_DATA, where
 * motor tracing is the intervention; a child already discriminating fine
 * features does not need to be sent back to it.
 */
export function buildStepOrder(config: LevelConfig): ActivityType[] {
  const steps: ActivityType[] = ["intro", "pronunciation", "example_words"];
  // Gated on the config rather than always present: the report derives each
  // past session's completion from this order, so adding a step for everyone
  // would retroactively mark every earlier session incomplete. Sessions planned
  // from a learner profile carry the flag; older ones never had the step.
  if (config.include_matras) steps.push("matras");
  if (config.input_mode === "trace") steps.push("tracing");
  steps.push("memory", "identify", "word_fill", "word_spelling");
  return steps;
}

/** All attempts across every assessed activity, in order. */
export function sessionAttempts(session: LearningSession): QuestionAttempt[] {
  return session.activities.flatMap((a) =>
    a.outcome?.kind === "questions" ? a.outcome.attempts : [],
  );
}

export function activityOf(
  session: LearningSession,
  type: ActivityType,
): ActivityRecord | undefined {
  return session.activities.find((a) => a.type === type);
}

export function isComplete(
  session: LearningSession,
  type: ActivityType,
): boolean {
  return Boolean(activityOf(session, type)?.completed_at);
}

/** The step the child should be on: the first one not yet completed. */
export function nextStep(session: LearningSession): ActivityType | null {
  const order = buildStepOrder(session.level_config);
  return order.find((t) => !isComplete(session, t)) ?? null;
}

export function sessionProgressPct(session: LearningSession): number {
  const order = buildStepOrder(session.level_config);
  const done = order.filter((t) => isComplete(session, t)).length;
  return Math.round((done / order.length) * 100);
}

export function sessionDurationMs(session: LearningSession): number {
  const end = session.ended_at ? new Date(session.ended_at) : new Date();
  return Math.max(0, end.getTime() - new Date(session.started_at).getTime());
}
