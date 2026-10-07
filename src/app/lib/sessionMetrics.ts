/**
 * Per-session clinical metrics.
 *
 * The tracker already records everything needed to characterise *how* a child
 * succeeded or failed, but until now only an overall error rate and a mean
 * latency were persisted. That discarded the three things a specialist actually
 * reads:
 *
 *   • rescue rate    — how often the system had to supply the answer, which
 *                      distinguishes "got there slowly" from "could not get there"
 *   • error type     — errors against visually distinct letters (gross shape
 *                      recognition) versus against confusable letters
 *                      (fine feature discrimination); clinically different
 *   • latency spread — median plus range, since automaticity, not just accuracy,
 *                      is central to a dyslexia profile
 *
 * These are stored inside the existing `confused_pairs` JSONB column so no
 * database migration is required and older rows keep loading.
 */
import type { QuestionAttempt } from "../types/levelConfig";

export interface ModuleBreakdown {
  attempts: number;
  errors: number;
  error_pct: number | null;
}

export interface SessionMetrics {
  total_attempts: number;
  /** Correct, unaided — the only kind that evidences independent recognition. */
  true_wins: number;
  /** Correct only because the system answered after the hesitation ladder. */
  guided_wins: number;
  errors: number;
  /** Share of attempts the system had to rescue, 0–100. */
  rescue_pct: number;
  /** Visually distinct distractors — tests gross shape recognition. */
  gross_shape: ModuleBreakdown;
  /** Confusable distractors — tests fine feature discrimination. */
  feature_level: ModuleBreakdown;
  latency_median_ms: number | null;
  latency_min_ms: number | null;
  latency_max_ms: number | null;
  /** "target→selected" → how many times it happened. */
  confusion_counts: Record<string, number>;
}

function breakdown(attempts: QuestionAttempt[]): ModuleBreakdown {
  if (attempts.length === 0) {
    return { attempts: 0, errors: 0, error_pct: null };
  }
  const errors = attempts.filter(
    (a) => a.target_letter !== a.selected_letter,
  ).length;
  return {
    attempts: attempts.length,
    errors,
    error_pct: Math.round((errors / attempts.length) * 1000) / 10,
  };
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

export function computeSessionMetrics(
  attempts: QuestionAttempt[],
): SessionMetrics {
  const guided = attempts.filter((a) => a.was_guided_win);
  const errors = attempts.filter((a) => a.target_letter !== a.selected_letter);
  const trueWins = attempts.filter(
    (a) => a.target_letter === a.selected_letter && !a.was_guided_win,
  );

  // A guided win is recorded with latency 0, so including it would drag the
  // median towards zero and overstate the child's fluency.
  const latencies = attempts
    .filter((a) => !a.was_guided_win && a.time_to_interact_ms > 0)
    .map((a) => a.time_to_interact_ms);

  const confusion_counts: Record<string, number> = {};
  errors.forEach((a) => {
    const key = `${a.target_letter}→${a.selected_letter}`;
    confusion_counts[key] = (confusion_counts[key] ?? 0) + 1;
  });

  return {
    total_attempts: attempts.length,
    true_wins: trueWins.length,
    guided_wins: guided.length,
    errors: errors.length,
    rescue_pct:
      attempts.length > 0
        ? Math.round((guided.length / attempts.length) * 1000) / 10
        : 0,
    gross_shape: breakdown(
      attempts.filter((a) => a.module_type === "dissimilar"),
    ),
    feature_level: breakdown(
      attempts.filter(
        (a) => a.module_type === "similar" || a.module_type === "scaffold",
      ),
    ),
    latency_median_ms: median(latencies),
    latency_min_ms: latencies.length > 0 ? Math.min(...latencies) : null,
    latency_max_ms: latencies.length > 0 ? Math.max(...latencies) : null,
    confusion_counts,
  };
}
