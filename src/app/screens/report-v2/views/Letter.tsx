import { useMemo } from "react";
import type { ReportSources } from "../../../api/reportSources";
import { letterDetail, type LetterSessionPoint } from "../model";
import { StackBar } from "../charts/StackBar";
import { StatusMark } from "../charts/LetterGrid";
import { NumbersTable } from "../charts/NumbersTable";
import { TrendChart, type TrendPoint } from "../charts/TrendChart";
import { ACCENT, FONT_DEVANAGARI, GRID, INK, INK2, MIX, STATUS_WORD, SURFACE } from "../charts/theme";
import { Card, Glyph, Hero, Muted, pairView, pct, secsText, sessionWhen, shortDate, useColumns, type View } from "./shared";

/** Below this, a letter not yet learned needs support (design §5). */
const SUPPORT_LINE = 70;

/**
 * One letter, over its whole history (design §4; the user chose whole
 * history, 2026-10-12): where it stands, right first time session by
 * session, how every answer went, the letters it was mixed up with, and its
 * speed and writing. The period switch does not apply here.
 */
export function LetterView({
  sources,
  today,
  letter,
  onOpen,
}: {
  sources: ReportSources;
  today: Date;
  letter: string;
  onOpen?: (view: View) => void;
}) {
  const d = useMemo(() => letterDetail(sources, today, letter), [sources, today, letter]);
  const columns = useColumns("md:grid md:grid-cols-2 md:gap-4 md:items-start");
  const e = d.entry;
  const now = today.toISOString();
  const started = e.status !== "not_started" || e.history.length > 0;

  const facts = [
    `${e.sessions} session${e.sessions === 1 ? "" : "s"}`,
    d.firstPractised && `first on ${shortDate(d.firstPractised, now)}`,
    e.lastPractised && `last on ${shortDate(e.lastPractised, now)}`,
    e.learned && e.learnedAt && `learned on ${shortDate(e.learnedAt, now)}`,
  ].filter(Boolean);

  const points: TrendPoint[] = e.history.map((h, i) => ({
    key: `${h.at}-${i}`,
    label: sessionWhen(h.at),
    value: h.rightFirstTime,
    hollow: h.sessionLetter !== letter,
  }));
  const describe = (h: LetterSessionPoint) =>
    [
      sessionWhen(h.at),
      h.rightFirstTime === null ? "no answers" : `${pct(h.rightFirstTime)} right first time`,
      `${h.answers} answer${h.answers === 1 ? "" : "s"}`,
      h.sessionLetter !== letter ? `a check in ${h.sessionLetter}'s session` : "",
    ]
      .filter(Boolean)
      .join(" · ");

  return (
    <div className={columns}>
      <section
        className="md:col-span-2 rounded-2xl bg-white p-4 flex items-center gap-4 print:break-inside-avoid"
        style={{ boxShadow: `inset 0 0 0 1px ${GRID}` }}
      >
        <span className="t-5" style={{ fontFamily: FONT_DEVANAGARI, color: INK }} aria-hidden>
          {letter}
        </span>
        <div className="flex flex-col gap-1 min-w-0">
          <p className="t-1 font-bold inline-flex items-center gap-2" style={{ color: INK }}>
            <StatusMark status={e.status} size={16} />
            {STATUS_WORD[e.status][0].toUpperCase() + STATUS_WORD[e.status].slice(1)}
          </p>
          <Muted>{started ? facts.join(" · ") : "Not practised yet."}</Muted>
        </div>
      </section>

      {started && (
        <>
          <Card title="Right first time, by session" className="md:col-span-2">
            {d.rightFirstTime === null ? (
              <Muted>No answers yet.</Muted>
            ) : (
              <Hero
                value={pct(d.rightFirstTime)}
                label="right first time"
                note={`From ${d.mix.total} answer${d.mix.total === 1 ? "" : "s"} in all`}
              />
            )}
            {points.some((p) => p.value !== null) && (
              <>
                <TrendChart
                  points={points}
                  label={`${letter}: right first time, by session`}
                  describe={(p) => describe(e.history[points.indexOf(p)])}
                  formatAxis={(v) => `${Math.round(v)}%`}
                  reference={e.learned ? undefined : SUPPORT_LINE}
                />
                {points.some((p) => p.hollow && p.value !== null) && (
                  <p className="t--1 inline-flex items-center gap-1.5" style={{ color: INK2 }}>
                    <svg width={10} height={10} aria-hidden>
                      <circle cx={5} cy={5} r={3.5} fill={SURFACE} stroke={ACCENT} strokeWidth={2} />
                    </svg>
                    a check question, asked in another letter's session
                  </p>
                )}
                {!e.learned && <Muted>Below the dashed line ({SUPPORT_LINE}%), a letter not yet learned needs support.</Muted>}
              </>
            )}
            <StackBar
              label="How every answer went"
              segments={[
                { label: "right first time", value: d.mix.first, color: MIX.first },
                { label: "app helped", value: d.mix.helped, color: MIX.helped },
                { label: "wrong", value: d.mix.wrong, color: MIX.wrong },
              ]}
            />
            <NumbersTable
              caption={`${letter}: every session`}
              head={["Session", "Answers", "Right first time"]}
              numeric={[1, 2]}
              rows={e.history.map((h) => [
                <>
                  {sessionWhen(h.at)}
                  {h.sessionLetter !== letter && (
                    <span style={{ color: INK2 }}>
                      {" "}
                      · check in <Glyph>{h.sessionLetter}</Glyph>
                    </span>
                  )}
                </>,
                h.answers,
                h.rightFirstTime === null ? "—" : pct(h.rightFirstTime),
              ])}
            />
          </Card>

          <Card title="Mixed up with">
            {d.mixedUpWith.length === 0 ? (
              <Muted>Not mixed up with another letter yet.</Muted>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {d.mixedUpWith.map((m) => {
                  const said = `${letter} and ${m.letter}: mixed up ${m.count} time${m.count === 1 ? "" : "s"}`;
                  const body = (
                    <>
                      <span className="t-1" style={{ fontFamily: FONT_DEVANAGARI }}>
                        {m.letter}
                      </span>
                      <span className="t--1 font-semibold tabular-nums">{m.count}×</span>
                    </>
                  );
                  return (
                    <li key={m.letter}>
                      {onOpen ? (
                        <button
                          onClick={() => onOpen(pairView(letter, m.letter))}
                          aria-label={`${said}: open`}
                          className="inline-flex items-center gap-2 rounded-full pl-4 pr-3"
                          style={{ minHeight: "var(--tap-min)", color: INK, boxShadow: `inset 0 0 0 1px ${GRID}` }}
                        >
                          {body}
                          <span aria-hidden className="t-1 leading-none" style={{ color: INK2 }}>
                            ›
                          </span>
                        </button>
                      ) : (
                        <span
                          aria-label={said}
                          className="inline-flex items-center gap-2 rounded-full px-4"
                          style={{ minHeight: "var(--tap-min)", color: INK, boxShadow: `inset 0 0 0 1px ${GRID}` }}
                        >
                          {body}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card title="Speed and writing">
            <dl className="grid grid-cols-2 gap-3">
              <Stat
                value={d.speed === null ? "—" : secsText(d.speed)}
                label={d.speed === null ? "no answers right first time yet" : "to answer, when right first time"}
              />
              <Stat
                value={d.writing === null ? "—" : pct(d.writing)}
                label={
                  d.writing === null
                    ? "not traced yet"
                    : `tracing score, from ${d.tracings} tracing${d.tracings === 1 ? "" : "s"}`
                }
              />
            </dl>
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <dt className="t--1" style={{ color: INK2 }}>
        {label}
      </dt>
      <dd className="t-3 font-semibold leading-none order-first" style={{ color: INK }}>
        {value}
      </dd>
    </div>
  );
}
