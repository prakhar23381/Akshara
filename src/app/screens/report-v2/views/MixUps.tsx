import type { ReportModel } from "../model";
import { BarList } from "../charts/BarList";
import { Delta } from "../charts/Delta";
import { NumbersTable } from "../charts/NumbersTable";
import { ACCENT, GRID, INK, INK2 } from "../charts/theme";
import { Card, Glyph, Hero, Muted, PERIOD_WORD, PREVIOUS_WORD, pairView, useColumns, type View } from "./shared";

/**
 * Mix-ups (design §3): every pair this period as bars — the summary shows the
 * top four — and whether wrong answers come from look-alike letters or from
 * different shapes. That comparison is Listen & tap only: the one game where
 * only the distractors vary (design §5). A pair opens its own view (B4).
 */
export function MixUpsView({ model, onOpen }: { model: ReportModel; onOpen?: (view: View) => void }) {
  const { total, pairs, shape } = model.mixups;
  const when = PERIOD_WORD[model.range];
  const compare = model.range !== "all";
  const columns = useColumns("md:grid md:grid-cols-2 md:gap-4 md:items-start");
  return (
    <div className={columns}>
      <Card title="Every pair">
        {pairs.length === 0 ? (
          <Muted>No mix-ups {when}.</Muted>
        ) : (
          <>
            <Hero
              value={total.value ?? 0}
              label={`mix-up${total.value === 1 ? "" : "s"} ${when}`}
              delta={<Delta change={total.change} lowerIsBetter format={(n) => `${n}`} />}
            />
            <BarList
              pairs={pairs}
              compare={compare}
              previousLabel={PREVIOUS_WORD[model.range]}
              onSelect={onOpen ? (a, b) => onOpen(pairView(a, b)) : undefined}
            />
            <NumbersTable
              caption={`Every pair ${when}`}
              head={["Pair", "Times", ...(compare ? ["Same days before"] : []), "Which way round"]}
              numeric={compare ? [1, 2] : [1]}
              rows={pairs.map((p) => [
                <Glyph key="p">
                  {p.a} ↔ {p.b}
                </Glyph>,
                p.count,
                ...(compare ? [p.isNew ? "first time" : p.previous ?? "—"] : []),
                <span key="w" className="whitespace-nowrap">
                  <Glyph>
                    asked {p.a}, chose {p.b}: {p.aChoseB}× · asked {p.b}, chose {p.a}: {p.bChoseA}×
                  </Glyph>
                </span>,
              ])}
            />
          </>
        )}
      </Card>
      <Card title="Look-alike or different shape?">
        <Muted>Wrong answers in Listen &amp; tap, by the kind of letters offered.</Muted>
        <ShareBar label="Look-alike letters" {...shape.lookalike} />
        <ShareBar label="Different shapes" {...shape.different} />
      </Card>
    </div>
  );
}

/** A share on a 0–100% track: the wrong answers out of all answers of one kind. */
function ShareBar({ label, wrong, answers }: { label: string; wrong: number; answers: number }) {
  const share = answers > 0 ? Math.round((wrong / answers) * 100) : null;
  return (
    <div className="flex flex-col gap-1" aria-label={share === null ? `${label}: no answers` : `${label}: ${share}% wrong of ${answers} answers`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="t-0" style={{ color: INK }}>
          {label}
        </span>
        <span className="t--1 tabular-nums" style={{ color: INK2 }}>
          {share === null ? (
            "no answers"
          ) : (
            <>
              <span className="t-0 font-semibold" style={{ color: INK }}>
                {share}%
              </span>{" "}
              wrong · {answers} answers
            </>
          )}
        </span>
      </div>
      <span aria-hidden className="block rounded" style={{ height: 12, background: GRID }}>
        {share !== null && share > 0 && (
          <span className="block h-full" style={{ width: `${share}%`, background: ACCENT, borderRadius: "0 4px 4px 0" }} />
        )}
      </span>
    </div>
  );
}
