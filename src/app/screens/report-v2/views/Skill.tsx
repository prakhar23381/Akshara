import type { ReportModel, SkillId } from "../model";
import { Delta } from "../charts/Delta";
import { NumbersTable } from "../charts/NumbersTable";
import { TrendChart } from "../charts/TrendChart";
import { ValueBars } from "../charts/ValueBars";
import { Card, Glyph, Hero, Muted, PERIOD_WORD, pct, secsText, useColumns, type View } from "./shared";
import { bucketLabel } from "./Skills";

/** What each skill is, in a parent's words. */
const ABOUT: Record<SkillId, string> = {
  sound: "Listen & tap: hear a letter, tap it.",
  lookalike: "Listen & tap questions where the other choices look like the letter.",
  words: "The word games: finish a word, and spell one.",
  writing: "The score for tracing a letter.",
  speed: "Time to answer, counting only answers right first time.",
  matras: "",
};

const WHAT: Record<SkillId, string> = {
  sound: "right first time",
  lookalike: "right first time",
  words: "right first time",
  writing: "tracing score",
  speed: "to answer",
  matras: "",
};

/**
 * One skill in the period (design §4): its figure and change, its trend with
 * a scale, and a bar per letter — weakest first, so the letters that need
 * practice lead. A letter's bar opens the letter.
 */
export function SkillView({ model, id, onOpen }: { model: ReportModel; id: SkillId; onOpen?: (view: View) => void }) {
  const e = model.skills.entries.find((s) => s.id === id)!;
  const columns = useColumns("md:grid md:grid-cols-2 md:gap-4 md:items-start");
  const when = PERIOD_WORD[model.range];
  const bucket = bucketLabel(model);

  if (!e.measured) {
    return (
      <Card title="Not measured yet">
        <Muted>
          The app teaches {e.label.toLowerCase()} in the barakhadi step but does not check them yet, so there is
          nothing to show.
        </Muted>
      </Card>
    );
  }

  const seconds = e.unit === "s";
  const fmt = (v: number) => (seconds ? secsText(v) : pct(v));
  const values = e.series.map((p) => p.value).filter((v): v is number => v !== null);
  const top = seconds ? Math.max(1, Math.ceil(Math.max(...values, ...e.byLetter.map((l) => l.value)) * 1.2)) : 100;
  const unitWord = id === "writing" ? "tracing" : "answer";
  const count = (n: number) => `${n} ${unitWord}${n === 1 ? "" : "s"}`;
  const byLetter = [...e.byLetter].sort((p, q) => (seconds ? q.value - p.value : p.value - q.value));

  return (
    <div className={columns}>
      <Card title="Over time">
        {e.measure.value === null ? (
          <Muted>{id === "writing" ? `No tracing ${when}.` : `No answers ${when}.`}</Muted>
        ) : (
          <Hero
            value={fmt(e.measure.value)}
            label={WHAT[id]}
            delta={
              <Delta
                change={e.measure.change}
                lowerIsBetter={e.lowerIsBetter}
                decimals={seconds ? 1 : 0}
                format={(n) => (seconds ? `${n}s` : `${n} pt${n === 1 ? "" : "s"}`)}
              />
            }
            note={`From ${count(e.n)} ${when}`}
          />
        )}
        <Muted>{ABOUT[id]}</Muted>
        {values.length > 0 && (
          <TrendChart
            points={e.series.map((p) => ({ key: p.start, label: bucket.format(p.start), value: p.value }))}
            label={`${e.label}, by ${bucket.by}`}
            describe={(p) => {
              const n = e.series.find((s) => s.start === p.key)?.n ?? 0;
              return p.value === null ? `${p.label} · nothing` : `${p.label} · ${fmt(p.value)} · ${count(n)}`;
            }}
            formatAxis={fmt}
            max={top}
          />
        )}
        <NumbersTable
          caption={`${e.label}, by ${bucket.by}`}
          head={[bucket.by[0].toUpperCase() + bucket.by.slice(1), WHAT[id][0].toUpperCase() + WHAT[id].slice(1), id === "writing" ? "Tracings" : "Answers"]}
          numeric={[1, 2]}
          rows={e.series.filter((p) => p.n > 0).map((p) => [bucket.format(p.start), p.value === null ? "—" : fmt(p.value), p.n])}
        />
      </Card>

      <Card title="By letter">
        {byLetter.length === 0 ? (
          <Muted>Nothing {when} yet.</Muted>
        ) : (
          <>
            <Muted>{seconds ? "Slowest first." : "Weakest first."}</Muted>
            <ValueBars
              rows={byLetter}
              max={top}
              format={fmt}
              describe={(r) => `${r.letter}: ${fmt(r.value)} ${WHAT[id]}, from ${count(r.n)}`}
              onSelect={onOpen ? (l) => onOpen(`letter:${l}`) : undefined}
            />
            <NumbersTable
              caption={`${e.label}, by letter`}
              head={["Letter", WHAT[id][0].toUpperCase() + WHAT[id].slice(1), id === "writing" ? "Tracings" : "Answers"]}
              numeric={[1, 2]}
              rows={byLetter.map((r) => [<Glyph key="g">{r.letter}</Glyph>, fmt(r.value), r.n])}
            />
          </>
        )}
      </Card>
    </div>
  );
}
