import type { AnswerMix, ReportModel, SkillEntry, SkillId } from "../model";
import { Delta } from "../charts/Delta";
import { NumbersTable } from "../charts/NumbersTable";
import { Sparkline } from "../charts/Sparkline";
import { StackBar } from "../charts/StackBar";
import { parseDay } from "../charts/days";
import { HEAT, heatInk } from "../charts/heat";
import { LETTER_SEQUENCE } from "../../../types/levelConfig";
import { FONT_DEVANAGARI, GRID, INK, INK2, MIX, MUTED } from "../charts/theme";
import { Card, Hero, Muted, PERIOD_WORD, pct, secsText, useColumns, usePrinting, type View } from "./shared";

/**
 * Skills (design §3): right first time with how every answer went — right
 * first time, app helped, wrong — then one row per skill: its figure, its
 * change, and a small trend; a row opens the skill (B4). Matras are listed as
 * not measured, so their absence is visible rather than silent. Deeper than
 * the summary: where the app had to help, skill by skill, and every letter
 * against every skill in one grid.
 */
export function SkillsView({ model, onOpen }: { model: ReportModel; onOpen?: (view: View) => void }) {
  const { rightFirstTime: r, mix, series, entries } = model.skills;
  const when = PERIOD_WORD[model.range];
  const bucket = bucketLabel(model);
  const columns = useColumns("md:grid md:grid-cols-2 md:gap-4 md:items-start");
  return (
    <div className={columns}>
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
        <NumbersTable
          caption={`Right first time, by ${bucket.by}`}
          head={[bucket.by[0].toUpperCase() + bucket.by.slice(1), "Right first time", "Answers"]}
          numeric={[1, 2]}
          rows={series.filter((p) => p.n > 0).map((p) => [bucket.format(p.start), p.value === null ? "—" : pct(p.value), p.n])}
        />
      </Card>
      <Card title="By skill">
        <ul className="flex flex-col">
          {entries.map((e, i) => (
            <SkillRow
              key={e.id}
              entry={e}
              when={when}
              first={i === 0}
              onOpen={onOpen && e.measured ? () => onOpen(`skill:${e.id}`) : undefined}
            />
          ))}
        </ul>
      </Card>
      <HelpCard entries={entries} when={when} />
      <LetterSkillGrid entries={entries} when={when} onOpen={onOpen} />
    </div>
  );
}

/** Where the app steps in: each answered skill's answers, right first time · helped · wrong. */
function HelpCard({ entries, when }: { entries: SkillEntry[]; when: string }) {
  const rows = entries.filter((e): e is SkillEntry & { mix: AnswerMix } => e.mix !== null && e.mix.total > 0);
  return (
    <Card title="Help needed, by skill">
      {rows.length === 0 ? (
        <Muted>No answers {when} yet.</Muted>
      ) : (
        <>
          <ul className="t--1 flex flex-wrap gap-x-4 gap-y-1" style={{ color: INK2 }}>
            {(["first", "helped", "wrong"] as const).map((k) => (
              <li key={k} className="inline-flex items-center gap-1.5">
                <span aria-hidden className="inline-block" style={{ width: 12, height: 12, borderRadius: 3, background: MIX[k] }} />
                {k === "first" ? "right first time" : k === "helped" ? "app helped" : "wrong"}
              </li>
            ))}
          </ul>
          <ul className="flex flex-col gap-3">
            {rows.map((e) => (
              <li
                key={e.id}
                className="flex flex-col gap-1"
                aria-label={`${e.label}: ${e.mix.first} right first time, ${e.mix.helped} helped, ${e.mix.wrong} wrong, of ${e.mix.total}`}
              >
                <div className="flex items-baseline justify-between gap-2" aria-hidden>
                  <span className="t-0" style={{ color: INK }}>
                    {e.label}
                  </span>
                  <span className="t--1 tabular-nums" style={{ color: INK2 }}>
                    <span className="font-semibold" style={{ color: INK }}>
                      {e.mix.helped}
                    </span>{" "}
                    helped ·{" "}
                    <span className="font-semibold" style={{ color: INK }}>
                      {e.mix.wrong}
                    </span>{" "}
                    wrong · of {e.mix.total}
                  </span>
                </div>
                <span className="flex w-full overflow-hidden rounded" style={{ height: 12, gap: 2 }} aria-hidden>
                  {(["first", "helped", "wrong"] as const)
                    .filter((k) => e.mix[k] > 0)
                    .map((k) => (
                      <span key={k} style={{ width: `${(e.mix[k] / e.mix.total) * 100}%`, minWidth: 3, background: MIX[k] }} />
                    ))}
                </span>
              </li>
            ))}
          </ul>
          <Muted>Look-alike letters are part of Listen &amp; tap, so they are inside its bar as well.</Muted>
        </>
      )}
    </Card>
  );
}

