import type { DayEntry } from "../model";

/** "2026-10-06" as a local date — never `new Date(iso)`, which reads it as UTC. */
export const parseDay = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const pad = (n: number) => String(n).padStart(2, "0");
export const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
/** Monday of the date's week. */
export const mondayOf = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));

export const WEEKDAY_INITIALS = ["M", "T", "W", "T", "F", "S", "S"];

export const dayLabel = (key: string) =>
  parseDay(key).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

/** "Tue 6 Oct · 2 sessions · 14 min", or "Tue 6 Oct · no practice". */
export function describeDay(key: string, entry: DayEntry | undefined, future: boolean): string {
  if (future) return `${dayLabel(key)} · still to come`;
  if (!entry || entry.sessions === 0) return `${dayLabel(key)} · no practice`;
  return `${dayLabel(key)} · ${entry.sessions} session${entry.sessions === 1 ? "" : "s"} · ${entry.minutes} min`;
}
