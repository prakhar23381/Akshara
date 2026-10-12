import { BAD_TEXT, GOOD_TEXT, MUTED } from "./theme";

/**
 * A change against the comparison period: ▲/▼ and the amount, green when the
 * direction is good and red when it is not (lower is better for speed). The
 * arrow carries the direction, so the colour never does alone.
 */
export function Delta({
  change,
  format,
  lowerIsBetter = false,
  decimals = 0,
}: {
  change: number | null;
  /** The size of the change, already absolute and rounded: e.g. (n) => `${n} pts`. */
  format: (abs: number) => string;
  lowerIsBetter?: boolean;
  /** 1 for seconds; percentage points and counts are whole. */
  decimals?: number;
}) {
  if (change === null) return null;
  const k = 10 ** decimals;
  const rounded = Math.round(change * k) / k;
  if (rounded === 0) {
    return (
      <span className="t--1 whitespace-nowrap" style={{ color: MUTED }}>
        no change
      </span>
    );
  }
  const up = rounded > 0;
  const good = up !== lowerIsBetter;
  return (
    <span className="t--1 font-semibold whitespace-nowrap" style={{ color: good ? GOOD_TEXT : BAD_TEXT }}>
      <span aria-hidden>{up ? "▲" : "▼"}</span>
      <span className="sr-only">{up ? "up" : "down"}</span> {format(Math.abs(rounded))}
    </span>
  );
}
