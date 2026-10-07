import type {
  AnalyzeSessionResponse,
  CognitiveState,
  LevelConfig,
  SessionPayload,
} from "../types/levelConfig";
import { LETTER_SEQUENCE } from "../types/levelConfig";
import { supabase } from "../lib/supabase";
import { queueOfflineSession, syncOfflineSessions } from "../lib/offline_sync";
import { analyzeLocally } from "../lib/adaptiveEngine";
import { loadAllSessions } from "../lib/sessionStore";
import {
  buildStepOrder,
  sessionAttempts,
  sessionDurationMs,
  type ActivityType,
} from "../types/session";


export interface ModuleBreakdown {
  attempts: number;
  errors: number;
  error_pct: number | null;
}

export interface LetterStat {
  sessions_count: number;
  mastered: boolean;
  last_cognitive_state: string;
  avg_error_rate_pct: number | null;
  trend: "improving" | "stable" | "needs attention";
  confused_with: string[];

  // ── Clinical detail ──────────────────────────────────────────────────────
  /** How many questions were answered for this letter in total. */
  total_attempts: number;
  /** Correct and unaided — evidence of independent recognition. */
  true_wins: number;
  /** Correct only because the hesitation ladder supplied the answer. */
  guided_wins: number;
  /** Share of attempts the system had to rescue, 0–100. */
  rescue_pct: number | null;
  /** Errors against visually distinct letters — gross shape recognition. */
  gross_shape: ModuleBreakdown;
  /** Errors against confusable letters — fine feature discrimination. */
  feature_level: ModuleBreakdown;
  /** Median unaided response time, in ms. */
  latency_median_ms: number | null;
  /** "target→selected" → number of times it occurred. */
  confusion_counts: Record<string, number>;
  /** Per-session error rate, oldest first — the actual trend line. */
  error_series: number[];
  first_practised: string | null;
  last_practised: string | null;
}

/** One row of the Sessions view: what happened in a single sitting. */
export interface SessionSummary {
  session_id: string;
  letter: string;
  session_number: number;
  started_at: string;
  duration_ms: number;
  status: "in_progress" | "completed" | "abandoned";
  activities_done: number;
  activities_total: number;
  /** Which activities were completed, for the expanded detail. */
  completed: ActivityType[];
  attempts: number;
  true_wins: number;
  guided_wins: number;
  accuracy_pct: number | null;
  rescue_pct: number | null;
  latency_median_ms: number | null;
  cognitive_state: string | null;
  tracing_score: number | null;
  memory_moves: number | null;
  confusions: Record<string, number>;
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

  // ── Report-level context a specialist needs to read the numbers ──────────
  /** Per-session rows, newest first. Empty for data written before v2. */
  sessions?: SessionSummary[];
  generated_at?: string;
  /** Range of dates the sessions were recorded over. */
  assessment_window?: { first: string | null; last: string | null };
  totals?: {
    attempts: number;
    true_wins: number;
    guided_wins: number;
    rescue_pct: number | null;
    latency_median_ms: number | null;
    gross_shape: ModuleBreakdown;
    feature_level: ModuleBreakdown;
  };
}

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5050";

/**
 * Whether it is worth attempting a backend call at all.
 *
 * With no VITE_API_URL configured the base URL points at a local dev server.
 * On a deployed origin that host cannot exist, and probing it costs a request
 * that may stall rather than refuse — an 8s pause before every level. Skipping
 * straight to the on-device engine keeps the adaptive loop instant.
 */
const isLocalHost =
  typeof window !== "undefined" &&
  /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);

const backendReachable =
  Boolean(import.meta.env.VITE_API_URL) || isLocalHost;

// Trigger sync on module load, but only when a backend exists to sync to.
if (backendReachable) {
  syncOfflineSessions(BASE_URL).catch((err) =>
    console.error("[OfflineSync] Init sync failed:", err)
  );
}

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

/**
 * The child's most recent diagnosed state, on any letter.
 *
 * Deliberately not filtered by letter: the point is to recognise a child who
 * has a profile already, whichever letter earned it. Sessions that produced
 * `insufficient_data` are skipped because they carry no information — they are
 * the initialisation calls themselves.
 */
function readPriorCognitiveState(): CognitiveState | null {
  try {
    const dated = loadAllSessions()
      .filter((s) => s.cognitive_state && s.cognitive_state !== "insufficient_data")
      .sort((a, b) => (a.started_at < b.started_at ? 1 : -1));
    return (dated[0]?.cognitive_state as CognitiveState) ?? null;
  } catch {
    return null;
  }
}

