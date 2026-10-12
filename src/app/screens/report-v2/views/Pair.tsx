import { useMemo } from "react";
import type { ReportSources } from "../../../api/client";
import { pairDetail } from "../model";
import { Columns } from "../charts/Columns";
import { NumbersTable, Table } from "../charts/NumbersTable";
import { parseDay } from "../charts/days";
import { ACCENT, FONT_DEVANAGARI, GRID, INK, INK2 } from "../charts/theme";
import { Card, Glyph, Hero, Muted, sessionWhen, shortDate, useColumns } from "./shared";

/**
 * One mix-up pair, over its whole history (design §4; whole history by the
 * user's choice, 2026-10-12): how often, which way round, week by week, and
 * the sessions it happened in.
 */
export function PairView({ sources, today, a: x, b: y }: { sources: ReportSources; today: Date; a: string; b: string }) {
  const d = useMemo(() => pairDetail(sources, today, x, y), [sources, today, x, y]);
  const columns = useColumns("md:grid md:grid-cols-2 md:gap-4 md:items-start");
  const now = today.toISOString();
  const { a, b } = d;

  if (d.count === 0) {
    return (
      <Card title="Not mixed up yet">
        <Muted>
          <Glyph>{a}</Glyph> and <Glyph>{b}</Glyph> have not been mixed up.
        </Muted>
      </Card>
    );
  }

  const ways = [
    { asked: a, chosen: b, count: d.aChoseB },
    { asked: b, chosen: a, count: d.bChoseA },
  ].sort((p, q) => q.count - p.count);
  const most = Math.max(1, ...ways.map((w) => w.count));
  const week = (start: string) => `Week of ${parseDay(start).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`;
  const seen =
    d.firstSeen === d.lastSeen
      ? `On ${shortDate(d.firstSeen!, now)}`
      : `First on ${shortDate(d.firstSeen!, now)} · last on ${shortDate(d.lastSeen!, now)}`;

  return (
    <div className={columns}>
      <section
        className="md:col-span-2 rounded-2xl bg-white p-4 flex flex-wrap items-center gap-x-6 gap-y-2 print:break-inside-avoid"
        style={{ boxShadow: `inset 0 0 0 1px ${GRID}` }}
      >
        <span className="t-5 inline-flex items-center gap-3" style={{ fontFamily: FONT_DEVANAGARI, color: INK }} aria-hidden>
          {a}
          <span className="t-2" style={{ color: INK2 }}>
            ↔
          </span>
          {b}
        </span>
        <Hero value={d.count} label={`mix-up${d.count === 1 ? "" : "s"} in all`} note={seen} />
      </section>
      <Card title="Which way round">
        <div className="grid items-center gap-x-3 gap-y-2" style={{ gridTemplateColumns: "max-content minmax(0, 1fr) max-content" }}>
          {ways.map((w) => (
            <div
              key={w.asked}
              className="col-span-3 grid grid-cols-subgrid items-center"
              role="group"
              aria-label={`Asked for ${w.asked}, chose ${w.chosen}: ${w.count} time${w.count === 1 ? "" : "s"}`}
            >
              <span className="t-0 whitespace-nowrap" style={{ color: INK }} aria-hidden>
                asked for <Big>{w.asked}</Big>, chose <Big>{w.chosen}</Big>
              </span>
              <span className="relative block rounded" style={{ height: 12, background: GRID }} aria-hidden>
                {w.count > 0 && (
                  <span
                    className="absolute left-0 top-0 h-full"
                    style={{ width: `${(w.count / most) * 100}%`, minWidth: 4, background: ACCENT, borderRadius: "0 4px 4px 0" }}
                  />
                )}
              </span>
              <span className="t--1 font-semibold tabular-nums" style={{ color: INK }} aria-hidden>
                {w.count}×
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Times a week">
        <Columns
          columns={d.weekly.map((w) => ({ key: w.start, value: w.count, label: week(w.start) }))}
          unit="times"
          label={`${a} and ${b}, mixed up each week`}
        />
        <NumbersTable
          caption={`${a} and ${b}: times a week`}
          head={["Week", "Times"]}
          numeric={[1]}
          rows={d.weekly.map((w) => [week(w.start), w.count])}
        />
      </Card>

      <Card title="Sessions it happened in" className="md:col-span-2">
        <Table
          caption={`Sessions in which ${a} and ${b} were mixed up, newest first`}
          head={["Session", "Letter practised", "Times"]}
          numeric={[2]}
          rows={d.sessions.map((s) => [sessionWhen(s.at), <Big key="g">{s.letter}</Big>, s.times])}
        />
      </Card>
    </div>
  );
}

const Big = ({ children }: { children: string }) => (
  <span className="t-1" style={{ fontFamily: FONT_DEVANAGARI }}>
    {children}
  </span>
);
