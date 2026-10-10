/**
 * Client-side adaptive engine.
 *
 * A faithful port of the Flask backend's decision pipeline:
 *   backend/IP/agents/diagnosis_agent.py  → diagnose()
 *   backend/IP/agents/level_generator.py  → STATE_RULES, scaffold, pacing, pools
 *   backend/IP/agents/prompts.py          → per-letter feature keys
 *
 * The backend remains the preferred path (it adds Gemini-personalised distractor
 * selection and teacher-facing reasoning). This runs when the backend is
 * unreachable, so the adaptive loop still works offline and on static hosting
 * instead of freezing on a single hard-coded level.
 *
 * Keep the thresholds here in sync with diagnosis_agent.py.
 */
import type {
  CognitiveState,
  DistractorSimilarity,
  InputMode,
  LevelConfig,
  ModuleType,
  QuestionAttempt,
  SessionPayload,
  VisualAidIntensity,
} from "../types/levelConfig";
import type { LearnerProfile } from "./learnerProfile";

// Exported because the report colours error rates by these same two lines:
// a colour then always marks a point at which this engine changes the
// child's level, rather than a threshold invented for the chart.
export const ERROR_THRESHOLD_FAIL = 0.30;    // >30% error → struggling
export const ERROR_THRESHOLD_MASTERY = 0.10; // <10% error → mastered

export const DISTRACTOR_POOLS: Record<string, { easy: string[]; hard: string[] }> = {
  "क": { easy: ["ल", "ह", "स", "र"], hard: ["ख", "फ", "ट", "ठ"] },
  "ख": { easy: ["ल", "ह", "स", "र"], hard: ["क", "ष", "थ", "ब"] },
  "ग": { easy: ["ल", "ह", "स", "र"], hard: ["घ", "ध", "ज", "ञ"] },
  "घ": { easy: ["ल", "ह", "स", "र"], hard: ["ग", "ध", "ज", "ञ"] },
  "ङ": { easy: ["ल", "ह", "स", "र"], hard: ["ड", "ढ", "इ", "झ"] },
  "च": { easy: ["ल", "ह", "स", "र"], hard: ["ज", "झ", "ञ", "द"] },
  "छ": { easy: ["ल", "ह", "स", "र"], hard: ["च", "ह", "ध", "घ"] },
  "ज": { easy: ["ल", "ह", "स", "र"], hard: ["झ", "च", "ञ", "द"] },
  "झ": { easy: ["ल", "ह", "स", "र"], hard: ["ज", "ङ", "ड", "इ"] },
  "ञ": { easy: ["ल", "ह", "स", "र"], hard: ["ज", "च", "झ", "न"] },
  "ट": { easy: ["ल", "ह", "स", "र"], hard: ["ठ", "ड", "ढ", "द"] },
  "ठ": { easy: ["ल", "ह", "स", "र"], hard: ["ट", "ड", "ढ", "द"] },
  "ड": { easy: ["ल", "ह", "स", "र"], hard: ["ङ", "ढ", "झ", "इ"] },
  "ढ": { easy: ["ल", "ह", "स", "र"], hard: ["ड", "ट", "ठ", "द"] },
  "ण": { easy: ["ल", "ह", "स", "र"], hard: ["न", "त", "म", "ब"] },
  "त": { easy: ["ल", "ह", "स", "र"], hard: ["न", "थ", "ध", "म"] },
  "थ": { easy: ["ल", "ह", "स", "र"], hard: ["त", "ध", "य", "प"] },
  "द": { easy: ["ल", "ह", "स", "र"], hard: ["ट", "ठ", "ढ", "ह"] },
  "ध": { easy: ["ल", "ह", "स", "र"], hard: ["घ", "ग", "ज", "ञ"] },
  "न": { easy: ["ल", "ह", "स", "र"], hard: ["त", "ध", "म", "ब"] },
  "प": { easy: ["ल", "ह", "स", "र"], hard: ["य", "ष", "फ", "ण"] },
  "फ": { easy: ["ल", "ह", "स", "र"], hard: ["प", "क", "ष", "ण"] },
  "ब": { easy: ["ल", "ह", "स", "र"], hard: ["व", "भ", "ध", "ण"] },
  "भ": { easy: ["ल", "ह", "स", "र"], hard: ["म", "ध", "न", "ब"] },
  "म": { easy: ["ल", "ह", "स", "र"], hard: ["भ", "ध", "न", "ब"] },
  "य": { easy: ["ल", "ह", "स", "र"], hard: ["प", "ष", "फ", "ण"] },
  "र": { easy: ["ल", "ह", "स", "व"], hard: ["स", "ख", "च", "ड"] },
  "ल": { easy: ["ह", "स", "र", "व"], hard: ["त", "न", "म", "ब"] },
  "व": { easy: ["ल", "ह", "स", "र"], hard: ["ब", "भ", "ध", "ण"] },
  "श": { easy: ["ल", "ह", "स", "र"], hard: ["ष", "स", "ख", "य"] },
  "ष": { easy: ["ल", "ह", "स", "र"], hard: ["प", "य", "फ", "ख"] },
  "स": { easy: ["ल", "ह", "र", "व"], hard: ["ष", "श", "र", "ख"] },
  "ह": { easy: ["ल", "स", "र", "व"], hard: ["ड", "ढ", "इ", "ट"] },
};

