import { useState } from "react";
import type { DayEntry } from "../model";
import { GRID, INK, INK2, MUTED } from "./theme";
import { addDays, dayKey, describeDay, mondayOf, parseDay, WEEKDAY_INITIALS } from "./days";
import { HeatLegend, heatColor, heatLevel } from "./heat";

/**
 * A week, Monday first, each day coloured by the minutes practised — the same
 * key as the month calendar and the year heatmap. A day still to come is an
 * outline. Hover or touch a day for its sessions and minutes.
 */
export function DayStrip({ byDay, today }: { byDay: DayEntry[]; today: Date }) {
  const [active, setActive] = useState<string | null>(null);
  const monday = byDay[0] ? mondayOf(parseDay(byDay[0].date)) : mondayOf(today);
  const todayKey = dayKey(today);
  const days = Array.from({ length: 7 }, (_, i) => dayKey(addDays(monday, i)));
  const practised = byDay.filter((d) => d.sessions > 0).length;

  return (
    <div>
      <div
        role="img"
        aria-label={`Practised on ${practised} of ${byDay.length} days so far this week`}
        className="grid grid-cols-7 gap-1"
        onPointerLeave={() => setActive(null)}
      >
        {days.map((key, i) => {
          const entry = byDay.find((d) => d.date === key);
          const future = key > todayKey;
          const level = heatLevel(entry?.minutes ?? 0, entry?.sessions ?? 0);
          return (
            <div
              key={key}
              className="flex flex-col items-center gap-1"
              onPointerEnter={() => setActive(key)}
              onPointerDown={() => setActive(key)}
            >
              <span className="t--1" style={{ color: key === todayKey ? INK : MUTED }}>
                {WEEKDAY_INITIALS[i]}
              </span>
              <span
                className="block rounded-md w-full"
                style={{
                  maxWidth: 40,
                  aspectRatio: "1",
                  background: future ? "transparent" : heatColor(level),
                  boxShadow:
                    key === todayKey
                      ? `inset 0 0 0 2px ${INK}`
                      : future
                        ? `inset 0 0 0 1px ${GRID}`
                        : "none",
                  outline: active === key ? `2px solid ${INK2}` : "none",
                  outlineOffset: 2,
                }}
              />
            </div>
          );
        })}
      </div>
      <Readout text={active ? describeDay(active, byDay.find((d) => d.date === active), active > todayKey) : null} />
      <HeatLegend />
    </div>
  );
}

/** The one line that shows what is under the pointer; it keeps its height when empty. */
export function Readout({ text }: { text: string | null }) {
  return (
    <div className="t--1 h-5 mt-1 tabular-nums" style={{ color: INK }} aria-live="polite">
      {text ?? " "}
    </div>
  );
}
