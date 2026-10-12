import type { ReportModel } from "../model";
import { BarList } from "../charts/BarList";
import { Calendar } from "../charts/Calendar";
import { DayStrip } from "../charts/DayStrip";
import { Delta } from "../charts/Delta";
import { LetterGrid, StatusLegend } from "../charts/LetterGrid";
import { Sparkline } from "../charts/Sparkline";
import { YearHeatmap } from "../charts/YearHeatmap";
import { bucketLabel } from "./Skills";
import { ACCENT, ACCENT_WASH, INK } from "../charts/theme";
import { Card, Glyph, Muted, PERIOD_WORD, PREVIOUS_WORD, pct, useColumns, usePrinting, type View } from "./shared";

/**
 * The summary (design §2): what to practise next, then one card each for
 * Letters, Skills, Practice and Mix-ups. Phone: one column. Tablet and
 * desktop: Letters across the top, the other three in a row — or, for All,
 * Practice across the page for the year's heatmap, Skills and Mix-ups below.
 * Every figure is scoped by the period switch in the header; each card's title
 * opens its section.
 */
export function Summary({
  model,
  today,
  onOpen,
}: {
  model: ReportModel;
  today: Date;
  onOpen?: (view: View) => void;
}) {
  const all = model.range === "all";
  const open = (v: View) => (onOpen ? () => onOpen(v) : undefined);
  const columns = useColumns("md:grid md:grid-cols-6 md:gap-4");
  return (
    <div className={columns}>
      <PractiseNext model={model} />
      <LettersCard model={model} onOpen={open("letters")} />
      {all ? (
        <>
          <PracticeCard model={model} today={today} className="md:col-span-6" onOpen={open("practice")} />
          <SkillsCard model={model} className="md:col-span-3" onOpen={open("skills")} />
          <MixupsCard model={model} className="md:col-span-3" onOpen={open("mixups")} />
        </>
      ) : (
        <>
          <SkillsCard model={model} className="md:col-span-2" onOpen={open("skills")} />
          <PracticeCard model={model} today={today} className="md:col-span-2" onOpen={open("practice")} />
          <MixupsCard model={model} className="md:col-span-2" onOpen={open("mixups")} />
        </>
      )}
    </div>
  );
}

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

type CardProps = { model: ReportModel; onOpen?: () => void };

function LettersCard({ model, onOpen }: CardProps) {
  const { counts, learned, entries } = model.letters;
  // On paper, the grid: the page is narrower than a tablet, but not a phone.
  const printing = usePrinting();
  return (
    <Card title="Letters" className="md:col-span-6" onOpen={onOpen}>
      <StatusLegend
        counts={counts}
        extra={
          learned.change !== null && learned.change !== 0 ? (
            <Delta change={learned.change} format={(n) => `${n} ${PERIOD_WORD[model.range]}`} />
          ) : null
        }
      />
      {printing ? (
        <LetterGrid entries={entries} variant="grid" />
      ) : (
        <>
          <div className="md:hidden">
            <LetterGrid entries={entries} variant="strip" />
          </div>
          <div className="hidden md:block">
            <LetterGrid entries={entries} variant="grid" />
          </div>
        </>
      )}
    </Card>
  );
}

function SkillsCard({ model, className, onOpen }: CardProps & { className: string }) {
  const { rightFirstTime: r, series, mix } = model.skills;
  const { by, format: bucket } = bucketLabel(model);
  return (
    <Card title="Skills" className={className} onOpen={onOpen}>
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

function PracticeCard({ model, today, className, onOpen }: CardProps & { today: Date; className: string }) {
  const { days, minutes, elapsedDays, byDay, history } = model.practice;
  return (
    <Card title="Practice" className={className} onOpen={onOpen}>
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

function MixupsCard({ model, className, onOpen }: CardProps & { className: string }) {
  const pairs = model.mixups.pairs.slice(0, TOP_PAIRS);
  return (
    <Card title="Mix-ups" className={className} onOpen={onOpen}>
      {pairs.length === 0 ? (
        <Muted>No mix-ups {PERIOD_WORD[model.range]}.</Muted>
      ) : (
        <BarList pairs={pairs} compare={model.range !== "all"} previousLabel={PREVIOUS_WORD[model.range]} />
      )}
    </Card>
  );
}
