import type { ReportModel, SkillEntry } from "../model";
import { Delta } from "../charts/Delta";
import { Sparkline } from "../charts/Sparkline";
import { StackBar } from "../charts/StackBar";
import { parseDay } from "../charts/days";
import { GRID, INK, INK2, MIX } from "../charts/theme";
import { Card, Hero, Muted, PERIOD_WORD, pct } from "./shared";

/**
 * Skills (design §3): right first time with how every answer went — right
 * first time, app helped, wrong — then one row per skill: its figure, its
 * change, and a small trend. Matras are listed as not measured, so their
 * absence is visible rather than silent.
 */
export function SkillsView({ model }: { model: ReportModel }) {
  const { rightFirstTime: r, mix, series, entries } = model.skills;
  const when = PERIOD_WORD[model.range];
  const bucket = bucketLabel(model);
  return (
    <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4 md:items-start">
      <Card title="Right first time">
        {r.value === null ? (
          <Muted>No answers {when} yet.</Muted>
        ) : (
          <Hero
            value={pct(r.value)}
            label="right first time"
            delta={<Delta change={r.change} format={(n) => `${n} pt${n === 1 ? "" : "s"}`} />}
            note={`From ${mix.total} answer${mix.total === 1 ? "" : "s"}${r.previous !== null ? ` · ${pct(r.previous)} the same days before` : ""}`}
          />
        )}
        <StackBar
          label="How every answer went"
          segments={[
            { label: "right first time", value: mix.first, color: MIX.first },
            { label: "app helped", value: mix.helped, color: MIX.helped },
            { label: "wrong", value: mix.wrong, color: MIX.wrong },
          ]}
        />
        {series.some((p) => p.value !== null) && (
          <Sparkline
            points={series}
            label={`Right first time, by ${bucket.by}`}
            formatValue={(v) => `${pct(v)} right first time`}
            formatBucket={bucket.format}
            height={56}
          />
        )}
      </Card>
      <Card title="By skill">
        <ul className="flex flex-col">
          {entries.map((e, i) => (
            <SkillRow key={e.id} entry={e} when={when} first={i === 0} />
          ))}
        </ul>
      </Card>
    </div>
  );
}

function SkillRow({ entry: e, when, first }: { entry: SkillEntry; when: string; first: boolean }) {
  const seconds = e.unit === "s";
  const fmt = (v: number) => (seconds ? `${v.toFixed(1)}s` : pct(v));
  const values = e.series.map((p) => p.value).filter((v): v is number => v !== null);
  return (
    <li
      className="grid items-center gap-x-3 py-3"
      style={{ gridTemplateColumns: "minmax(0, 1fr) auto 88px", borderTop: first ? "none" : `1px solid ${GRID}` }}
    >
      <span className="t-0" style={{ color: INK }}>
        {e.label}
      </span>
      {!e.measured ? (
        <span className="t--1 col-span-2" style={{ color: INK2 }}>
          not measured yet
        </span>
      ) : e.measure.value === null ? (
        <span className="t--1 col-span-2" style={{ color: INK2 }}>
          {e.id === "writing" ? `no tracing ${when}` : `no answers ${when}`}
        </span>
      ) : (
        <>
          <span className="flex flex-col items-end leading-tight">
            <span className="t-1 font-semibold tabular-nums" style={{ color: INK }}>
              {fmt(e.measure.value)}
            </span>
            <Delta
              change={e.measure.change}
              lowerIsBetter={e.lowerIsBetter}
              decimals={seconds ? 1 : 0}
              format={(n) => (seconds ? `${n}s` : `${n} pt${n === 1 ? "" : "s"}`)}
            />
          </span>
          {values.length > 0 ? (
            <Sparkline
              compact
              points={e.series}
              label={`${e.label}, over time`}
              formatValue={fmt}
              formatBucket={(s) => s}
              min={0}
              max={seconds ? Math.max(...values) * 1.15 : 100}
              height={30}
            />
          ) : (
            <span />
          )}
        </>
      )}
    </li>
  );
}

/** What one trend point is — a day, a week or a month — and how to name it. */
export function bucketLabel(model: ReportModel) {
  const s = model.skills.series;
  const monthly = s.length > 1 && Date.parse(s[1].start) - Date.parse(s[0].start) > 20 * 86_400_000;
  const by = model.range === "week" ? "day" : monthly ? "month" : "week";
  const format = (start: string) => {
    const d = parseDay(start);
    if (by === "day") return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
    if (by === "month") return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    return `Week of ${d.toLocaleDateString(undefined, { day: "numeric", month: "short" })}`;
  };
  return { by, format };
}
