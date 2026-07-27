export type ModuleType = "dissimilar" | "similar" | "scaffold";
export type CognitiveState =
  | "gross_shape_blindness"
  | "feature_neglect"
  | "visual_mastery"
  | "insufficient_data";
export type DistractorSimilarity = "high" | "medium" | "low";
export type VisualAidIntensity = "none" | "static" | "animated";
export type InputMode = "tap" | "drag" | "trace";

export interface LevelConfig {
  user_id: string;
  target_alphabet: string;
  cognitive_state: CognitiveState;
  distractor_similarity: DistractorSimilarity;
  visual_aid_intensity: VisualAidIntensity;
  input_mode: InputMode;
  scaffold_intensity: number;
  distractor_pool: string[];
  feature_to_highlight: string;
  phonological_note: string;
  hesitation_trigger_stage1_ms: number;
  hesitation_trigger_stage2_ms: number;
  reasoning: string;
  provider_used: string;
}

export interface QuestionAttempt {
  target_letter: string;
  selected_letter: string;
  module_type: ModuleType;
  time_to_interact_ms: number;
  was_guided_win: boolean;
  hover_duration_ms: number;
  jitter_count: number;
}

export interface SessionPayload {
  user_id: string;
  target_alphabet: string;
  session_id: string;
  session_number: number;
  avg_latency_ms: number;
  consecutive_fails_peak: number;
  attempts: QuestionAttempt[];
}

export interface AnalyzeSessionResponse {
  status: "ok" | "error";
  level_config: LevelConfig;
  letter_mastered: boolean;
  debug: {
    total_attempts: number;
    error_rate_pct: number;
    cognitive_state: CognitiveState;
  };
}

export const LETTER_SEQUENCE = [
  "क", "ख", "ग", "घ", "ङ",
  "च", "छ", "ज", "झ", "ञ",
  "ट", "ठ", "ड", "ढ", "ण",
  "त", "थ", "द", "ध", "न",
  "प", "फ", "ब", "भ", "म",
  "य", "र", "ल", "व",
  "श", "ष", "स", "ह"
] as const;

export type SequenceLetter = (typeof LETTER_SEQUENCE)[number];

export const FEATURE_HIGHLIGHT_POSITIONS: Record<
  string,
  { top?: string; right?: string; left?: string; bottom?: string }
> = {
  // क / ख / ग / घ / ङ
  loop_cross_middle:     { top: "50%", left: "45%" },
  horizontal_bar_middle:{ top: "45%", right: "15%" },
  open_curve_top:       { top: "8%",  right: "25%" },
  knot_upper_right:     { top: "10%", right: "10%" },
  dot_side_right:       { top: "50%", right: "20%" },

  // च / छ / ज / झ / ञ
  horizontal_bar_left:  { top: "45%", left: "30%" },
  loop_bottom_left:     { bottom: "25%", left: "35%" },
  curve_left_center:    { top: "48%", left: "30%" },
  tail_hook_left:       { bottom: "5%", left: "15%" },
  left_arch_center:     { top: "48%", left: "30%" },

  // ट / ठ / ड / ढ / ण
  c_curve_bottom:       { bottom: "25%", left: "40%" },
  complete_circle_bottom:{ bottom: "25%", left: "50%" },
  s_curve_center:       { top: "48%", left: "45%" },
  hook_right_middle:    { top: "50%", right: "5%"  },
  tail_bottom_right:    { bottom: "10%", right: "10%" },

  // त / थ / द / ध / न
  long_header_top:      { top: "5%",  right: "15%" },
  loop_upper_left:      { top: "25%", left: "30%" },
  loop_tail_bottom:     { bottom: "25%", left: "50%" },
  open_arch_top:        { top: "5%",  right: "35%" },
  loop_horizontal_left: { bottom: "45%", left: "35%" },

  // प / फ / ब / भ / म
  curve_bottom_u:       { bottom: "25%", left: "35%" },
  curve_outer_right:    { bottom: "35%", right: "25%" },
  bump_left_bottom:     { bottom: "15%", left:  "10%" },
  right_bar_upper:      { top: "22%", right: "6%"  },
  arch_top_center:      { top: "10%", left: "50%"  },

  // य / र / ल / व
  open_arch_left:       { top: "45%", left: "30%" },
  diagonal_leg_bottom:  { bottom: "25%", left: "35%" },
  double_loop_left:     { top: "48%", left: "35%" },
  loop_left_middle:     { top: "48%", left: "30%" },

  // श / ष / स / ह
  loop_top_left:        { top: "20%", left: "30%" },
  dot_inside_arch:      { top: "40%", right: "30%" },
  loop_diagonal_tail:   { bottom: "25%", left: "35%" },
  double_hook_bottom:   { bottom: "30%", left: "45%" },
  
  // legacy
  v_notch_bottom:       { bottom: "8%",  right: "38%" },
  closed_loop_bottom:   { bottom: "12%", right: "25%" },
  open_stroke_right:    { bottom: "20%", right: "8%"  },
  nukta_dot_below:      { bottom: "5%",  right: "38%" },
};
