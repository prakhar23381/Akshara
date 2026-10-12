import type { ReportModel } from "../model";
import { Delta } from "../charts/Delta";
import { LetterGrid, StatusLegend, StatusMark } from "../charts/LetterGrid";
import { NumbersTable } from "../charts/NumbersTable";
import { FONT_DEVANAGARI, GRID, INK, STATUS_WORD } from "../charts/theme";
import { Card, Glyph, Muted, PERIOD_WORD, pct, shortDate, type View } from "./shared";

/**
 * Letters (design §3): all 33 at a size a parent reads — six a row on a
 * phone, eleven on wider screens — with the key, and the letters learned in
 * this period. A letter opens its own view (B4).
 */
export function LettersView({ model, onOpen }: { model: ReportModel; onOpen?: (view: View) => void }) {
  const { counts, learned, learnedInPeriod, entries } = model.letters;
  const when = PERIOD_WORD[model.range];
  return (
    <Card title="All 33 letters">
      <StatusLegend
        counts={counts}
        extra={
          learned.change !== null && learned.change !== 0 ? (
            <Delta change={learned.change} format={(n) => `${n} ${when}`} />
          ) : null
        }
      />
      {model.range !== "all" &&
        (learnedInPeriod.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="t-0 font-semibold" style={{ color: INK }}>
              Learned {when}:
            </span>
            {learnedInPeriod.map((l) => (
              <span
                key={l}
                className="t-1 inline-flex items-center gap-1 rounded-full px-3"
                style={{ fontFamily: FONT_DEVANAGARI, boxShadow: `inset 0 0 0 1px ${GRID}`, color: INK }}
              >
                {l} <StatusMark status="secure" size={10} />
              </span>
            ))}
          </div>
        ) : (
          <Muted>No new letters learned {when} yet.</Muted>
        ))}
      <LetterGrid
        entries={entries}
        variant="grid"
        columns="grid-cols-6 md:grid-cols-11"
        glyphClass="t-2"
        onSelect={onOpen ? (l) => onOpen(`letter:${l}`) : undefined}
      />
      <NumbersTable
        caption="All 33 letters"
        head={["Letter", "Status", "Right first time, last time", "Sessions", "Last practised"]}
        numeric={[2, 3]}
        rows={entries.map((e) => [
          <Glyph key="g">{e.letter}</Glyph>,
          STATUS_WORD[e.status],
          e.latestRightFirstTime === null ? "—" : pct(e.latestRightFirstTime),
          e.sessions,
          e.lastPractised ? shortDate(e.lastPractised, model.now) : "—",
        ])}
      />
    </Card>
  );
}
