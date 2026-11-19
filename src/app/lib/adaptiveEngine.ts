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
  LessonKind,
  LevelConfig,
  ModuleType,
  PlannedQuestion,
  QuestionAttempt,
  SessionPayload,
  VisualAidIntensity,
} from "../types/levelConfig";
import type { LearnerProfile } from "./learnerProfile";
import {
  CHECKPOINT_OLDER,
  CONTRAST_QUESTIONS,
  IDENTIFY_QUESTIONS,
  LESSON_LABEL,
  LESSON_STEPS,
  PRACTICE_QUESTIONS,
  WARMUP_QUESTIONS,
} from "../data/curriculum";

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
 * A question the child did not answer correctly on their own: a wrong pick, or
 * one the hesitation ladder answered for them. Mirrors
 * QuestionAttempt.is_miss in backend/IP/models/session.py.
 *
 * A supplied answer is stored as `selected_letter = target`, so comparing the
 * two letters alone scored it as right — and a child rescued on every hard
 * question could be diagnosed as having mastered the letter (TODO E2).
 */
export const isMiss = (a: QuestionAttempt): boolean =>
  a.was_guided_win || a.target_letter !== a.selected_letter;

/**
 * The questions about the session's own letter. A session can also carry one
 * check question on a letter the child has already mastered (see
 * `letterStatus.ts`); that answer is evidence about the other letter, not this
 * one.
 */
export const ownAttempts = (
  attempts: QuestionAttempt[],
  letter: string,
): QuestionAttempt[] => attempts.filter((a) => a.target_letter === letter);

/**
 * Share of missed questions in one module. Mirrors
 * SessionPayload.error_rate_for_module: SCAFFOLD counts towards SIMILAR,
 * because scaffolded questions still use high-similarity distractors —
 * otherwise a child can never progress out of FEATURE_NEGLECT without a pure
 * "similar" session.
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
  return relevant.filter(isMiss).length / relevant.length;
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

/** Share of missed questions — wrong or supplied. */
export function overallErrorRate(attempts: QuestionAttempt[]): number {
  if (attempts.length === 0) return 0;
  return attempts.filter(isMiss).length / attempts.length;
}

export interface Diagnosis {
  state: CognitiveState;
  reasoning: string;
}

/**
 * Port of DiagnosisAgent.diagnose — deterministic, explainable, no LLM.
 * Judged only on the questions about `targetLetter`.
 */
