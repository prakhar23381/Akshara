import { useState } from "react";
import type { DayEntry } from "../model";
import { GRID, INK, INK2, MUTED } from "./theme";
import { addDays, dayKey, describeDay, mondayOf, WEEKDAY_INITIALS } from "./days";
import { Readout } from "./DayStrip";
import { HeatLegend, heatColor, heatInk, heatLevel } from "./heat";

/**
 * A whole month as a calendar, Monday first, each day coloured by the minutes
 * practised (the heat key below it). Opens on this month; ‹ › go back to the
 * first month with practice and forward to this one. The line above the grid
 * is that month's own: days practised and minutes.
 */
export function Calendar({ history, today }: { history: DayEntry[]; today: Date }) {
  const [shown, setShown] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [active, setActive] = useState<string | null>(null);
  const todayKey = dayKey(today);
  const byDate = new Map(history.map((d) => [d.date, d]));
  const first = history[0] ? new Date(Number(history[0].date.slice(0, 4)), Number(history[0].date.slice(5, 7)) - 1, 1) : shown;
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const canBack = shown > first;
  const canForward = shown < thisMonth;
  const step = (n: number) => {
    setActive(null);
    setShown((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));
  };

  const month = shown.getMonth();
  const cells: (string | null)[] = [];
  for (let d = mondayOf(shown); d.getMonth() === month || d < shown; d = addDays(d, 1)) {
    cells.push(d.getMonth() === month ? dayKey(d) : null);
  }
  while (cells.length % 7) cells.push(null);

  const inMonth = cells.filter((c): c is string => c !== null);
  const elapsed = inMonth.filter((k) => k <= todayKey);
  const practised = elapsed.map((k) => byDate.get(k)).filter((d): d is DayEntry => !!d && d.sessions > 0);
  const minutes = practised.reduce((m, d) => m + d.minutes, 0);
  const title = shown.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-center gap-3">
        <NavButton label="Previous month" onClick={() => step(-1)} disabled={!canBack} glyph="‹" />
        <span className="t-0 font-semibold text-center" style={{ color: INK, minWidth: "8.5em" }} aria-live="polite">
          {title}
        </span>
        <NavButton label="Next month" onClick={() => step(1)} disabled={!canForward} glyph="›" />
      </div>
      <p className="t--1" style={{ color: INK2 }}>
        <span className="font-semibold" style={{ color: INK }}>
          {practised.length}
        </span>{" "}
        of {elapsed.length} days ·{" "}
        <span className="font-semibold" style={{ color: INK }}>
          {minutes}
        </span>{" "}
        min
      </p>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_INITIALS.map((w, i) => (
          <span key={i} className="t--1 text-center" style={{ color: MUTED }}>
            {w}
          </span>
        ))}
      </div>
      <div
        role="img"
        aria-label={`${title}: practised on ${practised.length} of ${elapsed.length} days, ${minutes} minutes`}
        className="grid grid-cols-7 gap-1"
        onPointerLeave={() => setActive(null)}
      >
        {cells.map((key, i) => {
          if (!key) return <span key={i} />;
          const entry = byDate.get(key);
          const future = key > todayKey;
          const level = future ? 0 : heatLevel(entry?.minutes ?? 0, entry?.sessions ?? 0);
          return (
            <span
              key={key}
              className="t--1 grid place-items-center rounded-md tabular-nums"
              style={{
                aspectRatio: "1",
                background: future ? "transparent" : heatColor(level),
                color: future ? MUTED : heatInk(level),
                boxShadow:
                  key === todayKey
                    ? `inset 0 0 0 2px ${INK}`
                    : future
                      ? `inset 0 0 0 1px ${GRID}`
                      : active === key
                        ? `inset 0 0 0 2px ${INK2}`
                        : "none",
              }}
              onPointerEnter={() => setActive(key)}
              onPointerDown={() => setActive(key)}
            >
              {Number(key.slice(8))}
            </span>
          );
        })}
      </div>
      <Readout text={active ? describeDay(active, byDate.get(active), active > todayKey) : null} />
      <HeatLegend />
    </div>
  );
}

export function NavButton({
  label,
  onClick,
  disabled,
  glyph,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  glyph: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="t-1 rounded-full grid place-items-center print:invisible"
      style={{
        width: "var(--tap-min)",
        height: "var(--tap-min)",
        color: disabled ? GRID : INK,
        boxShadow: `inset 0 0 0 1px ${disabled ? GRID : "rgba(11,11,11,0.15)"}`,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {glyph}
    </button>
  );
}
