import { useState, type KeyboardEvent, type PointerEvent } from "react";
import { ACCENT, AXIS, GRID, INK, MUTED, SURFACE } from "./theme";
import { Readout } from "./DayStrip";
import { useWidth } from "./useWidth";

export interface TrendPoint {
  key: string;
  /** What the point is, for the axis and the readout: "Tue 6 Oct". */
  label: string;
  value: number | null;
  /** Drawn as a ring rather than a dot: a different kind of point, explained by the view's key. */
  hollow?: boolean;
}

/**
 * A detail view's trend: one series in the accent, 2px, with a dot (8px) on
 * every point — a point is a session or a week, a thing that happened — and
 * a gap where there is no value. Hairlines at the ends of the scale, a dashed
 * `reference` line, the latest value labelled, the first and last points
 * naming the axis. Hover, touch-drag or focus (then ←/→) reads any point.
 */
export function TrendChart({
  points,
  label,
  describe,
  formatAxis,
  min = 0,
  max = 100,
  height = 150,
  reference,
}: {
  points: TrendPoint[];
  /** What the line is, for screen readers. */
  label: string;
  /** The readout for one point: "Tue 6 Oct · 80% right first time · 5 answers". */
  describe: (p: TrendPoint) => string;
  /** A value on the axis and on the latest point: "70%", "4.2s". */
  formatAxis: (v: number) => string;
  min?: number;
  max?: number;
  height?: number;
  reference?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const gutter = 38; // the scale's labels
  const top = 18; // room for the latest point's label
  const right = 8;
  const plotW = Math.max(1, width - gutter - right);
  const n = points.length;
  const x = (i: number) => gutter + (n <= 1 ? plotW / 2 : (i * plotW) / (n - 1));
  const y = (v: number) => top + (1 - (v - min) / (max - min || 1)) * (height - top - 6);

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
    const i = n <= 1 ? 0 : Math.round(((clientX - left - gutter) / plotW) * (n - 1));
    return Math.max(0, Math.min(n - 1, i));
  };
  const onMove = (e: PointerEvent<SVGSVGElement>) => setActive(nearest(e.clientX, e.currentTarget));
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    setActive((a) => Math.max(0, Math.min(n - 1, (a ?? last ?? 0) + (e.key === "ArrowRight" ? 1 : -1))));
  };

  const ticks = [max, ...(reference !== undefined ? [reference] : []), min];
  const summary =
    last !== undefined ? `${label}: latest ${formatAxis(points[last].value!)}, ${valued.length} points` : `${label}: nothing yet`;

  return (
    <div ref={ref} className="w-full">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={summary}
        tabIndex={0}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setActive(null)}
        onFocus={() => setActive(last ?? null)}
        onBlur={() => setActive(null)}
        onKeyDown={onKey}
        style={{ display: "block", touchAction: "pan-y", outline: "none" }}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={gutter}
              x2={width - right}
              y1={y(t)}
              y2={y(t)}
              stroke={t === min ? AXIS : t === reference ? MUTED : GRID}
              strokeWidth={1}
              strokeDasharray={t === reference ? "4 3" : undefined}
            />
            <text x={gutter - 6} y={y(t) + 4} textAnchor="end" fontSize={11} fill={MUTED}>
              {formatAxis(t)}
            </text>
          </g>
        ))}
        {active !== null && (
          <line x1={x(active)} x2={x(active)} y1={top - 4} y2={height} stroke={MUTED} strokeWidth={1} />
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
          ) : null,
        )}
        {valued.map((i) => (
          <circle
            key={points[i].key}
            cx={x(i)}
            cy={y(points[i].value!)}
            r={active === i ? 5 : 4}
            fill={points[i].hollow ? SURFACE : ACCENT}
            stroke={points[i].hollow ? ACCENT : SURFACE}
            strokeWidth={2}
          />
        ))}
        {last !== undefined && (
          <text
            x={Math.min(Math.max(x(last), gutter + 14), width - right - 14)}
            y={y(points[last].value!) - 9}
            textAnchor="middle"
            fontSize={11}
            fontWeight={600}
            fill={INK}
          >
            {formatAxis(points[last].value!)}
          </text>
        )}
      </svg>
      {n > 0 && (
        <div
          className={`t--1 flex mt-1 ${n === 1 ? "justify-center" : "justify-between"}`}
          style={{ color: MUTED, paddingLeft: gutter, paddingRight: right }}
        >
          <span>{points[0].label}</span>
          {n > 1 && <span>{points[n - 1].label}</span>}
        </div>
      )}
      <Readout text={active !== null && points[active] ? describe(points[active]) : null} />
    </div>
  );
}
