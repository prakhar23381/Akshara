import type { ReactNode } from "react";
import type { DayEntry, ReportModel } from "../model";
import { Calendar } from "../charts/Calendar";
import { Columns, type Column } from "../charts/Columns";
import { DayStrip } from "../charts/DayStrip";
import { NumbersTable } from "../charts/NumbersTable";
import { Delta } from "../charts/Delta";
import { StackBar } from "../charts/StackBar";
import { YearHeatmap } from "../charts/YearHeatmap";
import { dayKey, dayLabel, mondayOf, parseDay } from "../charts/days";
import { ACCENT, GRID, INK, INK2, MIX } from "../charts/theme";
import type { ActivityType } from "../../../types/session";
import { Card, MoreLink, Muted, PERIOD_WORD, useColumns, type View } from "./shared";

/**
 * Practice (design §3): days, sessions and minutes with their change; the
 * period's heatmap (the same one the summary shows); minutes a day — or a
 * week, for All; and how many sessions were finished or stopped early,
 * with the way on to every session (B4). Deeper than the summary: the step a
 * stopped session stopped at, and days in a row.
 */
export function PracticeView({ model, today, onOpen }: { model: ReportModel; today: Date; onOpen?: (view: View) => void }) {
  const p = model.practice;
  const when = PERIOD_WORD[model.range];
  const all = model.range === "all";
  const columns = all ? weekly(p.history, today) : daily(p.byDay);
  const grid = useColumns("md:grid md:grid-cols-2 md:gap-4 md:items-start");
  const practised = (all ? p.history : p.byDay).filter((d) => d.sessions > 0);

  return (
    <div className={grid}>
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
        <NumbersTable
          caption={`Days practised ${when}`}
          head={["Day", "Sessions", "Minutes"]}
          numeric={[1, 2]}
          rows={practised.map((d) => [dayLabel(d.date), d.sessions, d.minutes])}
        />
      </Card>
      <Card title={all ? "Minutes a week" : "Minutes a day"}>
        {columns.some((c) => c.value > 0) ? (
          <>
            <Columns columns={columns} unit="min" label={all ? "Minutes a week" : "Minutes a day"} />
            <NumbersTable
              caption={all ? "Minutes a week" : "Minutes a day"}
              head={[all ? "Week" : "Day", "Minutes"]}
              numeric={[1]}
              rows={columns.map((c) => [c.label, c.value])}
            />
          </>
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
        {p.stoppedAt.length > 0 && <StoppedAt rows={p.stoppedAt} stopped={p.stopped} />}
        {p.list.length > 0 && (
          <MoreLink onClick={onOpen ? () => onOpen("sessions") : undefined}>
            All {p.list.length} session{p.list.length === 1 ? "" : "s"} {when}
          </MoreLink>
        )}
      </Card>
      <Card title="Days in a row">
        <div className="grid grid-cols-2 gap-3">
          <Stat
            label={
              p.streak.current === 0
                ? "no practice yesterday or today"
                : p.history[p.history.length - 1]?.date === dayKey(today)
                  ? "up to today"
                  : "up to yesterday · none today yet"
            }
            value={`${p.streak.current} day${p.streak.current === 1 ? "" : "s"}`}
            delta={null}
          />
          <Stat label="the longest so far" value={`${p.streak.longest} day${p.streak.longest === 1 ? "" : "s"}`} delta={null} />
        </div>
      </Card>
    </div>
  );
}

/** What a parent calls each step of a session. */
const STEP: Record<ActivityType, string> = {
  intro: "Meeting the letter",
  pronunciation: "Hearing its sound",
  example_words: "Example words",
  matras: "Barakhadi (matras)",
  tracing: "Tracing",
  memory: "Matching game",
  identify: "Listen & tap",
  word_fill: "Finish the word",
  word_spelling: "Spell the word",
};

/** For the sessions stopped early, the step each stopped at — the first it did not finish. */
function StoppedAt({ rows, stopped }: { rows: { step: ActivityType; count: number }[]; stopped: number }) {
  const most = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="flex flex-col gap-2">
      <span className="t-0 font-semibold" style={{ color: INK }}>
        Where {stopped === 1 ? "it" : "they"} stopped
      </span>
      <div className="grid items-center gap-x-3 gap-y-2" style={{ gridTemplateColumns: "max-content minmax(0, 1fr) max-content" }}>
        {rows.map((r) => (
          <div
            key={r.step}
            className="col-span-3 grid grid-cols-subgrid items-center"
            role="group"
            aria-label={`Stopped at ${STEP[r.step]}: ${r.count} time${r.count === 1 ? "" : "s"}`}
          >
            <span className="t--1" style={{ color: INK }} aria-hidden>
              {STEP[r.step]}
            </span>
            <span className="relative block rounded" style={{ height: 10, background: GRID }} aria-hidden>
              <span
                className="absolute left-0 top-0 h-full"
                style={{ width: `${(r.count / most) * 100}%`, minWidth: 4, background: ACCENT, borderRadius: "0 4px 4px 0" }}
              />
            </span>
            <span className="t--1 font-semibold tabular-nums" style={{ color: INK }} aria-hidden>
              {r.count}
            </span>
          </div>
        ))}
      </div>
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
