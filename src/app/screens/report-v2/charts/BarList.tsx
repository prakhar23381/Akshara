import type { MixupPair } from "../model";
import { ACCENT, FONT_DEVANAGARI, INK, INK2 } from "./theme";

/**
 * Mix-ups as bars: the pair, a bar as long as the times it happened, the
 * count. A dark tick marks the same days of the previous period, so "more" or
 * "fewer" is read off the bar rather than written out; ✦ marks a pair never
 * seen before. The key below explains both, and only the pairs shown — the
 * section lists them all. One grid, so every bar starts at the same x.
 */
export function BarList({
  pairs,
  compare,
  previousLabel,
}: {
  pairs: MixupPair[];
  /** False for "all", which has nothing to compare with. */
  compare: boolean;
  /** "same days last week" */
  previousLabel: string;
}) {
  const prevOf = (p: MixupPair) => (compare && !p.isNew ? p.previous ?? 0 : 0);
  const max = Math.max(1, ...pairs.map((p) => Math.max(p.count, prevOf(p))));
  const at = (n: number) => `${(n / max) * 100}%`;
  const ticks = pairs.some((p) => prevOf(p) > 0);
  const fresh = compare && pairs.some((p) => p.isNew);

  return (
    <div className="flex flex-col gap-3">
      <ul className="grid items-center gap-x-3 gap-y-2" style={{ gridTemplateColumns: "max-content minmax(0, 1fr) max-content" }}>
        {pairs.map((p) => {
          const prev = prevOf(p);
          return (
            <li
              key={`${p.a}${p.b}`}
              className="contents"
              aria-label={`${p.a} and ${p.b}: mixed up ${p.count} times${
                p.isNew && compare ? ", for the first time" : compare && p.previous !== null ? `, ${p.previous} the ${previousLabel}` : ""
              }`}
            >
              <span className="t-1 whitespace-nowrap" style={{ color: INK, fontFamily: FONT_DEVANAGARI }} aria-hidden>
                {p.a} ↔ {p.b}
              </span>
              <span className="relative block" style={{ height: 22 }} aria-hidden>
                <span
                  className="absolute left-0"
                  style={{ top: 5, height: 12, width: at(p.count), minWidth: 4, background: ACCENT, borderRadius: "0 4px 4px 0" }}
                />
                {prev > 0 && (
                  <span
                    className="absolute"
                    style={{ left: `calc(${at(prev)} - 1px)`, top: 0, width: 2, height: 22, background: INK }}
                  />
                )}
              </span>
              <span className="t--1 font-semibold tabular-nums whitespace-nowrap" style={{ color: INK, minWidth: "3.2em" }} aria-hidden>
                {p.count}×{p.isNew && compare ? <span style={{ color: INK2 }}> ✦</span> : null}
              </span>
            </li>
          );
        })}
      </ul>
      {(ticks || fresh) && (
        <div className="t--1 flex flex-wrap items-center gap-x-4 gap-y-1" style={{ color: INK2 }}>
          <span className="inline-flex items-center gap-1">
            <span aria-hidden className="inline-block" style={{ width: 14, height: 8, background: ACCENT, borderRadius: "0 3px 3px 0" }} />
            now
          </span>
          {ticks && (
            <span className="inline-flex items-center gap-1">
              <span aria-hidden className="inline-block" style={{ width: 2, height: 12, background: INK }} />
              {previousLabel}
            </span>
          )}
          {fresh && <span>✦ first time</span>}
        </div>
      )}
    </div>
  );
}
