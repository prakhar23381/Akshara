import { useState } from "react";
import { ACCENT, AXIS, MUTED, SURFACE } from "./theme";
import { Readout } from "./DayStrip";
import { useWidth } from "./useWidth";

export interface Column {
  key: string;
  value: number;
  /** For the readout and the axis: "Tue 6 Oct", "Week of 5 Oct". */
  label: string;
}

/** A column standing on `base`: rounded at the top (4px, less if narrow), square at the baseline. */
export function columnPath(x: number, base: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h);
  return `M${x},${base} v${-(h - r)} q0,${-r} ${r},${-r} h${w - 2 * r} q${r},0 ${r},${r} v${h - r} z`;
}

/**
 * One value per day or week, as columns at most 24px wide, rounded at the data
 * end, square at the baseline. The largest column is labelled; the first and
 * last buckets name the axis; hover or touch reads any column.
 */
export function Columns({
  columns,
  unit,
  label,
  height = 72,
}: {
  columns: Column[];
  /** "min" */
  unit: string;
  label: string;
  height?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const n = Math.max(1, columns.length);
  const max = Math.max(1, ...columns.map((c) => c.value));
  const top = 16; // room for the label on the largest column
  const slot = width / n;
  const bar = Math.max(2, Math.min(24, slot - 2));
  const peak = columns.reduce((best, c, i) => (c.value > (columns[best]?.value ?? -1) ? i : best), 0);

  return (
    <div ref={ref}>
      <svg
        width={width}
        height={height + top}
        role="img"
        aria-label={`${label}: most ${columns[peak]?.value ?? 0} ${unit} (${columns[peak]?.label ?? ""})`}
        onPointerLeave={() => setActive(null)}
        style={{ display: "block" }}
      >
        {columns.map((c, i) => {
          const h = c.value === 0 ? 0 : Math.max(3, (c.value / max) * (height - 2));
          const x = i * slot + (slot - bar) / 2;
          return (
            <g key={c.key} onPointerEnter={() => setActive(i)} onPointerDown={() => setActive(i)}>
              <rect x={i * slot} y={0} width={slot} height={height + top} fill={SURFACE} fillOpacity={0} />
              {h > 0 && (
                <path
                  d={columnPath(x, top + height - 1, bar, h)}
                  fill={ACCENT}
                  opacity={active === null || active === i ? 1 : 0.55}
                />
              )}
              {i === peak && c.value > 0 && (
                <text
                  x={Math.min(Math.max(x + bar / 2, 12), width - 12)}
                  y={top + height - 1 - h - 4}
                  textAnchor="middle"
                  fontSize={11}
                  fill={MUTED}
                >
                  {c.value}
                </text>
              )}
            </g>
          );
        })}
        <line x1={0} x2={width} y1={top + height - 0.5} y2={top + height - 0.5} stroke={AXIS} strokeWidth={1} />
      </svg>
      {columns.length > 0 && (
        <div className={`t--1 flex mt-1 ${columns.length === 1 ? "justify-center" : "justify-between"}`} style={{ color: MUTED }}>
          <span>{columns[0].label}</span>
          {columns.length > 1 && <span>{columns[columns.length - 1].label}</span>}
        </div>
      )}
      <Readout text={active !== null && columns[active] ? `${columns[active].label} · ${columns[active].value} ${unit}` : null} />
    </div>
  );
}