export async function analyzeSession(
  payload: SessionPayload,
): Promise<AnalyzeSessionResponse> {
  // Attached here rather than at each call site, so the two callers cannot
  // disagree and the server never has to look it up for itself.
  const enriched: SessionPayload = {
    ...payload,
    prior_cognitive_state:
      payload.prior_cognitive_state ?? readPriorCognitiveState(),
  };

  if (!backendReachable) {
    return makeFallbackResponse(enriched);
  }

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/analyze_session`, {
      method: "POST",
      headers,
      body: JSON.stringify(enriched),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      console.warn(`[API] /analyze_session returned ${response.status}`);
      queueOfflineSession(enriched);
      return makeFallbackResponse(enriched);
    }

    return (await response.json()) as AnalyzeSessionResponse;
  } catch (error) {
    console.warn("[API] /analyze_session failed, using fallback:", error);
    queueOfflineSession(enriched);
    return makeFallbackResponse(enriched);
  }
}

/**
 * Builds the progress report from locally recorded sessions.
 *
 * Every figure is derived from stored attempts. Nothing is estimated and
 * nothing is invented — a parent or specialist must be able to trace each
 * statement back to a session the child actually completed.
 */
export function buildProgressReport(): ProgressReport {
  const read = <T,>(key: string, fallback: T): T => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  };

  const progress = read<any[]>("akshara_db_letter_progress", []);
  const sessions = read<any[]>("akshara_db_learning_sessions", []);
  const profiles = read<any[]>("akshara_db_user_profiles", []);
  const displayName = profiles[0]?.display_name ?? "Guest Explorer";

  const totalSessions = sessions.length;
  const lettersMastered = progress.filter((p: any) => p.mastered).length;

  const emptyBreakdown = (): ModuleBreakdown => ({
    attempts: 0,
    errors: 0,
    error_pct: null,
  });

  const pct = (errors: number, attempts: number) =>
    attempts > 0 ? Math.round((errors / attempts) * 1000) / 10 : null;

  const letterStats: Record<string, LetterStat> = {};

  LETTER_SEQUENCE.forEach((letter) => {
    // Oldest first, so the error series reads left-to-right in time.
    const letterSessions = sessions
      .filter((s: any) => s.letter === letter)
      .sort(
        (a: any, b: any) =>
          new Date(a.created_at ?? 0).getTime() -
          new Date(b.created_at ?? 0).getTime(),
      );
    const letterProg = progress.find((p: any) => p.letter === letter);

    if (letterSessions.length === 0 && !letterProg) return;

    const errorSeries = letterSessions
      .map((s: any) => s.error_rate_pct)
      .filter((v: any): v is number => typeof v === "number");

    const avgError =
      errorSeries.length > 0
        ? Math.round(
            (errorSeries.reduce((a: number, b: number) => a + b, 0) /
              errorSeries.length) *
              10,
          ) / 10
        : null;

    // Aggregate the per-session metrics blob. Sessions recorded before metrics
    // were captured simply contribute nothing rather than skewing the totals.
    let totalAttempts = 0;
    let trueWins = 0;
    let guidedWins = 0;
    const gross = { attempts: 0, errors: 0 };
    const feature = { attempts: 0, errors: 0 };
    const latencyMedians: number[] = [];
    const confusionCounts: Record<string, number> = {};

    letterSessions.forEach((s: any) => {
      const m = s.confused_pairs?.metrics;
      if (m) {
        totalAttempts += m.total_attempts ?? 0;
        trueWins += m.true_wins ?? 0;
        guidedWins += m.guided_wins ?? 0;
        gross.attempts += m.gross_shape?.attempts ?? 0;
        gross.errors += m.gross_shape?.errors ?? 0;
        feature.attempts += m.feature_level?.attempts ?? 0;
        feature.errors += m.feature_level?.errors ?? 0;
        if (typeof m.latency_median_ms === "number") {
          latencyMedians.push(m.latency_median_ms);
        }
        Object.entries(m.confusion_counts ?? {}).forEach(([k, v]) => {
          confusionCounts[k] = (confusionCounts[k] ?? 0) + (v as number);
        });
      } else {
        // Legacy row: only the raw pair list is available.
        (s.confused_pairs?.confused_pairs ?? []).forEach(
          ([target, selected]: [string, string]) => {
            if (target && selected && target !== selected) {
              const key = `${target}→${selected}`;
              confusionCounts[key] = (confusionCounts[key] ?? 0) + 1;
            }
          },
        );
      }
    });

    // Trend compares the earlier half of the sessions against the later half.
    // Two sessions is enough to show a direction; requiring four meant an
    // obvious 50% → 30% → 10% improvement was still reported as "stable".
    let trend: LetterStat["trend"] = "stable";
    if (errorSeries.length >= 2) {
      const mid = Math.floor(errorSeries.length / 2);
      const earlier = errorSeries.slice(0, mid || 1);
      const later = errorSeries.slice(mid || 1);
      const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
      const delta = mean(later) - mean(earlier);
      if (delta < -5) trend = "improving";
      else if (delta > 5) trend = "needs attention";
    }

    const confusedWith = Object.entries(confusionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([pair]) => pair.split("→")[1])
      .filter((l, i, arr) => l && arr.indexOf(l) === i);

    letterStats[letter] = {
      sessions_count: letterSessions.length || letterProg?.sessions_count || 0,
      mastered: letterProg?.mastered ?? false,
      last_cognitive_state:
        letterProg?.last_cognitive_state ??
        letterSessions[letterSessions.length - 1]?.cognitive_state ??
        "insufficient_data",
      avg_error_rate_pct: avgError,
      trend,
      confused_with: confusedWith,
      total_attempts: totalAttempts,
      true_wins: trueWins,
      guided_wins: guidedWins,
      rescue_pct: pct(guidedWins, totalAttempts),
      gross_shape: gross.attempts
        ? {
            attempts: gross.attempts,
            errors: gross.errors,
            error_pct: pct(gross.errors, gross.attempts),
          }
        : emptyBreakdown(),
      feature_level: feature.attempts
        ? {
            attempts: feature.attempts,
            errors: feature.errors,
            error_pct: pct(feature.errors, feature.attempts),
          }
        : emptyBreakdown(),
      latency_median_ms:
        latencyMedians.length > 0
          ? Math.round(
              latencyMedians.reduce((a, b) => a + b, 0) / latencyMedians.length,
            )
          : null,
      confusion_counts: confusionCounts,
      error_series: errorSeries,
      first_practised: letterSessions[0]?.created_at ?? null,
      last_practised:
        letterSessions[letterSessions.length - 1]?.created_at ?? null,
    };
  });

  // ── Per-session rows ──────────────────────────────────────────────────────
  // Sessions carry what a single sitting actually contained: which activities
  // were finished, how long it took, and whether the child saw it through.
  // Aggregates alone cannot answer "what happened on Tuesday".
  const sessionRows: SessionSummary[] = loadAllSessions().map((sess) => {
    const attempts = sessionAttempts(sess);
    const unaided = attempts.filter(
      (a) => a.target_letter === a.selected_letter && !a.was_guided_win,
    ).length;
    const guided = attempts.filter((a) => a.was_guided_win).length;
    const order = buildStepOrder(sess.level_config);
    const completed = sess.activities
      .filter((a) => a.completed_at)
      .map((a) => a.type);
    const tracing = sess.activities.find((a) => a.outcome?.kind === "tracing");
    const memory = sess.activities.find((a) => a.outcome?.kind === "memory");

    const confusions: Record<string, number> = {};
    attempts
      .filter((a) => a.target_letter !== a.selected_letter)
      .forEach((a) => {
        const key = `${a.target_letter}→${a.selected_letter}`;
        confusions[key] = (confusions[key] ?? 0) + 1;
      });

    return {
      session_id: sess.session_id,
      letter: sess.letter,
      session_number: sess.session_number,
      started_at: sess.started_at,
      duration_ms: sessionDurationMs(sess),
      status: sess.status,
      activities_done: completed.length,
      activities_total: order.length,
      completed,
      attempts: attempts.length,
      true_wins: unaided,
      guided_wins: guided,
      accuracy_pct:
        attempts.length > 0
          ? Math.round((unaided / attempts.length) * 1000) / 10
          : null,
      rescue_pct:
        attempts.length > 0
          ? Math.round((guided / attempts.length) * 1000) / 10
          : null,
      latency_median_ms: sess.metrics?.latency_median_ms ?? null,
      cognitive_state: sess.cognitive_state,
      tracing_score:
        tracing?.outcome?.kind === "tracing" ? tracing.outcome.score : null,
      memory_moves:
        memory?.outcome?.kind === "memory" ? memory.outcome.moves : null,
      confusions,
    };
  });

  const empty = Object.keys(letterStats).length === 0;
  const practised = Object.entries(letterStats);

  // ── Report-level totals ───────────────────────────────────────────────────
  const sum = (fn: (s: LetterStat) => number) =>
    practised.reduce((acc, [, s]) => acc + fn(s), 0);

  const totalAttempts = sum((s) => s.total_attempts);
  const totalGuided = sum((s) => s.guided_wins);
  const grossTotals = {
    attempts: sum((s) => s.gross_shape.attempts),
    errors: sum((s) => s.gross_shape.errors),
  };
  const featureTotals = {
    attempts: sum((s) => s.feature_level.attempts),
    errors: sum((s) => s.feature_level.errors),
  };
  const allMedians = practised
    .map(([, s]) => s.latency_median_ms)
    .filter((v): v is number => typeof v === "number");

  const allDates = sessions
    .map((s: any) => s.created_at)
    .filter(Boolean)
    .sort();

  // ── Narrative, strictly derived from the figures above ───────────────────
  const masteredLetters = practised.filter(([, s]) => s.mastered).map(([l]) => l);
  const accurate = practised
    .filter(([, s]) => (s.avg_error_rate_pct ?? 100) <= 15)
    .map(([l]) => l);
  const struggling = practised
    .filter(([, s]) => (s.avg_error_rate_pct ?? 0) > 30)
    .sort(
      (a, b) => (b[1].avg_error_rate_pct ?? 0) - (a[1].avg_error_rate_pct ?? 0),
    );
  const topConfusions = Object.entries(
    practised.reduce<Record<string, number>>((acc, [, s]) => {
      Object.entries(s.confusion_counts).forEach(([k, v]) => {
        acc[k] = (acc[k] ?? 0) + v;
      });
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  const medianLatency =
    allMedians.length > 0
      ? Math.round(allMedians.reduce((a, b) => a + b, 0) / allMedians.length)
      : null;

  const strengths: string[] = [];
  if (masteredLetters.length > 0) {
    strengths.push(`Mastered ${masteredLetters.join(", ")}`);
  }
  // A measured drop in error rate is the most useful encouraging statement
  // available, because it is specific and checkable against the session list.
  practised
    .filter(
      ([, st]) =>
        st.error_series.length >= 2 &&
        st.error_series[0] - st.error_series[st.error_series.length - 1] > 5,
    )
    .sort(
      (a, b) =>
        b[1].error_series[0] -
        b[1].error_series[b[1].error_series.length - 1] -
        (a[1].error_series[0] - a[1].error_series[a[1].error_series.length - 1]),
    )
    .slice(0, 2)
    .forEach(([l, st]) => {
      strengths.push(
        `${l}: mistakes fell from ${Math.round(st.error_series[0])}% to ${Math.round(
          st.error_series[st.error_series.length - 1],
        )}% across ${st.error_series.length} sessions`,
      );
    });
  if (accurate.length > 0) {
    strengths.push(
      `Accurate identification of ${accurate.slice(0, 4).join(", ")}`,
    );
  }
  if (grossTotals.attempts > 0 && pct(grossTotals.errors, grossTotals.attempts)! <= 15) {
    strengths.push("Reliably tells target letters from visually distinct ones");
  }
  if (medianLatency !== null && medianLatency < 6000) {
    strengths.push(
      `Responds without hesitation — ${(medianLatency / 1000).toFixed(1)}s median`,
    );
  }
  if (totalSessions >= 2) {
    strengths.push(
      `Completed ${totalSessions} sessions across ${practised.length} letter(s)`,
    );
  }
  if (strengths.length === 0) {
    strengths.push("Too few sessions so far to identify a reliable strength");
  }

  const focusAreas: string[] = [];
  struggling.slice(0, 2).forEach(([l, s]) => {
    focusAreas.push(
      `${l}: ${Math.round(s.avg_error_rate_pct ?? 0)}% of answers incorrect across ${s.sessions_count} session(s)`,
    );
  });
  if (topConfusions.length > 0) {
    focusAreas.push(
      `Most frequent confusion: ${topConfusions
        .slice(0, 3)
        .map(([pair, n]) => `${pair} (${n}×)`)
        .join(", ")}`,
    );
  }
  if (totalAttempts > 0 && pct(totalGuided, totalAttempts)! >= 20) {
    focusAreas.push(
      `Needed the answer supplied on ${pct(totalGuided, totalAttempts)}% of questions — consider shorter sessions`,
    );
  }
  if (
    featureTotals.attempts > 0 &&
    grossTotals.attempts > 0 &&
    pct(featureTotals.errors, featureTotals.attempts)! -
      pct(grossTotals.errors, grossTotals.attempts)! >
      20
  ) {
    focusAreas.push(
      "Errors cluster on look-alike letters rather than distinct ones — fine detail, not overall shape",
    );
  }
  if (focusAreas.length === 0) {
    focusAreas.push(
      empty
        ? "Complete a session to generate focus areas"
        : "No letter is currently above the 30% error threshold",
    );
  }

  const letterInsights: Record<string, string> = {};
  practised.forEach(([letter, s]) => {
    const parts: string[] = [];
    if (s.total_attempts > 0) {
      parts.push(
        `${s.true_wins}/${s.total_attempts} correct unaided`,
      );
    }
    if (s.latency_median_ms !== null) {
      parts.push(`${(s.latency_median_ms / 1000).toFixed(1)}s median`);
    }
    const top = Object.entries(s.confusion_counts).sort((a, b) => b[1] - a[1])[0];
    if (top) parts.push(`most often read as ${top[0].split("→")[1]}`);
    letterInsights[letter] =
      parts.length > 0
        ? parts.join(" · ")
        : `${s.sessions_count} session(s) recorded`;
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
        ? "No practice sessions recorded yet. Complete a letter to generate a report."
        : `${displayName} practised ${practised.length} letter(s) across ${totalSessions} session(s) ` +
          `and ${totalAttempts} question(s), mastering ${lettersMastered}. ` +
          (struggling.length > 0
            ? `Difficulty is currently highest on ${struggling[0][0]}.`
            : "No letter is currently above the 30% error threshold."),
      encouragement: empty
        ? "Let's trace your first letter!"
        : masteredLetters.length > 0
          ? `You have mastered ${masteredLetters.length} letter(s) — keep going!`
          : "You are making progress — keep practising!",
      strengths,
      focus_areas: focusAreas,
      letter_insights: letterInsights,
    },
    provider: "on-device",
    sessions: sessionRows,
    generated_at: new Date().toISOString(),
    assessment_window: {
      first: allDates[0] ?? null,
      last: allDates[allDates.length - 1] ?? null,
    },
    totals: {
      attempts: totalAttempts,
      true_wins: sum((s) => s.true_wins),
      guided_wins: totalGuided,
      rescue_pct: pct(totalGuided, totalAttempts),
      latency_median_ms: medianLatency,
      gross_shape: {
        attempts: grossTotals.attempts,
        errors: grossTotals.errors,
        error_pct: pct(grossTotals.errors, grossTotals.attempts),
      },
      feature_level: {
        attempts: featureTotals.attempts,
        errors: featureTotals.errors,
        error_pct: pct(featureTotals.errors, featureTotals.attempts),
      },
    },
  };
}


/**
 * Builds the progress report.
 *
 * Always computed on-device, deliberately. The report is a clinical artifact,
 * so it has to be reproducible: the same sessions must always produce the same
 * figures and the same wording. An LLM summary varies between runs and can
 * assert more than the data supports, which is the opposite of what a
 * specialist reading it needs.
 *
 * It is also the only path that computes the question-level metrics — rescue
 * rate, the gross-shape versus feature-level split, latency spread. The
 * server's /progress_report predates those, so calling it would hand the UI a
 * report with most fields empty.
 *
 * The LLM still earns its place elsewhere: choosing distractors from a child's
 * own confusion history, in /analyze_session, where variety is a feature.
 */
export async function fetchProgressReport(): Promise<ProgressReport | null> {
  return buildProgressReport();
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

const LAST_POOL_KEY = "akshara_last_distractor_pool";

function readLastPool(letter: string): string[] {
  try {
    const raw = localStorage.getItem(LAST_POOL_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
    return map[letter] ?? [];
  } catch {
    return [];
  }
}

function writeLastPool(letter: string, pool: string[]): void {
  try {
    const raw = localStorage.getItem(LAST_POOL_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
    map[letter] = pool;
    localStorage.setItem(LAST_POOL_KEY, JSON.stringify(map));
  } catch {
    // storage unavailable (private mode) — rotation just resets next session
  }
}

/**
 * Backend unreachable: run the same diagnosis + level rules on-device so the
 * adaptive loop keeps working. Only Gemini's distractor personalisation and
 * teacher-facing prose are lost; the cognitive-state machine is identical.
 */
function makeFallbackResponse(payload: SessionPayload): AnalyzeSessionResponse {
  const { levelConfig, letterMastered, errorRatePct, state } = analyzeLocally(
    payload,
    readLastPool(payload.target_alphabet),
  );
  writeLastPool(payload.target_alphabet, levelConfig.distractor_pool);

  return {
    status: "ok",
    level_config: levelConfig,
    letter_mastered: letterMastered,
    debug: {
      total_attempts: payload.attempts.length,
      error_rate_pct: errorRatePct,
      cognitive_state: state,
    },
  };
}