export const FEATURE_BY_LETTER: Record<string, string> = {
  "क": "loop_cross_middle",
  "ख": "horizontal_bar_middle",
  "ग": "open_curve_top",
  "घ": "knot_upper_right",
  "ङ": "dot_side_right",
  "च": "horizontal_bar_left",
  "छ": "loop_bottom_left",
  "ज": "curve_left_center",
  "झ": "tail_hook_left",
  "ञ": "left_arch_center",
  "ट": "c_curve_bottom",
  "ठ": "complete_circle_bottom",
  "ड": "s_curve_center",
  "ढ": "hook_right_middle",
  "ण": "tail_bottom_right",
  "त": "long_header_top",
  "थ": "loop_upper_left",
  "द": "loop_tail_bottom",
  "ध": "open_arch_top",
  "न": "loop_horizontal_left",
  "प": "curve_bottom_u",
  "फ": "curve_outer_right",
  "ब": "bump_left_bottom",
  "भ": "right_bar_upper",
  "म": "arch_top_center",
  "य": "open_arch_left",
  "र": "diagonal_leg_bottom",
  "ल": "double_loop_left",
  "व": "loop_left_middle",
  "श": "loop_top_left",
  "ष": "dot_inside_arch",
  "स": "loop_diagonal_tail",
  "ह": "double_hook_bottom",
};

const DEFAULT_EASY = ["ल", "ह", "स", "र"];
const DEFAULT_HARD = ["भ", "ध", "न", "ब"];

interface StateRule {
  distractor_similarity: DistractorSimilarity;
  visual_aid_intensity: VisualAidIntensity;
  input_mode: InputMode;
}

const STATE_RULES: Record<CognitiveState, StateRule> = {
  gross_shape_blindness: {
    distractor_similarity: "low",
    visual_aid_intensity: "animated",
    input_mode: "trace",
  },
  feature_neglect: {
    distractor_similarity: "high",
    visual_aid_intensity: "static",
    input_mode: "tap",
  },
  visual_mastery: {
    distractor_similarity: "high",
    visual_aid_intensity: "none",
    input_mode: "tap",
  },
  insufficient_data: {
    distractor_similarity: "low",
    visual_aid_intensity: "none", // first session is an assessment — no cues
    input_mode: "trace",
  },
};

/**
 * Error rate for one module. Mirrors SessionPayload.error_rate_for_module:
 * SCAFFOLD counts towards SIMILAR, because scaffolded questions still use
 * high-similarity distractors — otherwise a child can never progress out of
 * FEATURE_NEGLECT without a pure "similar" session.
 */
function errorRateForModule(
  attempts: QuestionAttempt[],
  module: ModuleType,
): number | null {
  const relevant =
    module === "similar"
      ? attempts.filter(
          (a) => a.module_type === "similar" || a.module_type === "scaffold",
        )
      : attempts.filter((a) => a.module_type === module);

  if (relevant.length === 0) return null;
  const errors = relevant.filter(
    (a) => a.target_letter !== a.selected_letter,
  ).length;
  return errors / relevant.length;
}

