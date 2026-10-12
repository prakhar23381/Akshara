import { useEffect, useRef, useState } from "react";
import type { DayEntry } from "../model";
import { GRID, INK, INK2, MUTED } from "./theme";
import { addDays, dayKey, describeDay, mondayOf } from "./days";
import { Readout } from "./DayStrip";
import { HeatLegend, heatColor, heatLevel } from "./heat";
import { NavButton } from "./Calendar";
import { useWidth } from "./useWidth";

const DAY = 86_400_000;
const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DAY);
const LABEL_W = 20;
const TOP = 16;
const GAP = 3;

/**
 * A calendar year at a glance, as on GitHub: a column per week, Monday at the
 * top, each day coloured by the minutes practised. Opens on this year; ‹ › go
 * back to the first year with practice. Cells grow to fill a wide card and
 * stop at 9px, after which the year scrolls sideways inside the card, opened
 * at this week.
 */
export function YearHeatmap({ history, today }: { history: DayEntry[]; today: Date }) {
  const [year, setYear] = useState(today.getFullYear());
  const [active, setActive] = useState<string | null>(null);
  const [ref, width] = useWidth<HTMLDivElement>();
  const scroller = useRef<HTMLDivElement>(null);
  const byDate = new Map(history.map((d) => [d.date, d]));
  const firstYear = history[0] ? Number(history[0].date.slice(0, 4)) : year;
  const todayKey = dayKey(today);

  const jan1 = new Date(year, 0, 1);
  const start = mondayOf(jan1);
  const weeks = Math.ceil((daysBetween(start, new Date(year, 11, 31)) + 1) / 7);
  const cell = Math.max(9, Math.min(16, Math.floor((width - LABEL_W) / weeks) - GAP));
  const pitch = cell + GAP;

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = year === today.getFullYear() ? el.scrollWidth : 0;
  }, [year, today, cell]);

  const days: { key: string; col: number; row: number }[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const d = addDays(start, i);
    if (d.getFullYear() === year) days.push({ key: dayKey(d), col: Math.floor(i / 7), row: i % 7 });
  }
  const elapsed = days.filter((d) => d.key <= todayKey);
  const practised = elapsed.map((d) => byDate.get(d.key)).filter((d): d is DayEntry => !!d && d.sessions > 0);
  const minutes = practised.reduce((m, d) => m + d.minutes, 0);

  const months = Array.from({ length: 12 }, (_, m) => {
    const first = new Date(year, m, 1);
    return { label: first.toLocaleDateString(undefined, { month: "short" }), col: Math.floor(daysBetween(start, first) / 7) };
  });

  return (
    <div ref={ref} className="flex flex-col gap-2">
      <div className="flex items-center justify-center gap-3">
        <NavButton label="Previous year" onClick={() => setYear((y) => y - 1)} disabled={year <= firstYear} glyph="‹" />
        <span className="t-0 font-semibold text-center" style={{ color: INK, minWidth: "4em" }} aria-live="polite">
          {year}
        </span>
        <NavButton label="Next year" onClick={() => setYear((y) => y + 1)} disabled={year >= today.getFullYear()} glyph="›" />
      </div>
      <p className="t--1" style={{ color: INK2 }}>
        <span className="font-semibold" style={{ color: INK }}>
          {practised.length}
        </span>{" "}
        days ·{" "}
        <span className="font-semibold" style={{ color: INK }}>
          {minutes}
        </span>{" "}
        min in {year}
      </p>
      <div ref={scroller} style={{ overflowX: "auto" }}>
        <svg
          width={LABEL_W + weeks * pitch}
          height={TOP + 7 * pitch}
          role="img"
          aria-label={`${year}: practised on ${practised.length} days, ${minutes} minutes`}
          onPointerLeave={() => setActive(null)}
          style={{ display: "block" }}
        >
          {months.map((m) => (
            <text key={m.label} x={LABEL_W + m.col * pitch} y={11} fontSize={11} fill={MUTED}>
              {m.label}
            </text>
          ))}
          {[
            [0, "M"],
            [2, "W"],
            [4, "F"],
          ].map(([row, w]) => (
            <text key={w} x={0} y={TOP + (row as number) * pitch + cell - 1} fontSize={10} fill={MUTED}>
              {w}
            </text>
          ))}
          {days.map(({ key, col, row }) => {
            const entry = byDate.get(key);
            const future = key > todayKey;
            const level = future ? 0 : heatLevel(entry?.minutes ?? 0, entry?.sessions ?? 0);
            return (
              <rect
                key={key}
                x={LABEL_W + col * pitch}
                y={TOP + row * pitch}
                width={cell}
                height={cell}
                rx={2}
                fill={future ? "transparent" : heatColor(level)}
                stroke={key === todayKey ? INK : future ? GRID : active === key ? INK2 : "none"}
                strokeWidth={key === todayKey || active === key ? 1.5 : 1}
                onPointerEnter={() => setActive(key)}
                onPointerDown={() => setActive(key)}
              />
            );
          })}
        </svg>
      </div>
      <Readout text={active ? describeDay(active, byDate.get(active), active > todayKey) : null} />
      <HeatLegend />
    </div>
  );
}