export function diagnose(
  allAttempts: QuestionAttempt[],
  targetLetter: string,
): Diagnosis {
  const attempts = ownAttempts(allAttempts, targetLetter);
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
          `Student missed ${pct(dissimilarErr)}% of dissimilar-contrast questions (wrong, or the answer was supplied). ` +
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
            `Student still missing ${pct(dissimilarErr)}% of dissimilar-contrast questions. ` +
            `Keeping on dissimilar module until that drops below ${pct(ERROR_THRESHOLD_MASTERY)}%.`,
        };
      }
      return {
        state: "feature_neglect",
        reasoning:
          `Mastered dissimilar module (${pct(dissimilarErr)}% missed). ` +
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
        `Missed ${pct(similarErr!)}% of similar-contrast questions (wrong, or the answer was supplied). ` +
        `Top confusions: ${confused.join(", ") || "none"}. ` +
        `Student ignores distinguishing features (knot, line-break) of ${targetLetter}.`,
    };
  }

  if (similarErr! < ERROR_THRESHOLD_MASTERY) {
    return {
      state: "visual_mastery",
      reasoning:
        `Excellent performance: only ${pct(similarErr!)}% of similar-contrast questions missed. ` +
        `Student has mastered ${targetLetter}. Ready for next alphabet.`,
    };
  }

  return {
    state: "feature_neglect",
    reasoning:
      `Moderate difficulty on similar-contrast (${pct(similarErr!)}% missed). ` +
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
  const errorRate = overallErrorRate(ownAttempts(attempts, target));

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

/**
 * A review question on an earlier letter (G2): look-alike choices once the
 * child is past the shape, different shapes before, with the letters this
 * child mixes it up with among them. No dot from the start — review is
 * recall — but it appears if the child hesitates.
 */
export function reviewQuestion(letter: string, profile: LearnerProfile): PlannedQuestion {
  const state = profile.stateByLetter[letter] ?? "feature_neglect";
  const easy = state === "gross_shape_blindness" || state === "insufficient_data";
  const pools = DISTRACTOR_POOLS[letter];
  const pool = (easy ? pools?.easy : pools?.hard) ?? (easy ? DEFAULT_EASY : DEFAULT_HARD);
  const confused = Object.entries(profile.confusions[letter] ?? {})
    .filter(([l]) => l !== letter)
    .sort((a, b) => b[1] - a[1])
    .map(([l]) => l)
    .slice(0, 1);
  return {
    target: letter,
    pool: [...new Set([...confused, ...pool])].filter((l) => l !== letter),
    confused,
    aid: "static",
    module: easy ? "dissimilar" : "similar",
  };
}

const shuffled = <T,>(items: T[]): T[] => {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** The dot a review question gets from the letter's stage: from the start only while learning the shape. */
const aidFor = (letter: string, profile: LearnerProfile): VisualAidIntensity =>
  profile.stateByLetter[letter] === "gross_shape_blindness" ? "animated" : "static";

/**
 * A lesson on several letters (G2, plan §6): side by side, practice or a unit
 * check. Built from the games that exist — Listen & tap over the letters, then
 * Memory with them — and planned in full here, so the session's config says
 * exactly what was asked.
 *
 * - **contrast**: `focus` is the pair. Six questions, three on each, in mixed
 *   order, the other letter of the pair always among the choices.
 * - **practice**: `focus` is the unit's weak letters. Six questions among
 *   different shapes, the dot from the start, as their stage asks.
 * - **checkpoint**: `focus` is the unit's letters. One question on each, then
 *   the two earlier letters most due for review. Nothing in it can be failed.
 */
export function planReview(
  userId: string,
  kind: Extract<LessonKind, "contrast" | "practice" | "checkpoint">,
  focus: string[],
  profile: LearnerProfile,
  unit?: number,
): LevelConfig {
  const lead = focus[0];
  let questions: PlannedQuestion[];
  if (kind === "contrast") {
    const [a, b] = focus;
    const half = Math.floor(CONTRAST_QUESTIONS / 2);
    questions = shuffled([...Array(half).fill(a), ...Array(CONTRAST_QUESTIONS - half).fill(b)]).map((t) => {
      const other = t === a ? b : a;
      const pool = (DISTRACTOR_POOLS[t]?.hard ?? DEFAULT_HARD).filter((l) => l !== a && l !== b);
      return { target: t, pool: [other, ...pool], confused: [other], aid: aidFor(t, profile), module: "similar" as const };
    });
  } else if (kind === "practice") {
    questions = shuffled(Array.from({ length: PRACTICE_QUESTIONS }, (_, i) => focus[i % focus.length])).map((t) => {
      const q = reviewQuestion(t, profile);
      const easy = (DISTRACTOR_POOLS[t]?.easy ?? DEFAULT_EASY).filter((l) => l !== t);
      return { ...q, pool: [...new Set([...(q.confused ?? []), ...easy])], aid: "animated" as const, module: "dissimilar" as const };
    });
  } else {
    const older = profile.reviewOrder.filter((l) => !focus.includes(l)).slice(0, CHECKPOINT_OLDER);
    questions = [...shuffled(focus), ...older].map((t) => reviewQuestion(t, profile));
  }

  const baseline = baselineOf(profile);
  const state = profile.stateByLetter[lead] ?? "feature_neglect";
  return {
    user_id: userId,
    target_alphabet: lead,
    cognitive_state: state,
    distractor_similarity: kind === "practice" ? "low" : "high",
    visual_aid_intensity: kind === "practice" ? "animated" : "static",
    input_mode: "tap",
    scaffold_intensity: 0.5,
    // Memory falls back to these if the lesson has too few letters of its own.
    distractor_pool: (DISTRACTOR_POOLS[lead]?.hard ?? DEFAULT_HARD).filter((l) => !focus.includes(l)),
    confused_letters: [],
    feature_to_highlight: FEATURE_BY_LETTER[lead] ?? "",
    phonological_note: "",
    hesitation_trigger_stage1_ms: baseline + 8000,
    hesitation_trigger_stage2_ms: baseline + 13000,
    reasoning: `Lesson: ${LESSON_LABEL[kind]} on ${focus.join(", ")}${unit !== undefined ? ` (unit ${unit + 1})` : ""}.`,
    provider_used: "on-device",
    lesson: kind,
    steps: [...LESSON_STEPS[kind]],
    questions,
    focus: [...focus],
    ...(unit !== undefined ? { unit } : {}),
  };
}

/** The child's typical response time, bounded; 6 s for a child we know nothing about. */
function baselineOf(profile: LearnerProfile): number {
  return profile.latencyMedianMs !== null
    ? Math.min(BASELINE_MAX_MS, Math.max(BASELINE_MIN_MS, profile.latencyMedianMs))
    : 6000;
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
 *  - **a check question** — when a letter the child has mastered keeps being
 *    picked by mistake, one question asks for it (TODO E3, letterStatus.ts).
 *
 * With an empty profile every one of these falls back to exactly what the
 * engine did before, so a brand-new child gets the standard assessment.
 *
 * **`lesson` (G1)** makes the session one of the letter's three lessons: it
 * takes that lesson's activities, and the difficulty inside them is set as
 * above. Meet is the exception on difficulty — a first look at a letter is
 * always among different-shape letters, whatever stage the child brings from
 * other letters, and it carries no check question. Without `lesson` this plans
 * a session as they were before lessons: every activity in one sitting.
 */
export function planSession(
  userId: string,
  target: string,
  profile: LearnerProfile,
  previousPool: string[] = [],
  lesson?: LessonKind,
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
  const meeting = lesson === "meet";
  const { pool, personal } = pickDistractors(
    target,
    meeting ? "insufficient_data" : state,
    previousPool,
    confused,
  );

  const errorRate = profile.errorRateByLetter[target] ?? 0;
  const rules = STATE_RULES[state];

  // A mix-up is evidence about both letters, but it never takes mastery away
  // by itself: the letter is asked for once, among the letters it was mistaken
  // for, and only that answer decides. Never this session's own letter.
  // Only where it can be asked: the last question of a five-question Listen & tap.
  const due =
    lesson === undefined || lesson === "find"
      ? profile.checks.find((c) => c.letter !== target)
      : undefined;
  const check = due
    ? {
        letter: due.letter,
        confused: due.pickedFor.filter((l) => l !== due.letter).slice(0, 3),
        pool: [
          ...new Set([
            ...due.pickedFor,
            ...(DISTRACTOR_POOLS[due.letter]?.hard ?? DEFAULT_HARD),
          ]),
        ].filter((l) => l !== due.letter),
      }
    : undefined;

  const baseline = baselineOf(profile);

  // The warm-up (G2): the earlier letters most due for review, never this
  // lesson's own. Empty until the child has a complete letter.
  const warmLetters = lesson
    ? profile.reviewOrder.filter((l) => l !== target).slice(0, WARMUP_QUESTIONS)
    : [];
  const warmup = warmLetters.map((l) => reviewQuestion(l, profile));

  const parts = [
    lesson ? `Lesson: ${LESSON_LABEL[lesson]}.` : "",
    warmLetters.length > 0 ? `Warm-up on ${warmLetters.join(", ")}.` : "",
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
    due
      ? `One question checks ${due.letter}: mastered, but picked by mistake ${due.picks} times since (for ${due.pickedFor.join(", ")}).`
      : "",
  ].filter(Boolean);

  const levelConfig: LevelConfig = {
    user_id: userId,
    target_alphabet: target,
    cognitive_state: state,
    distractor_similarity: meeting ? "low" : rules.distractor_similarity,
    visual_aid_intensity: rules.visual_aid_intensity,
    input_mode: rules.input_mode,
    scaffold_intensity: computeScaffold(state, errorRate),
    distractor_pool: pool,
    confused_letters: personal,
    ...(lesson
      ? {
          lesson,
          steps: [...(warmup.length > 0 ? (["warmup"] as const) : []), ...LESSON_STEPS[lesson]],
          ...(warmup.length > 0 ? { warmup } : {}),
          ...(IDENTIFY_QUESTIONS[lesson] ? { identify_questions: IDENTIFY_QUESTIONS[lesson] } : {}),
        }
      : { include_matras: true }),
    ...(check ? { check } : {}),
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