function topConfusedPairs(
  attempts: QuestionAttempt[],
  module: ModuleType,
  topN = 3,
): string[] {
  const counts = new Map<string, number>();
  attempts
    .filter(
      (a) => a.module_type === module && a.target_letter !== a.selected_letter,
    )
    .forEach((a) => {
      const key = `${a.target_letter}→${a.selected_letter}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([pair]) => pair);
}

export function overallErrorRate(attempts: QuestionAttempt[]): number {
  if (attempts.length === 0) return 0;
  const errors = attempts.filter(
    (a) => a.target_letter !== a.selected_letter,
  ).length;
  return errors / attempts.length;
}

export interface Diagnosis {
  state: CognitiveState;
  reasoning: string;
}

/** Port of DiagnosisAgent.diagnose — deterministic, explainable, no LLM. */
export function diagnose(
  attempts: QuestionAttempt[],
  targetLetter: string,
): Diagnosis {
  const dissimilarErr = errorRateForModule(attempts, "dissimilar");
  const similarErr = errorRateForModule(attempts, "similar");
  const pct = (v: number) => Math.round(v * 100);

  if (dissimilarErr === null && similarErr === null) {
    return {
      state: "insufficient_data",
      reasoning: "No attempts found. Defaulting to standard L1 start.",
    };
  }

  if (dissimilarErr !== null) {
    if (dissimilarErr > ERROR_THRESHOLD_FAIL) {
      const confused = topConfusedPairs(attempts, "dissimilar");
      return {
        state: "gross_shape_blindness",
        reasoning:
          `Student confused ${pct(dissimilarErr)}% of dissimilar-contrast questions. ` +
          `Top confusions: ${confused.join(", ") || "none"}. ` +
          `Cannot distinguish ${targetLetter} from visually different shapes.`,
      };
    }

    // No similar-module data yet: only advance once dissimilar is mastered.
    if (similarErr === null) {
      if (dissimilarErr >= ERROR_THRESHOLD_MASTERY) {
        return {
          state: "gross_shape_blindness",
          reasoning:
            `Student still making ${pct(dissimilarErr)}% errors on dissimilar-contrast. ` +
            `Keeping on dissimilar module until error rate drops below ${pct(ERROR_THRESHOLD_MASTERY)}%.`,
        };
      }
      return {
        state: "feature_neglect",
        reasoning:
          `Mastered dissimilar module (${pct(dissimilarErr)}% error). ` +
          `Advancing to similar-contrast module to test feature discrimination of ${targetLetter}.`,
      };
    }
  }

  // Similar-module data present.
  if (similarErr! > ERROR_THRESHOLD_FAIL) {
    const confused = topConfusedPairs(attempts, "similar");
    return {
      state: "feature_neglect",
      reasoning:
        `Confused ${pct(similarErr!)}% of similar-contrast questions. ` +
        `Top confusions: ${confused.join(", ") || "none"}. ` +
        `Student ignores distinguishing features (knot, line-break) of ${targetLetter}.`,
    };
  }

  if (similarErr! < ERROR_THRESHOLD_MASTERY) {
    return {
      state: "visual_mastery",
      reasoning:
        `Excellent performance: only ${pct(similarErr!)}% errors on similar-contrast. ` +
        `Student has mastered ${targetLetter}. Ready for next alphabet.`,
    };
  }

  return {
    state: "feature_neglect",
    reasoning:
      `Moderate difficulty on similar-contrast (${pct(similarErr!)}% error). ` +
      `Treating as Feature Neglect — reinforce distinguishing features.`,
  };
}

/**
 * A brand-new letter must not skip shape recognition, however well the child
 * did on the last one — so a carried-forward VISUAL_MASTERY enters the new
 * letter at FEATURE_NEGLECT. Mirrors `_NEW_LETTER_STATE_CAP` in
 * backend/IP/routes/analyze.py.
 */
export const NEW_LETTER_STATE_CAP: Partial<Record<CognitiveState, CognitiveState>> = {
  visual_mastery: "feature_neglect",
};

/**
 * Seed a new letter from what we already know about the child.
 *
 * `insufficient_data` means this payload carries no attempts, which is the
 * initialisation call for a letter the child is opening. Cold-starting there
 * would hand a child who has already mastered four letters the same assessment
 * as one who has never seen Devanagari. If any prior letter produced a state,
 * start from that instead.
 *
 * This lived on the server, where it required a database query per level. The
 * history is on the device that asks, so the lookup belongs here.
 */
export function carryForward(
  diagnosis: Diagnosis,
  priorState: CognitiveState | null | undefined,
  targetLetter: string,
): Diagnosis {
  if (diagnosis.state !== "insufficient_data") return diagnosis;
  if (!priorState || priorState === "insufficient_data") return diagnosis;

  const state = NEW_LETTER_STATE_CAP[priorState] ?? priorState;
  return {
    state,
    reasoning:
      `Carrying forward learning profile from prior letter. ` +
      `Prior state: ${priorState} → starting ${targetLetter} at ${state}.`,
  };
}

/** Port of LevelGeneratorAgent._compute_scaffold. */
function computeScaffold(state: CognitiveState, errorRate: number): number {
  if (state === "visual_mastery") return 0.0;
  if (state === "gross_shape_blindness") {
    return round2(Math.min(1.0, Math.max(0.70, 0.70 + errorRate * 0.40)));
  }
  if (state === "feature_neglect") {
    return round2(Math.min(0.65, Math.max(0.35, 0.35 + errorRate * 0.50)));
  }
  return 0.55; // insufficient_data
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * How many slots in the pool the child's own confusions may take.
 *
 * Fewer in the low-similarity states. There the diagnosis labels every
 * question "dissimilar", so each confusable letter added makes that label a
 * little less true — and a child who keeps failing hard letters under a
 * "dissimilar" label is held in GROSS_SHAPE_BLINDNESS longer. One slot keeps the
 * session personal without letting it rewrite the measurement.
 */
export const PERSONAL_SLOTS: Record<CognitiveState, number> = {
  insufficient_data: 1,
  gross_shape_blindness: 1,
  feature_neglect: 2,
  visual_mastery: 2,
};

function pickDistractors(
  target: string,
  state: CognitiveState,
  previousPool: string[],
  confused: string[] = [],
): { pool: string[]; personal: string[] } {
  const pools = DISTRACTOR_POOLS[target];
  const useHard = state === "feature_neglect" || state === "visual_mastery";
  const base = pools
    ? useHard
      ? pools.hard
      : pools.easy
    : useHard
      ? DEFAULT_HARD
      : DEFAULT_EASY;
  const size = base.filter((l) => l !== target).length;

  // The child's own confusions lead. The static pool only fills what is left —
  // it is a fallback for a child we know nothing about, not the default.
  const personal = confused
    .filter((l) => l !== target)
    .slice(0, PERSONAL_SLOTS[state]);
  let filler = base.filter((l) => l !== target && !personal.includes(l));

  // Rotate at least one *static* letter versus the previous session so the
  // child cannot memorise a fixed grid (prompts.py distractor rule 2). A
  // personal letter is never rotated out: it is there because the child gets it
  // wrong, and dropping it for variety would undo the point.
  const candidate = [...personal, ...filler].slice(0, size);
  const isRepeat =
    previousPool.length === candidate.length &&
    previousPool.every((l, i) => l === candidate[i]);
  if (isRepeat && pools && filler.length > 0) {
    const alternatives = (useHard ? pools.easy : pools.hard).filter(
      (l) => l !== target && !candidate.includes(l),
    );
    filler =
      alternatives.length > 0
        ? [...filler.slice(0, Math.max(0, size - personal.length - 1)), alternatives[0]]
        : [...filler.slice(1), filler[0]];
  }

  return { pool: [...personal, ...filler].slice(0, size), personal };
}

/**
 * Hesitation pacing, ported from LevelGeneratorAgent.generate.
 * Jitter and prolonged hovering compress the rescue delay (attention /
 * coordination / anxiety cues), floored so hints never flash too fast.
 */
function pacingMultiplier(attempts: QuestionAttempt[]): number {
  const jitterTotal = attempts.reduce((s, a) => s + a.jitter_count, 0);
  const avgHover =
    attempts.length > 0
      ? attempts.reduce((s, a) => s + a.hover_duration_ms, 0) / attempts.length
      : 0;

  let multiplier = 1.0;
  if (jitterTotal > 5) {
    multiplier -= Math.min(0.3, (jitterTotal - 5) * 0.03);
  }
  if (avgHover > 2000) {
    multiplier -= Math.min(0.2, (avgHover - 2000) / 10000);
  }
  return Math.max(0.5, multiplier);
}

export interface LocalAnalysis {
  levelConfig: LevelConfig;
  letterMastered: boolean;
  errorRatePct: number;
  state: CognitiveState;
}

/**
 * Full local equivalent of POST /analyze_session.
 * `previousPool` lets us honour the "rotate ≥1 distractor" rule across sessions.
 */
export function analyzeLocally(
  payload: SessionPayload,
  previousPool: string[] = [],
): LocalAnalysis {
  const attempts = payload.attempts ?? [];
  const target = payload.target_alphabet;
  const { state, reasoning } = carryForward(
    diagnose(attempts, target),
    payload.prior_cognitive_state,
    target,
  );
  const rules = STATE_RULES[state];
  const errorRate = overallErrorRate(attempts);

  const baseline = payload.avg_latency_ms > 0 ? payload.avg_latency_ms : 6000;
  const pacing = pacingMultiplier(attempts);

  const levelConfig: LevelConfig = {
    user_id: payload.user_id,
    target_alphabet: target,
    cognitive_state: state,
    distractor_similarity: rules.distractor_similarity,
    visual_aid_intensity: rules.visual_aid_intensity,
    input_mode: rules.input_mode,
    scaffold_intensity: computeScaffold(state, errorRate),
    distractor_pool: pickDistractors(target, state, previousPool).pool,
    feature_to_highlight: FEATURE_BY_LETTER[target] ?? "",
    phonological_note: "",
    hesitation_trigger_stage1_ms: baseline + 8000 * pacing,
    hesitation_trigger_stage2_ms: baseline + 13000 * pacing,
    reasoning,
    provider_used: "on-device",
  };

  return {
    levelConfig,
    letterMastered: state === "visual_mastery",
    errorRatePct: Math.round(errorRate * 1000) / 10,
    state,
  };
}

/** Plausible response-time bounds, so one distracted session cannot set absurd timers. */
const BASELINE_MIN_MS = 3000;
const BASELINE_MAX_MS = 12000;

/**
 * Configure a new session from what this child has actually done.
 *
 * This replaces calling `analyzeLocally` with an empty attempt list, which is
 * what opening a letter used to do — and with no attempts there is nothing to
 * adapt to, so every session started from the static pools, the same 14s/19s
 * nudge timers and, at best, the last state the child reached on *some other*
 * letter. Each decision here now comes from the profile:
 *
 *  - **state** — this letter's own last diagnosis if the child has one. Only a
 *    letter they have never finished borrows from the latest state elsewhere,
 *    capped as before so a new letter never skips shape recognition.
 *  - **distractors** — the letters this child confuses with this one, first.
 *  - **nudge timing** — from the child's own median response time, not a
 *    hardcoded 6s.
 *  - **scaffold** — from this letter's last error rate, not zero.
 *
 * With an empty profile every one of these falls back to exactly what the
 * engine did before, so a brand-new child gets the standard assessment.
 */
export function planSession(
  userId: string,
  target: string,
  profile: LearnerProfile,
  previousPool: string[] = [],
): LocalAnalysis {
  const own = profile.stateByLetter[target];
  const { state, reasoning: stateReason } = own
    ? {
        state: own,
        reasoning: `Last session on ${target} was diagnosed ${own}; continuing from there.`,
      }
    : carryForward(
        { state: "insufficient_data", reasoning: "No history on this letter yet." },
        profile.latestState,
        target,
      );

  const confused = Object.entries(profile.confusions[target] ?? {})
    .filter(([l]) => l !== target)
    .sort((a, b) => b[1] - a[1])
    .map(([l]) => l);
  const { pool, personal } = pickDistractors(target, state, previousPool, confused);

  const errorRate = profile.errorRateByLetter[target] ?? 0;
  const rules = STATE_RULES[state];
  const baseline =
    profile.latencyMedianMs !== null
      ? Math.min(BASELINE_MAX_MS, Math.max(BASELINE_MIN_MS, profile.latencyMedianMs))
      : 6000;

  const parts = [
    profile.sessionCount > 0
      ? `Personalised from ${profile.sessionCount} recorded session${profile.sessionCount === 1 ? "" : "s"} (${profile.source}).`
      : "No recorded sessions yet: standard first assessment.",
    stateReason,
    personal.length > 0
      ? `Distractors include this child's own confusions: ${personal.join(", ")}.`
      : "No recorded confusions for this letter; using the standard pool.",
    profile.latencyMedianMs !== null
      ? `Nudge timing set from a median response of ${(baseline / 1000).toFixed(1)}s.`
      : "",
  ].filter(Boolean);

  const levelConfig: LevelConfig = {
    user_id: userId,
    target_alphabet: target,
    cognitive_state: state,
    distractor_similarity: rules.distractor_similarity,
    visual_aid_intensity: rules.visual_aid_intensity,
    input_mode: rules.input_mode,
    scaffold_intensity: computeScaffold(state, errorRate),
    distractor_pool: pool,
    confused_letters: personal,
    include_matras: true,
    feature_to_highlight: FEATURE_BY_LETTER[target] ?? "",
    phonological_note: "",
    hesitation_trigger_stage1_ms: baseline + 8000,
    hesitation_trigger_stage2_ms: baseline + 13000,
    reasoning: parts.join(" "),
    provider_used: "on-device",
  };

  return {
    levelConfig,
    letterMastered: state === "visual_mastery",
    errorRatePct: Math.round(errorRate * 1000) / 10,
    state,
  };
}
