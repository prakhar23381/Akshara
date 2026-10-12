import type { ReactNode } from "react";
import type { MixupPair, Range, ReportModel } from "../model";
import { Calendar } from "../charts/Calendar";
import { DayStrip } from "../charts/DayStrip";
import { Delta } from "../charts/Delta";
import { LetterGrid } from "../charts/LetterGrid";
import { Sparkline } from "../charts/Sparkline";
import { WeekColumns } from "../charts/WeekColumns";
import { parseDay } from "../charts/days";
import { ACCENT, ACCENT_WASH, BAD_TEXT, FONT_DEVANAGARI, GOOD_TEXT, GRID, INK, INK2, MUTED } from "../charts/theme";

/**
 * The summary (design §2): what to practise next, then one card each for
 * Letters, Skills, Practice and Mix-ups. Phone: one column. Tablet and
 * desktop: Letters across the top as an 11 × 3 grid, the other three in a row.
 * Every figure is scoped by the period switch in the header.
 */
export function Summary({ model, today }: { model: ReportModel; today: Date }) {
  const when = PERIOD_WORD[model.range];
  return (
    <div className="flex flex-col gap-3 md:grid md:grid-cols-3 md:gap-4">
      <PractiseNext model={model} />
      <LettersCard model={model} />
      <SkillsCard model={model} />
      <PracticeCard model={model} today={today} />
      <MixupsCard model={model} when={when} />
    </div>
  );
}

const PERIOD_WORD: Record<Range, string> = { week: "this week", month: "this month", all: "so far" };
const pct = (v: number) => `${Math.round(v)}%`;

function Card({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-2xl bg-white p-4 flex flex-col gap-2 min-w-0 ${className}`}
      style={{ boxShadow: `inset 0 0 0 1px ${GRID}` }}
    >
      <h2 className="t-0 font-semibold" style={{ color: INK }}>
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
      className="md:col-span-3 rounded-2xl p-4 t-0"
      style={{ background: ACCENT_WASH, boxShadow: `inset 3px 0 0 0 ${ACCENT}`, color: INK }}
    >
      <span className="font-semibold">Practise next: </span>
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
    <Card title="Letters" className="md:col-span-3">
      <p className="t-0" style={{ color: INK }}>
        <span className="font-semibold">{learned.value ?? 0}</span> learned ·{" "}
        <span className="font-semibold">{counts.learning}</span> learning ·{" "}
        <span className="font-semibold">{counts.support}</span> need{counts.support === 1 ? "s" : ""} support
        {learned.change !== null && learned.change !== 0 && (
          <>
            {"  "}
            <Delta change={learned.change} format={(n) => `${n} learned`} />
          </>
        )}
      </p>
      <div className="md:hidden">
        <LetterGrid entries={entries} variant="strip" />
      </div>
      <div className="hidden md:block">
        <LetterGrid entries={entries} variant="grid" />
      </div>
    </Card>
  );
}

function SkillsCard({ model }: { model: ReportModel }) {
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
    <Card title="Skills">
      {r.value === null ? (
        <Muted>No answers {PERIOD_WORD[model.range]} yet.</Muted>
      ) : (
        <>
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
        </>
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

function PracticeCard({ model, today }: { model: ReportModel; today: Date }) {
  const { days, minutes, elapsedDays, byDay } = model.practice;
  const none = (days.value ?? 0) === 0;
  return (
    <Card title="Practice">
      <p className="t-0" style={{ color: INK }}>
        {model.range === "all" ? (
          <>
            <span className="font-semibold">{days.value}</span> day{days.value === 1 ? "" : "s"}
          </>
        ) : (
          <>
            <span className="font-semibold">{days.value}</span> of {elapsedDays} days
          </>
        )}{" "}
        · <span className="font-semibold">{minutes.value}</span> min
      </p>
      {none && model.range !== "all" ? (
        <Muted>No practice {PERIOD_WORD[model.range]} yet.</Muted>
      ) : null}
      {model.range === "week" && <DayStrip byDay={byDay} today={today} />}
      {model.range === "month" && <Calendar byDay={byDay} today={today} />}
      {model.range === "all" && <WeekColumns byDay={byDay} />}
    </Card>
  );
}

function PairChange({ pair, when }: { pair: MixupPair; when: string }) {
  if (pair.isNew) {
    return (
      <span className="t--1 whitespace-nowrap" style={{ color: INK2 }}>
        new {when}
      </span>
    );
  }
  if (pair.previous === null) return null;
  const change = pair.count - pair.previous;
  if (change === 0) {
    return (
      <span className="t--1 whitespace-nowrap" style={{ color: MUTED }}>
        same as before
      </span>
    );
  }
  // Fewer mix-ups is the good direction.
  return (
    <span className="t--1 font-semibold whitespace-nowrap" style={{ color: change > 0 ? BAD_TEXT : GOOD_TEXT }}>
      <span aria-hidden>{change > 0 ? "▲" : "▼"}</span>
      <span className="sr-only">{change > 0 ? "up" : "down"}</span> from {pair.previous}
    </span>
  );
}

function MixupsCard({ model, when }: { model: ReportModel; when: string }) {
  const top = model.mixups.pairs.slice(0, 2);
  return (
    <Card title="Mix-ups">
      {top.length === 0 ? (
        <Muted>No mix-ups {when}.</Muted>
      ) : (
        <ul className="flex flex-col gap-1">
          {top.map((p) => (
            <li key={`${p.a}${p.b}`} className="flex items-baseline gap-3">
              <span className="t-1" style={{ color: INK, minWidth: "3.2em" }}>
                <Glyph>
                  {p.a} ↔ {p.b}
                </Glyph>
              </span>
              <span className="t-0 font-semibold tabular-nums" style={{ color: INK }}>
                {p.count}×
              </span>
              <PairChange pair={p} when={when} />
            </li>
          ))}
        </ul>
      )}
      {model.mixups.pairs.length > 2 && (
        <Muted>
          and {model.mixups.pairs.length - 2} more pair{model.mixups.pairs.length - 2 === 1 ? "" : "s"}
        </Muted>
      )}
    </Card>
  );
}
