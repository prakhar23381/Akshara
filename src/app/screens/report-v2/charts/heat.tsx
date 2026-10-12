import { INK2 } from "./theme";

/**
 * Minutes practised in a day, as a heat level — the week strip, the month
 * calendar and the year heatmap all colour a day the same way.
 *
 * Four ordinal steps of the accent's ramp, validated on the white card with
 * the dataviz palette script (`--ordinal --surface #ffffff`, 2026-10-12:
 * monotone, visible gaps, lightest 2.11:1). A day with no practice is a
 * neutral grey, off the ramp, so "none" never reads as "a little".
 */
export const HEAT_NONE = "#edece7";
export const HEAT = ["#86b6ef", "#5598e7", "#256abf", "#104281"] as const;
/** Lower bounds, in minutes, of levels 1–4. */
const FROM = [1, 10, 20, 30];
const RANGES = ["under 10", "10–19", "20–29", "30+"];

/** 0 for no practice, else 1–4. */
export function heatLevel(minutes: number, sessions = 0): number {
  if (sessions === 0 && minutes <= 0) return 0;
  let level = 1;
  FROM.forEach((from, i) => {
    if (minutes >= from) level = i + 1;
  });
  return level;
}

export const heatColor = (level: number) => (level === 0 ? HEAT_NONE : HEAT[level - 1]);
/** Ink for a day number written inside a cell: white on the two dark steps. */
export const heatInk = (level: number) => (level >= 3 ? "#ffffff" : "#0b0b0b");

/** The key, as on a map: a swatch and its range for every level. */
export function HeatLegend({ size = 12 }: { size?: number }) {
  return (
    <div className="t--1 flex flex-wrap items-center gap-x-3 gap-y-1" style={{ color: INK2 }}>
      <span className="inline-flex items-center gap-1">
        <Swatch color={HEAT_NONE} size={size} /> none
      </span>
      {HEAT.map((c, i) => (
        <span key={c} className="inline-flex items-center gap-1">
          <Swatch color={c} size={size} /> {RANGES[i]}
        </span>
      ))}
      <span>min a day</span>
    </div>
  );
}

const Swatch = ({ color, size }: { color: string; size: number }) => (
  <span aria-hidden className="inline-block" style={{ width: size, height: size, background: color, borderRadius: 3 }} />
);
