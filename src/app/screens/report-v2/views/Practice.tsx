import type { ReactNode } from "react";
import type { DayEntry, ReportModel } from "../model";
import { Calendar } from "../charts/Calendar";
import { Columns, type Column } from "../charts/Columns";
import { DayStrip } from "../charts/DayStrip";
import { Delta } from "../charts/Delta";
import { StackBar } from "../charts/StackBar";
import { YearHeatmap } from "../charts/YearHeatmap";
import { dayKey, mondayOf, parseDay } from "../charts/days";
import { INK, INK2, MIX } from "../charts/theme";
import { Card, Muted, PERIOD_WORD } from "./shared";

/**
 * Practice (design §3): days, sessions and minutes with their change; the
 * period's heatmap (the same one the summary shows); minutes a day — or a
 * week, for All; and how many sessions were finished or stopped early.
 */
export function PracticeView({ model, today }: { model: ReportModel; today: Date }) {
  const p = model.practice;
  const when = PERIOD_WORD[model.range];
  const all = model.range === "all";
  const columns = all ? weekly(p.history, today) : daily(p.byDay);

  return (
    <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4 md:items-start">
      <Card title="At a glance" className="md:col-span-2">
        <div className="grid grid-cols-3 gap-3">
          <Stat
            label="days practised"
            value={all ? `${p.days.value}` : `${p.days.value} of ${p.elapsedDays}`}
            delta={<Delta change={p.days.change} format={(n) => `${n}`} />}
          />
          <Stat label="sessions" value={`${p.sessions.value}`} delta={<Delta change={p.sessions.change} format={(n) => `${n}`} />} />
          <Stat label="minutes" value={`${p.minutes.value}`} delta={<Delta change={p.minutes.change} format={(n) => `${n} min`} />} />
        </div>
      </Card>
      <Card title="Day by day" className={all ? "md:col-span-2" : ""}>
        {model.range === "week" && <DayStrip byDay={p.byDay} today={today} />}
        {model.range === "month" && <Calendar history={p.history} today={today} />}
        {all && <YearHeatmap history={p.history} today={today} />}
      </Card>
      <Card title={all ? "Minutes a week" : "Minutes a day"}>
        {columns.some((c) => c.value > 0) ? (
          <Columns columns={columns} unit="min" label={all ? "Minutes a week" : "Minutes a day"} />
        ) : (
          <Muted>No practice {when} yet.</Muted>
        )}
      </Card>
      <Card title="Finished or stopped early">
        {p.finished + p.stopped + p.inProgress === 0 ? (
          <Muted>No sessions {when} yet.</Muted>
        ) : (
          <StackBar
            label="Sessions"
            segments={[
              { label: "finished", value: p.finished, color: MIX.first },
              { label: "stopped early", value: p.stopped, color: MIX.wrong },
              ...(p.inProgress > 0 ? [{ label: "still open", value: p.inProgress, color: MIX.helped }] : []),
            ]}
          />
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, delta }: { label: string; value: string; delta: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="t-3 font-semibold leading-none" style={{ color: INK }}>
        {value}
      </span>
      <span className="t--1" style={{ color: INK2 }}>
        {label}
      </span>
      {delta}
    </div>
  );
}

const short = (d: Date) => d.toLocaleDateString(undefined, { day: "numeric", month: "short" });

function daily(byDay: DayEntry[]): Column[] {
  return byDay.map((d) => ({
    key: d.date,
    value: d.minutes,
    label: parseDay(d.date).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }),
  }));
}

/** Minutes per week, from the week of the first practice to this one. */
function weekly(history: DayEntry[], today: Date): Column[] {
  if (history.length === 0) return [];
  const sums = new Map<string, number>();
  history.forEach((d) => {
    const k = dayKey(mondayOf(parseDay(d.date)));
    sums.set(k, (sums.get(k) ?? 0) + d.minutes);
  });
  const out: Column[] = [];
  const last = mondayOf(today);
  for (let w = mondayOf(parseDay(history[0].date)); w <= last; w = new Date(w.getFullYear(), w.getMonth(), w.getDate() + 7)) {
    const k = dayKey(w);
    out.push({ key: k, value: sums.get(k) ?? 0, label: `Week of ${short(w)}` });
  }
  return out;
}
