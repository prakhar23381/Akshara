import type {
  AnalyzeSessionResponse,
  LevelConfig,
  SessionPayload,
} from "../types/levelConfig";
import { supabase } from "../lib/supabase";

export interface LetterStat {
  sessions_count: number;
  mastered: boolean;
  last_cognitive_state: string;
  avg_error_rate_pct: number | null;
  trend: "improving" | "stable" | "needs attention";
  confused_with: string[];
}

export interface ProgressReport {
  status: "ok";
  empty?: boolean;
  message?: string;
  display_name: string;
  total_sessions: number;
  letters_mastered: number;
  letter_stats: Record<string, LetterStat>;
  ai_insights: {
    overall_message: string;
    encouragement: string;
    strengths: string[];
    focus_areas: string[];
    letter_insights: Record<string, string>;
  };
  provider: string;
}

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5050";

export const FALLBACK_LEVEL_CONFIG: LevelConfig = {
  user_id: "offline",
  target_alphabet: "म",
  cognitive_state: "insufficient_data",
  distractor_similarity: "low",
  visual_aid_intensity: "static",
  input_mode: "tap",
  scaffold_intensity: 0.55,
  distractor_pool: ["ल", "ह", "स", "भ"],
  feature_to_highlight: "",
  phonological_note: "",
  hesitation_trigger_stage1_ms: 14000,
  hesitation_trigger_stage2_ms: 19000,
  reasoning: "Fallback config - server unreachable.",
  provider_used: "fallback",
};

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function analyzeSession(
  payload: SessionPayload,
): Promise<AnalyzeSessionResponse> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/analyze_session`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      console.warn(`[API] /analyze_session returned ${response.status}`);
      return makeFallbackResponse(payload);
    }

    return (await response.json()) as AnalyzeSessionResponse;
  } catch (error) {
    console.warn("[API] /analyze_session failed, using fallback:", error);
    return makeFallbackResponse(payload);
  }
}

export async function fetchProgressReport(): Promise<ProgressReport | null> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/progress_report`, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return null;
    return (await response.json()) as ProgressReport;
  } catch (error) {
    console.warn("[API] /progress_report failed:", error);
    return null;
  }
}

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function makeFallbackResponse(payload: SessionPayload): AnalyzeSessionResponse {
  return {
    status: "ok",
    level_config: {
      ...FALLBACK_LEVEL_CONFIG,
      user_id: payload.user_id,
      target_alphabet: payload.target_alphabet,
    },
    letter_mastered: false,
    debug: {
      total_attempts: payload.attempts.length,
      error_rate_pct: 0,
      cognitive_state: "insufficient_data",
    },
  };
}
