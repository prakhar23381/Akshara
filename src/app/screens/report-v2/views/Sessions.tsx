import type { ReportModel, SessionRow } from "../model";
import { Table } from "../charts/NumbersTable";
import { INK2 } from "../charts/theme";
import { Card, Glyph, Muted, PERIOD_WORD, pct, sessionWhen } from "./shared";

const RESULT: Record<SessionRow["status"], string> = {
  completed: "finished",
  abandoned: "stopped early",
  in_progress: "still open",
};

const time = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

/** Every session in the period, newest first (design §4). Also the session table of the download. */
export function SessionsView({ model }: { model: ReportModel }) {
  const { list, minutes } = model.practice;
  const when = PERIOD_WORD[model.range];
  return (
    <Card title={`${list.length} session${list.length === 1 ? "" : "s"} ${when}`} breakable>
      {list.length === 0 ? (
        <Muted>No sessions {when}.</Muted>
      ) : (
        <>
          <Muted>{minutes.value} minutes in all · newest first</Muted>
          <Table
            caption={`Sessions ${when}, newest first`}
            head={["When", "Letter", "Minutes", "Right first time", "Result"]}
            numeric={[2, 3]}
            rows={list.map((s) => [
              <span key="w" className="whitespace-nowrap">
                {sessionWhen(s.at)}
                <span className="block" style={{ color: INK2 }}>
                  {time(s.at)}
                </span>
              </span>,
              <Glyph key="l">
                <span className="t-1">{s.letter}</span>
              </Glyph>,
              s.minutes,
              s.rightFirstTime === null ? "—" : pct(s.rightFirstTime),
              RESULT[s.status],
            ])}
          />
        </>
      )}
    </Card>
  );
}
