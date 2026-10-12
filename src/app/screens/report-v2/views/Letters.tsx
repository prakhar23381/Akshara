import type { LetterEntry, LetterStatus, ReportModel, RoadmapPage } from "../model";
import { Delta } from "../charts/Delta";
import { LetterGrid, StatusLegend, StatusMark } from "../charts/LetterGrid";
import { NumbersTable } from "../charts/NumbersTable";
import { Sparkline } from "../charts/Sparkline";
import { ACCENT, FONT_DEVANAGARI, GRID, INK, INK2, STATUS_WORD } from "../charts/theme";
import { PAGE_UNLOCK_SCORE } from "../../../lib/letterStatus";
import { Card, Glyph, Muted, PERIOD_WORD, pct, sessionWhen, shortDate, useColumns, usePrinting, type View } from "./shared";

/**
 * Letters (design §3): all 33 with the key and the letters learned in this
 * period; then, deeper than the summary, every letter played — weakest first,
 * each opening its own view — the roadmap's pages as the child sees them, and
 * the learned letters the app will check again (E3).
 *
 * A letter's status is where it stands now, so this section is the same in
 * every period except for "learned this week / month".
 */
export function LettersView({ model, onOpen }: { model: ReportModel; onOpen?: (view: View) => void }) {
  const { counts, learned, learnedInPeriod, entries, pages, checks } = model.letters;
  const when = PERIOD_WORD[model.range];
  const columns = useColumns("md:grid md:grid-cols-2 md:gap-4 md:items-start");
  const played = entries.filter((e) => e.history.length > 0 || e.sessions > 0).sort(weakestFirst);

  return (
    <div className={columns}>
      <Card title="All 33 letters" className="md:col-span-2">
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

      <Card title="Letter by letter" breakable>
        {played.length === 0 ? (
          <Muted>No letters played yet.</Muted>
        ) : (
          <>
            <Muted>Every letter played, weakest first.</Muted>
            <ul className="flex flex-col">
              {played.map((e, i) => (
                <LetterRow key={e.letter} entry={e} first={i === 0} now={model.now} onOpen={onOpen} />
              ))}
            </ul>
          </>
        )}
      </Card>

      <div className="flex flex-col gap-3 md:gap-4 min-w-0">
        <Card title="Roadmap pages">
          <ul className="flex flex-col gap-3">
            {pages.map((p) => (
              <PageRow key={p.page} page={p} last={p.page === pages.length - 1} />
            ))}
          </ul>
          <Muted>
            A learned letter counts 100, one still being learned less. The mark is {PAGE_UNLOCK_SCORE}%: there the
            next page opens — or once the child has played on it.
          </Muted>
        </Card>

        <Card title="What the app will check next">
          {checks.length === 0 ? (
            <Muted>
              Nothing to check. When a learned letter is chosen by mistake twice, the app asks for it once more.
            </Muted>
          ) : (
            <>
              <ul className="flex flex-col gap-2">
                {checks.map((c) => (
                  <li key={c.letter} className="flex items-center gap-3">
                    <span className="t-3 leading-none" style={{ fontFamily: FONT_DEVANAGARI, color: INK }}>
                      {c.letter}
                    </span>
                    <span className="t-0" style={{ color: INK }}>
                      learned, but chosen by mistake {c.picks} time{c.picks === 1 ? "" : "s"} since, for{" "}
                      <Glyph>{c.pickedFor.join(", ")}</Glyph>
                    </span>
                  </li>
                ))}
              </ul>
              <Muted>
                The next session on another letter asks for it once. Right, and it stays learned. Wrong, and it
                counts as learning until its own next session shows it is learned.
              </Muted>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

const RANK: Record<LetterStatus, number> = { support: 0, learning: 1, secure: 2, not_started: 3 };
const weakestFirst = (x: LetterEntry, y: LetterEntry) =>
  RANK[x.status] - RANK[y.status] || (x.latestRightFirstTime ?? 101) - (y.latestRightFirstTime ?? 101);

function LetterRow({
  entry: e,
  first,
  now,
  onOpen,
}: {
  entry: LetterEntry;
  first: boolean;
  now: string;
  onOpen?: (view: View) => void;
}) {
  const open = !!onOpen && !usePrinting();
  const Row = open ? "button" : "div";
  const points = e.history.map((h) => ({ start: h.at, value: h.rightFirstTime, n: h.answers }));
  const facts = [
    e.latestRightFirstTime !== null && `${pct(e.latestRightFirstTime)} last time`,
    `${e.sessions} session${e.sessions === 1 ? "" : "s"}`,
    e.lastPractised && `last ${shortDate(e.lastPractised, now)}`,
  ].filter(Boolean);
  const mixed = e.mixedUpMost ? `mixed up most with ${e.mixedUpMost.letter} (${e.mixedUpMost.count}×)` : "not mixed up yet";
  const said = `${e.letter}: ${STATUS_WORD[e.status]}, ${facts.join(", ")}, ${mixed}`;
  const trend = points.filter((x) => x.value !== null).length >= 2;
  return (
    <li className="print:break-inside-avoid" style={{ borderTop: first ? "none" : `1px solid ${GRID}` }}>
      <Row
        {...(open ? { onClick: () => onOpen!(`letter:${e.letter}`), "aria-label": `${said}: open` } : { "aria-label": said })}
        className="grid items-center gap-x-3 py-2 w-full text-left"
        style={{ gridTemplateColumns: `2em minmax(0, 1fr) 56px${open ? " max-content" : ""}`, minHeight: "var(--tap-min)" }}
      >
        <span className="t-2 leading-none text-center" style={{ fontFamily: FONT_DEVANAGARI, color: INK }} aria-hidden>
          {e.letter}
        </span>
        <span className="flex flex-col min-w-0" aria-hidden>
          <span className="t-0 inline-flex items-center gap-1.5" style={{ color: INK }}>
            <StatusMark status={e.status} size={11} />
            {STATUS_WORD[e.status]}
          </span>
          <span className="t--1" style={{ color: INK2 }}>
            {facts.join(" · ")}
          </span>
          <span className="t--1" style={{ color: INK2 }}>
            <Glyph>{mixed}</Glyph>
          </span>
        </span>
        <span aria-hidden>
          {trend && (
            <Sparkline
              compact
              points={points}
              label={`${e.letter}, right first time by session`}
              formatValue={pct}
              formatBucket={sessionWhen}
              height={28}
            />
          )}
        </span>
        {open && (
          <span aria-hidden className="t-1 leading-none" style={{ color: INK2 }}>
            ›
          </span>
        )}
      </Row>
    </li>
  );
}

function PageRow({ page: p, last }: { page: RoadmapPage; last: boolean }) {
  const range = `${p.letters[0]}–${p.letters[p.letters.length - 1]}`;
  return (
    <li
      className="flex flex-col gap-1"
      aria-label={`Page ${p.page + 1}, ${range}: ${p.average}%, ${p.learned} learned and ${p.started} started of ${p.letters.length}, ${p.open ? "open" : "not open yet"}`}
    >
      <div className="flex items-baseline justify-between gap-2" aria-hidden>
        <span className="t-0" style={{ color: INK }}>
          <span className="font-semibold">Page {p.page + 1}</span> <Glyph>{range}</Glyph>
        </span>
        <span className="t--1" style={{ color: p.open ? INK : INK2 }}>
          {p.open ? "open" : "not open yet"}
        </span>
      </div>
      <div className="grid items-center gap-x-3" style={{ gridTemplateColumns: "minmax(0, 1fr) 3em" }} aria-hidden>
        <span className="relative block rounded" style={{ height: 10, background: GRID }}>
          {p.average > 0 && (
            <span
              className="absolute left-0 top-0 h-full"
              style={{ width: `${p.average}%`, minWidth: 4, background: ACCENT, borderRadius: "0 4px 4px 0" }}
            />
          )}
          {!last && (
            <span
              className="absolute"
              style={{ left: `calc(${PAGE_UNLOCK_SCORE}% - 1px)`, top: -3, width: 2, height: 16, background: INK2 }}
            />
          )}
        </span>
        <span className="t--1 font-semibold tabular-nums text-right" style={{ color: INK }}>
          {p.average}%
        </span>
      </div>
      <span className="t--1" style={{ color: INK2 }} aria-hidden>
        {p.learned} learned · {p.started} started · of {p.letters.length}
      </span>
    </li>
  );
}
