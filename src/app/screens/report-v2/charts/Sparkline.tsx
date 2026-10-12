import { useState, type KeyboardEvent, type PointerEvent } from "react";
import type { Point } from "../model";
import { ACCENT, INK, INK2, MUTED, SURFACE } from "./theme";
import { useWidth } from "./useWidth";

/**
 * A small trend: one series in the accent, 2px, no axes. A bucket with no data
 * is a gap, not a line drawn through it. The latest point carries the end dot.
 * Hover, touch-drag or focus (then ←/→) reads any bucket; the same values are
 * in the section's "Show numbers" table, so the readout never gates them.
 * `compact` is the inline version for a row of skills: no readout, no focus —
 * the row opens the skill's detail instead.
 */
export function Sparkline({
  points,
  label,
  formatValue,
  formatBucket,
  min = 0,
  max = 100,
  height = 40,
  compact = false,
}: {
  points: Point[];
  /** What the line is, for screen readers: "Right first time, by day". */
  label: string;
  formatValue: (v: number) => string;
  formatBucket: (start: string) => string;
  min?: number;
  max?: number;
  height?: number;
  compact?: boolean;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const pad = 5; // room for the end dot and its ring
  const n = points.length;
  const x = (i: number) => (n <= 1 ? width / 2 : pad + (i * (width - pad * 2)) / (n - 1));
  const y = (v: number) => pad + (1 - (v - min) / (max - min || 1)) * (height - pad * 2);

  // Runs of consecutive buckets that have a value.
  const runs: number[][] = [];
  points.forEach((p, i) => {
    if (p.value === null) return;
    const run = runs[runs.length - 1];
    if (run && run[run.length - 1] === i - 1) run.push(i);
    else runs.push([i]);
  });
  const valued = points.map((p, i) => (p.value === null ? -1 : i)).filter((i) => i >= 0);
  const last = valued[valued.length - 1];

  const nearest = (clientX: number, el: Element) => {
    const left = el.getBoundingClientRect().left;
    const i = Math.round(((clientX - left - pad) / Math.max(1, width - pad * 2)) * (n - 1));
    return Math.max(0, Math.min(n - 1, i));
  };
  const onMove = (e: PointerEvent<SVGSVGElement>) => setActive(nearest(e.clientX, e.currentTarget));
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    setActive((a) => Math.max(0, Math.min(n - 1, (a ?? last ?? 0) + (e.key === "ArrowRight" ? 1 : -1))));
  };

  const shown = active ?? null;
  const readout =
    shown !== null
      ? `${formatBucket(points[shown].start)} · ${points[shown].value === null ? "no answers" : formatValue(points[shown].value!)}`
      : null;
  const summary =
    last !== undefined
      ? `${label}: latest ${formatValue(points[last].value!)}, ${valued.length} of ${n} with answers`
      : `${label}: no answers yet`;

  return (
    <div ref={ref} className="relative w-full">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={summary}
        {...(compact
          ? {}
          : {
              tabIndex: 0,
              onPointerMove: onMove,
              onPointerDown: onMove,
              onPointerLeave: () => setActive(null),
              onFocus: () => setActive(last ?? null),
              onBlur: () => setActive(null),
              onKeyDown: onKey,
            })}
        style={{ display: "block", touchAction: "pan-y", outline: "none" }}
      >
        {shown !== null && (
          <line x1={x(shown)} x2={x(shown)} y1={0} y2={height} stroke={MUTED} strokeWidth={1} />
        )}
        {runs.map((run) =>
          run.length > 1 ? (
            <polyline
              key={run[0]}
              points={run.map((i) => `${x(i)},${y(points[i].value!)}`).join(" ")}
              fill="none"
              stroke={ACCENT}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : (
            // A lone bucket between gaps still shows.
            <circle key={run[0]} cx={x(run[0])} cy={y(points[run[0]].value!)} r={2.5} fill={ACCENT} />
          ),
        )}
        {[last, shown].map((i, k) =>
          i !== undefined && i !== null && points[i].value !== null ? (
            <circle
              key={k}
              cx={x(i)}
              cy={y(points[i].value!)}
              r={4}
              fill={ACCENT}
              stroke={SURFACE}
              strokeWidth={2}
            />
          ) : null,
        )}
      </svg>
      {!compact && (
        <div className="t--1 h-5 tabular-nums" style={{ color: readout ? INK : INK2 }} aria-live="polite">
          {readout ?? "\u00a0"}
        </div>
      )}
    </div>
  );
}
