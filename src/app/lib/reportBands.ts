import {
  ERROR_THRESHOLD_FAIL,
  ERROR_THRESHOLD_MASTERY,
} from "./adaptiveEngine";

/**
 * Red / amber / green for error rates in the report.
 *
 * The bands are the engine's own decision lines, not chart thresholds: below
 * 10% wrong the engine treats a letter as mastered, above 30% as struggling,
 * and in between it keeps practising. So a colour always means "this is where
 * the app's behaviour changes", which is the most a tool with no validated
 * clinical cut-offs can honestly claim (see the 2026-10-10 Reference Decision
 * that reversed the earlier single-hue rule).
 *
 * Colours are the fixed status palette, never series colours, and every use
 * pairs one with a mark and a word — warning and good sit below 3:1 on a light
 * surface, so colour must never carry the meaning alone.
 */
export type Band = "good" | "warning" | "critical" | "none";

export const GOOD_BELOW_PCT = ERROR_THRESHOLD_MASTERY * 100;
export const CRITICAL_ABOVE_PCT = ERROR_THRESHOLD_FAIL * 100;

export const BAND: Record<Band, { color: string; tint: string; mark: string; label: string }> = {
  good: { color: "#0ca30c", tint: "rgba(12,163,12,0.12)", mark: "●", label: "Secure" },
  warning: { color: "#fab219", tint: "rgba(250,178,25,0.18)", mark: "◐", label: "Developing" },
  critical: { color: "#d03b3b", tint: "rgba(208,59,59,0.12)", mark: "▲", label: "Needs support" },
  none: { color: "#c3c2b7", tint: "transparent", mark: "○", label: "Not started" },
};

/** The band for an error rate in percent, exactly as the engine draws the lines. */
export function errorBand(errorPct: number | null | undefined): Band {
  if (typeof errorPct !== "number" || Number.isNaN(errorPct)) return "none";
  if (errorPct < GOOD_BELOW_PCT) return "good";
  if (errorPct > CRITICAL_ABOVE_PCT) return "critical";
  return "warning";
}

/** Engine state names, as an adult reads them. */
export const STATE_LABEL: Record<string, string> = {
  insufficient_data: "just starting",
  gross_shape_blindness: "learning the shape",
  feature_neglect: "learning the fine detail",
  visual_mastery: "mastered",
};

/** Engine reasoning with its internal state names replaced by readable ones. */
export function readableReasoning(text: string | null | undefined): string {
  if (!text) return "";
  // The engine writes states both as identifiers (feature_neglect) and as
  // Title Case prose (Feature Neglect); both read as jargon to a parent.
  return text
    .replace(
      /\b(insufficient[_ ]data|gross[_ ]shape[_ ]blindness|feature[_ ]neglect|visual[_ ]mastery)\b/gi,
      (m) => `“${STATE_LABEL[m.toLowerCase().replace(/ /g, "_")] ?? m}”`,
    )
    // The planner names its sources the way the code does.
    .replace("(database+device)", "(from the account and this device)")
    .replace("(device)", "(on this device)");
}
