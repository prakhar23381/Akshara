import type {
  AnalyzeSessionResponse,
  LevelConfig,
  SessionPayload,
} from "../types/levelConfig";
import { LETTER_SEQUENCE } from "../types/levelConfig";
import { supabase } from "../lib/supabase";
import { queueOfflineSession, syncOfflineSessions } from "../lib/offline_sync";


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

// Trigger sync on module load
syncOfflineSessions(BASE_URL).catch((err) =>
  console.error("[OfflineSync] Init sync failed:", err)
);

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
      queueOfflineSession(payload);
      return makeFallbackResponse(payload);
    }

    return (await response.json()) as AnalyzeSessionResponse;
  } catch (error) {
    console.warn("[API] /analyze_session failed, using fallback:", error);
    queueOfflineSession(payload);
    return makeFallbackResponse(payload);
  }
}

export function generateMockProgressReport(): ProgressReport {
  // Read local progress
  const progressRaw = localStorage.getItem("akshara_db_letter_progress");
  const progress = progressRaw ? JSON.parse(progressRaw) : [];
  
  const sessionsRaw = localStorage.getItem("akshara_db_learning_sessions");
  const sessions = sessionsRaw ? JSON.parse(sessionsRaw) : [];

  const profileRaw = localStorage.getItem("akshara_db_user_profiles");
  const profiles = profileRaw ? JSON.parse(profileRaw) : [];
  const displayName = profiles[0]?.display_name ?? "Guest Explorer";

  const totalSessions = sessions.length;
  const lettersMastered = progress.filter((p: any) => p.mastered).length;

  const letterStats: Record<string, LetterStat> = {};
  
  // Aggregate stats per letter
  LETTER_SEQUENCE.forEach((l) => {
    const letterSessions = sessions.filter((s: any) => s.letter === l);
    const letterProg = progress.find((p: any) => p.letter === l);
    
    if (letterSessions.length > 0 || letterProg) {
      // Calculate avg error rate
      const totalErrors = letterSessions.reduce((sum: number, s: any) => sum + (s.error_rate_pct ?? 0), 0);
      const avgError = letterSessions.length > 0 ? totalErrors / letterSessions.length : 0;
      
      // Calculate confused with pairs
      const confusions: string[] = [];
      letterSessions.forEach((s: any) => {
        const pairs = s.confused_pairs?.confused_pairs || [];
        pairs.forEach(([target, selected]: [string, string]) => {
          if (selected && selected !== target && !confusions.includes(selected)) {
            confusions.push(selected);
          }
        });
      });

      letterStats[l] = {
        sessions_count: letterSessions.length || letterProg?.sessions_count || 1,
        mastered: letterProg?.mastered ?? false,
        last_cognitive_state: letterProg?.last_cognitive_state ?? "insufficient_data",
        avg_error_rate_pct: avgError,
        trend: avgError < 15 ? "improving" : avgError < 35 ? "stable" : "needs attention",
        confused_with: confusions.slice(0, 3),
      };
    }
  });

  const empty = Object.keys(letterStats).length === 0;

  // Curate some nice mock AI insights based on actual progress
  const strengths = ["Outstanding shape validation accuracy", "Responsive tracing completion"];
  const focusAreas = lettersMastered < 3 ? ["Finish tracing the first few roadmap consonants", "Focus on shape detail distinctions"] : ["Continue unlocking upcoming consonants"];
  
  const letterInsights: Record<string, string> = {};
  Object.keys(letterStats).forEach(l => {
    const stat = letterStats[l];
    if (stat.last_cognitive_state === "gross_shape_blindness") {
      letterInsights[l] = `Struggles with tracing boundary curves of "${l}". Encourage slower strokes.`;
    } else if (stat.last_cognitive_state === "feature_neglect") {
      letterInsights[l] = `Confuses details of "${l}" with visually similar letters. Recommend card matching exercises.`;
    } else {
      letterInsights[l] = `High accuracy tracing "${l}"! Great consistency.`;
    }
  });

  return {
    status: "ok",
    empty,
    display_name: displayName,
    total_sessions: totalSessions,
    letters_mastered: lettersMastered,
    letter_stats: letterStats,
    ai_insights: {
      overall_message: empty 
        ? "Get started with the learning roadmap! Complete practice levels to trigger adaptive shape analysis."
        : `Overall performance is strong! Successfully mastered ${lettersMastered} letter(s) over ${totalSessions} practice sessions.`,
      encouragement: empty
        ? "Welcome to your Akshara learning journey! Let's trace your first letter."
        : "Fantastic progress! Keep up the practice to unlock the full alphabet.",
      strengths,
      focus_areas: focusAreas,
      letter_insights: letterInsights,
    },
    provider: "local-sandbox",
  };
}

export async function fetchProgressReport(): Promise<ProgressReport | null> {
  const offlineMode = localStorage.getItem("akshara_offline_mode") === "true";
  if (offlineMode) {
    return generateMockProgressReport();
  }

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/progress_report`, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return generateMockProgressReport();
    return (await response.json()) as ProgressReport;
  } catch (error) {
    console.warn("[API] /progress_report failed, using local fallback:", error);
    return generateMockProgressReport();
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
