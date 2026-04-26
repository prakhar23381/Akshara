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

export const LETTER_SEQUENCE = ["म", "ग", "घ", "ध", "ब"] as const;
export type SequenceLetter = (typeof LETTER_SEQUENCE)[number];

export const FEATURE_HIGHLIGHT_POSITIONS: Record<
  string,
  { top: string; right?: string; left?: string; bottom?: string }
> = {
  // घ / ध
  knot_upper_right:     { top: "10%", right: "10%" },
  open_arch_top:        { top: "5%",  right: "35%" },
  // ण / ब / व / प / य
  tail_bottom_right:    { bottom: "10%", right: "10%" },
  bump_left_bottom:     { bottom: "15%", left:  "10%" },
  v_notch_bottom:       { bottom: "8%",  right: "38%" },
  closed_loop_bottom:   { bottom: "12%", right: "25%" },
  open_stroke_right:    { bottom: "20%", right: "8%"  },
  // nukta letters (ड़ / ग़)
  nukta_dot_below:      { bottom: "5%",  right: "38%" },
  // ष
  dot_inside_arch:      { top: "40%", right: "30%" },
  // म / भ
  arch_top_center:      { top: "10%", left: "50%"  },   // centre of the double arch
  right_bar_upper:      { top: "22%", right: "6%"  },   // the extra bar on भ
  // क / ख
  horizontal_bar_middle:{ top: "45%", right: "15%" },
  // ट / ठ
  top_bar_small:        { top: "2%",  right: "30%" },
  // ड / ढ
  hook_right_middle:    { top: "50%", right: "5%"  },
  // ज / झ
  tail_hook_left:       { bottom: "5%", left: "15%" },
  // त / न
  long_header_top:      { top: "5%",  right: "15%" },
  // ग / घ
  open_curve_top:       { top: "8%",  right: "25%" },
};
