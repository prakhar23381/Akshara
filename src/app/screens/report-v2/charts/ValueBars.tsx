import { ACCENT, FONT_DEVANAGARI, GRID, INK, INK2 } from "./theme";

export interface ValueRow {
  letter: string;
  value: number;
  n: number;
}

/**
 * A skill letter by letter: the letter, a bar on a fixed scale, the figure.
 * One grid, so every bar starts at the same x; the faint track is the whole
 * scale (100%, or the slowest letter for speed). With `onSelect` each row is
 * a 44px button into that letter's view.
 */
export function ValueBars({
  rows,
  max,
  format,
  describe,
  onSelect,
}: {
  rows: ValueRow[];
  max: number;
  format: (v: number) => string;
  /** For screen readers: "क: 80% right first time, from 5 answers". */
  describe: (r: ValueRow) => string;
  onSelect?: (letter: string) => void;
}) {
  const cols = `max-content minmax(0, 1fr) max-content${onSelect ? " max-content" : ""}`;
  const cells = (r: ValueRow) => (
    <>
      <span className="t-1 leading-none" style={{ color: INK, fontFamily: FONT_DEVANAGARI }} aria-hidden>
        {r.letter}
      </span>
      <span className="relative block rounded" style={{ height: 12, background: GRID }} aria-hidden>
        {r.value > 0 && (
          <span
            className="absolute left-0 top-0 h-full"
            style={{ width: `${Math.min(100, (r.value / max) * 100)}%`, minWidth: 4, background: ACCENT, borderRadius: "0 4px 4px 0" }}
          />
        )}
      </span>
      <span className="t--1 font-semibold tabular-nums text-right" style={{ color: INK, minWidth: "3em" }} aria-hidden>
        {format(r.value)}
      </span>
    </>
  );

  return (
    <div className="grid items-center gap-x-3" style={{ gridTemplateColumns: cols }}>
      {rows.map((r) =>
        onSelect ? (
          <button
            key={r.letter}
            onClick={() => onSelect(r.letter)}
            aria-label={`${describe(r)}: open`}
            className="col-span-4 grid grid-cols-subgrid items-center text-left"
            style={{ minHeight: "var(--tap-min)" }}
          >
            {cells(r)}
            <span aria-hidden className="t-1 leading-none" style={{ color: INK2 }}>
              ›
            </span>
          </button>
        ) : (
          <div key={r.letter} className="col-span-3 grid grid-cols-subgrid items-center py-1.5" aria-label={describe(r)} role="group">
            {cells(r)}
          </div>
        ),
      )}
    </div>
  );
}
