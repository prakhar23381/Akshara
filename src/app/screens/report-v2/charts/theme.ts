import { BAND, type Band } from "../../../lib/reportBands";
import type { LetterStatus } from "../model";

/**
 * The new report's colours (docs/10_REPORT_DESIGN.md §6). Colours are style
 * props, as in the W4a report; Tailwind does layout only.
 *
 * One accent for every single-series chart. Status colours only ever mean
 * status, and always come with a mark and a word.
 */
export const INK = "#0b0b0b";
export const INK2 = "#52514e";
export const MUTED = "#898781";
export const GRID = "#e1e0d9";
export const AXIS = "#c3c2b7";
export const SURFACE = "#ffffff";
export const PAGE = "#F7F6F2";
export const ACCENT = "#2a78d6";
/** A wash of the accent, behind the one line that says what to practise next. */
export const ACCENT_WASH = "#eaf2fc";

/**
 * Right first time · app helped · wrong: three ordinal steps of the accent's
 * ramp. Validated on the white card with the dataviz palette script
 * (`--ordinal --surface #ffffff`, 2026-10-12): monotone, visible gaps, the
 * lightest at 2.11:1.
 */
export const MIX = { first: "#2a78d6", helped: "#5598e7", wrong: "#86b6ef" } as const;

/** A change in a good direction, and in a bad one — always with ▲/▼. */
export const GOOD_TEXT = "#006300";
export const BAD_TEXT = "#d03b3b";

export const STATUS_BAND: Record<LetterStatus, Band> = {
  secure: "good",
  learning: "warning",
  support: "critical",
  not_started: "none",
};

/** What a parent reads for each status (design §3 legend). */
export const STATUS_WORD: Record<LetterStatus, string> = {
  secure: "learned",
  learning: "learning",
  support: "needs support",
  not_started: "not started",
};

export const statusColor = (s: LetterStatus) => BAND[STATUS_BAND[s]].color;

export const FONT_DEVANAGARI = "var(--font-devanagari), var(--font-ui)";
