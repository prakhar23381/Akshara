import { useState } from "react";
import type { DayEntry } from "../model";
import { ACCENT, AXIS, MUTED, SURFACE } from "./theme";
import { dayKey, mondayOf, parseDay } from "./days";
import { Readout } from "./DayStrip";
import { useWidth } from "./useWidth";

/** Past half a year, weekly columns get too thin to read; months take over. */
const MAX_WEEKS = 26;

/** A column standing on `base`: rounded at the top (4px, less if it is narrow), square at the baseline. */
function columnPath(x: number, base: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h);
  return `M${x},${base} v${-(h - r)} q0,${-r} ${r},${-r} h${w - 2 * r} q${r},0 ${r},${r} v${h - r} z`;
}

/**
 * Everything so far: a column per week for the days practised in it (0–7), or
 * per month for a long history. Columns at most 24px wide, rounded at the
 * data end, square at the baseline, with a 2px surface gap between them.
 */
export function WeekColumns({ byDay }: { byDay: DayEntry[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const weekly = new Map<string, number>();
  byDay.forEach((d) => {
    const key = dayKey(mondayOf(parseDay(d.date)));
    weekly.set(key, (weekly.get(key) ?? 0) + (d.sessions > 0 ? 1 : 0));
  });
  const byMonth = weekly.size > MAX_WEEKS;
  const buckets = byMonth
    ? [...byDay.reduce((m, d) => m.set(d.date.slice(0, 7), (m.get(d.date.slice(0, 7)) ?? 0) + (d.sessions > 0 ? 1 : 0)), new Map<string, number>())]
    : [...weekly];
  const max = byMonth ? 31 : 7;

  const H = 56;
  const n = Math.max(1, buckets.length);
  const slot = width / n;
  const bar = Math.max(2, Math.min(24, slot - 2));
  const label = (key: string) =>
    byMonth
      ? parseDay(`${key}-01`).toLocaleDateString(undefined, { month: "short", year: "2-digit" })
      : parseDay(key).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  const describe = (i: number) => {
    const [key, days] = buckets[i];
    return `${byMonth ? label(key) : `Week of ${label(key)}`} · practised ${days} day${days === 1 ? "" : "s"}`;
  };
  const total = byDay.filter((d) => d.sessions > 0).length;

  return (
    <div ref={ref}>
      <svg
        width={width}
        height={H}
        role="img"
        aria-label={`Practised on ${total} days in all, shown ${byMonth ? "by month" : "by week"}`}
        onPointerLeave={() => setActive(null)}
        style={{ display: "block" }}
      >
        {buckets.map(([key, days], i) => {
          const h = days === 0 ? 0 : Math.max(4, (days / max) * (H - 2));
          const x = i * slot + (slot - bar) / 2;
          return (
            <g key={key} onPointerEnter={() => setActive(i)} onPointerDown={() => setActive(i)}>
              {/* The hit area is the whole slot, not just the painted column. */}
              <rect x={i * slot} y={0} width={slot} height={H} fill={SURFACE} fillOpacity={0} />
              {h > 0 && (
                <path
                  d={columnPath(x, H - 1, bar, h)}
                  fill={ACCENT}
                  opacity={active === null || active === i ? 1 : 0.55}
                />
              )}
            </g>
          );
        })}
        <line x1={0} x2={width} y1={H - 0.5} y2={H - 0.5} stroke={AXIS} strokeWidth={1} />
      </svg>
      {buckets.length > 0 && (
        <div className="t--1 flex justify-between mt-1" style={{ color: MUTED }}>
          <span>{label(buckets[0][0])}</span>
          {buckets.length > 1 && <span>{label(buckets[buckets.length - 1][0])}</span>}
        </div>
      )}
      <Readout text={active !== null && buckets[active] ? describe(active) : null} />
    </div>
  );
}
