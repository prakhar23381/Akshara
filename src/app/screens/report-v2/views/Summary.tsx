import type { ReactNode } from "react";
import type { Range, ReportModel } from "../model";
import { BarList } from "../charts/BarList";
import { Calendar } from "../charts/Calendar";
import { DayStrip } from "../charts/DayStrip";
import { Delta } from "../charts/Delta";
import { LetterGrid, StatusLegend } from "../charts/LetterGrid";
import { Sparkline } from "../charts/Sparkline";
import { YearHeatmap } from "../charts/YearHeatmap";
import { parseDay } from "../charts/days";
import { ACCENT, ACCENT_WASH, FONT_DEVANAGARI, GRID, INK, INK2 } from "../charts/theme";

/**
 * The summary (design §2): what to practise next, then one card each for
 * Letters, Skills, Practice and Mix-ups. Phone: one column. Tablet and
 * desktop: Letters across the top, the other three in a row — or, for All,
 * Practice across the page for the year's heatmap, Skills and Mix-ups below.
 * Every figure is scoped by the period switch in the header.
 */
export function Summary({ model, today }: { model: ReportModel; today: Date }) {
  const all = model.range === "all";
  return (
    <div className="flex flex-col gap-3 md:grid md:grid-cols-6 md:gap-4">
      <PractiseNext model={model} />
      <LettersCard model={model} />
      {all ? (
        <>
          <PracticeCard model={model} today={today} className="md:col-span-6" />
          <SkillsCard model={model} className="md:col-span-3" />
          <MixupsCard model={model} className="md:col-span-3" />
        </>
      ) : (
        <>
          <SkillsCard model={model} className="md:col-span-2" />
          <PracticeCard model={model} today={today} className="md:col-span-2" />
          <MixupsCard model={model} className="md:col-span-2" />
        </>
      )}
    </div>
  );
}

const PERIOD_WORD: Record<Range, string> = { week: "this week", month: "this month", all: "so far" };
const PREVIOUS_WORD: Record<Range, string> = { week: "same days last week", month: "same days last month", all: "" };
const pct = (v: number) => `${Math.round(v)}%`;

function Card({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-2xl bg-white p-4 flex flex-col gap-3 min-w-0 ${className}`}
      style={{ boxShadow: `inset 0 0 0 1px ${GRID}` }}
    >
      <h2 className="t-1 font-bold leading-tight" style={{ color: INK }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

const Muted = ({ children }: { children: ReactNode }) => (
  <p className="t--1" style={{ color: INK2 }}>
    {children}
  </p>
);

const Glyph = ({ children }: { children: ReactNode }) => (
  <span style={{ fontFamily: FONT_DEVANAGARI }}>{children}</span>
);

function PractiseNext({ model }: { model: ReportModel }) {
  const next = model.practiseNext;
  if (!next) return null;
  const when = PERIOD_WORD[model.range];
  return (
    <section
      className="md:col-span-6 rounded-2xl p-4 t-0"
      style={{ background: ACCENT_WASH, boxShadow: `inset 3px 0 0 0 ${ACCENT}`, color: INK }}
    >
      <span className="font-bold">Practise next: </span>
      {next.kind === "mixup" ? (
        <>
          <Glyph>{next.a}</Glyph> and <Glyph>{next.b}</Glyph> — mixed up {next.count} times {when}
        </>
      ) : (
        <>
          <Glyph>{next.letter}</Glyph> — {pct(next.rightFirstTime)} right first time {when}
        </>
      )}
    </section>
  );
}

function LettersCard({ model }: { model: ReportModel }) {
  const { counts, learned, entries } = model.letters;
  return (
    <Card title="Letters" className="md:col-span-6">
      <StatusLegend
        counts={counts}
        extra={
          learned.change !== null && learned.change !== 0 ? (
            <Delta change={learned.change} format={(n) => `${n} ${PERIOD_WORD[model.range]}`} />
          ) : null
        }
      />
      <div className="md:hidden">
        <LetterGrid entries={entries} variant="strip" />
      </div>
      <div className="hidden md:block">
        <LetterGrid entries={entries} variant="grid" />
      </div>
    </Card>
  );
}

function SkillsCard({ model, className }: { model: ReportModel; className: string }) {
  const { rightFirstTime: r, series, mix } = model.skills;
  const monthly = series.length > 1 && Date.parse(series[1].start) - Date.parse(series[0].start) > 20 * 86_400_000;
  const by = model.range === "week" ? "day" : monthly ? "month" : "week";
  const bucket = (start: string) => {
    const d = parseDay(start);
    if (by === "day") return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
    if (by === "month") return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    return `Week of ${d.toLocaleDateString(undefined, { day: "numeric", month: "short" })}`;
  };
  return (
    <Card title="Skills" className={className}>
      {r.value === null ? (
        <Muted>No answers {PERIOD_WORD[model.range]} yet.</Muted>
      ) : (
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="t-3 font-semibold leading-none" style={{ color: INK }}>
              {pct(r.value)}
            </span>
            <span className="t-0" style={{ color: INK }}>
              right first time
            </span>
            <Delta change={r.change} format={(n) => `${n} pt${n === 1 ? "" : "s"}`} />
          </div>
          <Muted>
            From {mix.total} answer{mix.total === 1 ? "" : "s"}
            {r.previous !== null ? ` · ${pct(r.previous)} the same days before` : ""}
          </Muted>
        </div>
      )}
      {series.some((p) => p.value !== null) && (
        <Sparkline
          points={series}
          label={`Right first time, by ${by}`}
          formatValue={(v) => `${pct(v)} right first time`}
          formatBucket={bucket}
        />
      )}
    </Card>
  );
}

function PracticeCard({ model, today, className }: { model: ReportModel; today: Date; className: string }) {
  const { days, minutes, elapsedDays, byDay, history } = model.practice;
  return (
    <Card title="Practice" className={className}>
      {model.range === "week" && (
        <>
          <p className="t-0" style={{ color: INK }}>
            <span className="font-semibold">{days.value}</span> of {elapsedDays} days ·{" "}
            <span className="font-semibold">{minutes.value}</span> min
          </p>
          <DayStrip byDay={byDay} today={today} />
        </>
      )}
      {model.range === "month" && <Calendar history={history} today={today} />}
      {model.range === "all" && <YearHeatmap history={history} today={today} />}
    </Card>
  );
}

/** Pairs shown on the summary; the Mix-ups section lists them all. */
const TOP_PAIRS = 4;

function MixupsCard({ model, className }: { model: ReportModel; className: string }) {
  const pairs = model.mixups.pairs.slice(0, TOP_PAIRS);
  return (
    <Card title="Mix-ups" className={className}>
      {pairs.length === 0 ? (
        <Muted>No mix-ups {PERIOD_WORD[model.range]}.</Muted>
      ) : (
        <BarList pairs={pairs} compare={model.range !== "all"} previousLabel={PREVIOUS_WORD[model.range]} />
      )}
    </Card>
  );
}
