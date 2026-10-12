import { useState } from "react";
import type { DayEntry } from "../model";
import { ACCENT, GRID, INK2, MUTED } from "./theme";
import { addDays, dayKey, describeDay, mondayOf, parseDay, WEEKDAY_INITIALS } from "./days";
import { Readout } from "./DayStrip";

/**
 * A month so far as a calendar, Monday first: the week strip's squares, a row
 * per week up to this one. Days of the neighbouring months are left blank.
 */
export function Calendar({ byDay, today }: { byDay: DayEntry[]; today: Date }) {
  const [active, setActive] = useState<string | null>(null);
  const first = byDay[0] ? parseDay(byDay[0].date) : new Date(today.getFullYear(), today.getMonth(), 1);
  const month = first.getMonth();
  const start = mondayOf(first);
  const todayKey = dayKey(today);
  // Up to the end of this week: later weeks would only be empty rows.
  const end = addDays(mondayOf(today), 7);
  const cells: (string | null)[] = [];
  for (let d = start; (d.getMonth() === month || d < first) && d < end; d = addDays(d, 1)) {
    cells.push(d.getMonth() === month ? dayKey(d) : null);
  }
  while (cells.length % 7) cells.push(null);
  const practised = byDay.filter((d) => d.sessions > 0).length;

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAY_INITIALS.map((w, i) => (
          <span key={i} className="t--1 text-center" style={{ color: MUTED }}>
            {w}
          </span>
        ))}
      </div>
      <div
        role="img"
        aria-label={`Practised on ${practised} of ${byDay.length} days so far this month`}
        className="grid grid-cols-7 gap-1"
        onPointerLeave={() => setActive(null)}
      >
        {cells.map((key, i) => {
          if (!key) return <span key={i} />;
          const entry = byDay.find((d) => d.date === key);
          const future = key > todayKey;
          const on = (entry?.sessions ?? 0) > 0;
          return (
            <span
              key={key}
              className="flex justify-center"
              onPointerEnter={() => setActive(key)}
              onPointerDown={() => setActive(key)}
            >
              <span
                className="block rounded"
                style={{
                  width: 18,
                  height: 18,
                  background: on ? ACCENT : "transparent",
                  boxShadow: on || future ? "none" : `inset 0 0 0 1px ${GRID}`,
                  outline: active === key ? `2px solid ${INK2}` : "none",
                  outlineOffset: 2,
                }}
              />
            </span>
          );
        })}
      </div>
      <Readout text={active ? describeDay(active, byDay.find((d) => d.date === active), active > todayKey) : null} />
    </div>
  );
}