const GRID_SKILLS: { id: SkillId; head: string }[] = [
  { id: "sound", head: "Sound" },
  { id: "lookalike", head: "Look-alike" },
  { id: "words", head: "Words" },
  { id: "writing", head: "Writing" },
  { id: "speed", head: "Speed" },
];
/** Lower bounds of the four shades, in percent. */
const BANDS = [0, 50, 70, 90];
const BAND_WORDS = ["under 50%", "50–69%", "70–89%", "90%+"];
const shadeOf = (v: number) => BANDS.reduce((level, from, i) => (v >= from ? i : level), 0);

/**
 * Every letter of the period against every skill: one table, each percentage
 * shaded on the accent's ramp (darker is better) with the figure written in
 * it, so the shade never carries it alone. Speed is seconds, unshaded.
 */
function LetterSkillGrid({
  entries,
  when,
  onOpen,
}: {
  entries: SkillEntry[];
  when: string;
  onOpen?: (view: View) => void;
}) {
  const open = !!onOpen && !usePrinting();
  const skills = GRID_SKILLS.map((g) => ({ ...g, entry: entries.find((e) => e.id === g.id)! }));
  const sorted = [...new Set(skills.flatMap((s) => s.entry.byLetter.map((l) => l.letter)))].sort(
    (a, b) => indexOf(a) - indexOf(b),
  );
  return (
    <Card title="Letters × skills" className="md:col-span-2">
      {sorted.length === 0 ? (
        <Muted>No letters practised {when} yet.</Muted>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="t--1 w-full tabular-nums" style={{ borderCollapse: "separate", borderSpacing: 3, color: INK }}>
              <caption className="sr-only">Each letter practised {when}, against each skill</caption>
              <thead>
                <tr>
                  <th scope="col" className="text-left font-semibold pb-1" style={{ color: INK2 }}>
                    Letter
                  </th>
                  {skills.map((s) => (
                    <th key={s.id} scope="col" className="font-semibold pb-1 text-center" style={{ color: INK2 }}>
                      {s.head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((l) => (
                  <tr key={l}>
                    <th scope="row" className="text-left font-normal">
                      {open ? (
                        <button
                          onClick={() => onOpen!(`letter:${l}`)}
                          aria-label={`${l}: open`}
                          className="t-1 inline-flex items-center gap-1"
                          style={{ minHeight: "var(--tap-min)", fontFamily: FONT_DEVANAGARI, color: INK }}
                        >
                          {l}
                          <span aria-hidden className="t-0" style={{ color: INK2 }}>
                            ›
                          </span>
                        </button>
                      ) : (
                        <span className="t-1" style={{ fontFamily: FONT_DEVANAGARI }}>
                          {l}
                        </span>
                      )}
                    </th>
                    {skills.map((s) => {
                      const v = s.entry.byLetter.find((x) => x.letter === l);
                      if (!v) {
                        return (
                          <td key={s.id} className="text-center rounded" style={{ color: MUTED, height: 36 }}>
                            —
                          </td>
                        );
                      }
                      if (s.id === "speed") {
                        return (
                          <td key={s.id} className="text-center rounded" style={{ height: 36, boxShadow: `inset 0 0 0 1px ${GRID}` }}>
                            {secsText(v.value)}
                          </td>
                        );
                      }
                      const level = shadeOf(v.value);
                      return (
                        <td
                          key={s.id}
                          className="text-center rounded font-semibold"
                          style={{ height: 36, background: HEAT[level], color: heatInk(level + 1) }}
                        >
                          {pct(v.value)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="t--1 flex flex-wrap items-center gap-x-3 gap-y-1" style={{ color: INK2 }}>
            {HEAT.map((c, i) => (
              <span key={c} className="inline-flex items-center gap-1">
                <span aria-hidden className="inline-block" style={{ width: 12, height: 12, borderRadius: 3, background: c }} />
                {BAND_WORDS[i]}
              </span>
            ))}
            <span>right first time (writing: tracing score) · speed in seconds</span>
          </div>
        </>
      )}
    </Card>
  );
}

const indexOf = (l: string) => (LETTER_SEQUENCE as readonly string[]).indexOf(l);

function SkillRow({
  entry: e,
  when,
  first,
  onOpen,
}: {
  entry: SkillEntry;
  when: string;
  first: boolean;
  onOpen?: () => void;
}) {
  const seconds = e.unit === "s";
  const fmt = (v: number) => (seconds ? `${v.toFixed(1)}s` : pct(v));
  const values = e.series.map((p) => p.value).filter((v): v is number => v !== null);
  const open = !!onOpen && !usePrinting();
  const Row = open ? "button" : "div";
  return (
    <li style={{ borderTop: first ? "none" : `1px solid ${GRID}` }}>
    <Row
      {...(open ? { onClick: onOpen, "aria-label": `${e.label}: open` } : {})}
      className="grid items-center gap-x-3 py-3 w-full text-left"
      style={{ gridTemplateColumns: `minmax(0, 1fr) auto 88px${open ? " max-content" : ""}`, minHeight: "var(--tap-min)" }}
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
      {open && (
        <span aria-hidden className="t-1 leading-none" style={{ color: INK2 }}>
          ›
        </span>
      )}
    </Row>
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
