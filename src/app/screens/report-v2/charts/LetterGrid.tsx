import { useState, type ReactNode } from "react";
import type { LetterEntry, LetterStatus } from "../model";
import { BAND } from "../../../lib/reportBands";
import { FONT_DEVANAGARI, INK, INK2, MUTED, STATUS_BAND, STATUS_WORD, statusColor } from "./theme";
import { Readout } from "./DayStrip";
import { useWidth } from "./useWidth";

/**
 * A status mark, drawn rather than typed so it is crisp at 8px and the same on
 * every font: ● learned, ◐ learning, ▲ needs support, ○ not started. The shape
 * carries the status as well as the colour.
 */
export function StatusMark({ status, size = 10 }: { status: LetterStatus; size?: number }) {
  const c = statusColor(status);
  const r = size / 2 - 1;
  const m = size / 2;
  return (
    <svg width={size} height={size} aria-hidden style={{ display: "inline-block", flexShrink: 0 }}>
      {status === "secure" && <circle cx={m} cy={m} r={r} fill={c} />}
      {status === "learning" && (
        <>
          <circle cx={m} cy={m} r={r - 0.75} fill="none" stroke={c} strokeWidth={1.5} />
          <path d={`M${m},${m - r} A${r},${r} 0 0,0 ${m},${m + r} Z`} fill={c} />
        </>
      )}
      {status === "support" && <path d={`M${m},1 L${size - 1},${size - 1} L1,${size - 1} Z`} fill={c} />}
      {status === "not_started" && (
        <circle cx={m} cy={m} r={r - 0.75} fill="none" stroke={c} strokeWidth={1.5} />
      )}
    </svg>
  );
}

const ORDER: LetterStatus[] = ["secure", "learning", "support", "not_started"];

/**
 * The key to the letter marks, as on a map — each mark with its count and
 * word — so the marks need no sentence to explain them. `extra` sits beside
 * "learned" (the change against the previous period).
 */
export function StatusLegend({
  counts,
  extra,
}: {
  counts: Record<LetterStatus, number>;
  extra?: ReactNode;
}) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {ORDER.map((s) => (
        <li key={s} className="t-0 inline-flex items-center gap-1.5" style={{ color: s === "not_started" ? INK2 : INK }}>
          <StatusMark status={s} size={13} />
          <span className="font-semibold tabular-nums">{counts[s]}</span>
          <span>{STATUS_WORD[s]}</span>
          {s === "secure" && extra}
        </li>
      ))}
    </ul>
  );
}

const describe = (e: LetterEntry) => {
  const word = STATUS_WORD[e.status];
  if (e.status === "not_started") return `${e.letter} · ${word}`;
  const rft = e.latestRightFirstTime === null ? "" : ` · ${Math.round(e.latestRightFirstTime)}% right first time last time`;
  return `${e.letter} · ${word}${rft}`;
};

/**
 * All 33 letters with their status. `strip` is one row of marks — the phone
 * summary; `grid` is 11 × 3 with the letters themselves — tablet and desktop.
 */
export function LetterGrid({ entries, variant }: { entries: LetterEntry[]; variant: "strip" | "grid" }) {
  const [active, setActive] = useState<number | null>(null);
  const [ref, width] = useWidth<HTMLDivElement>();
  const label = `Letter status: ${ORDER
    .map((s) => `${entries.filter((e) => e.status === s).length} ${STATUS_WORD[s]}`)
    .join(", ")}`;

  return (
    <div ref={ref}>
      {variant === "strip" ? (
        <div
          role="img"
          aria-label={label}
          className="flex"
          style={{ width }}
          onPointerLeave={() => setActive(null)}
        >
          {entries.map((e, i) => (
            <span
              key={e.letter}
              className="flex justify-center"
              style={{ width: width / entries.length, padding: "4px 0" }}
              onPointerEnter={() => setActive(i)}
              onPointerDown={() => setActive(i)}
            >
              <StatusMark status={e.status} size={Math.min(10, Math.max(6, width / entries.length - 2))} />
            </span>
          ))}
        </div>
      ) : (
        <div
          role="img"
          aria-label={label}
          className="grid gap-1"
          style={{ gridTemplateColumns: "repeat(11, minmax(0, 1fr))" }}
          onPointerLeave={() => setActive(null)}
        >
          {entries.map((e, i) => (
            <span
              key={e.letter}
              className="flex flex-col items-center justify-center rounded-lg py-1"
              style={{
                background: active === i ? BAND[STATUS_BAND[e.status]].tint : "transparent",
                boxShadow: `inset 0 0 0 1px ${active === i ? statusColor(e.status) : "transparent"}`,
              }}
              onPointerEnter={() => setActive(i)}
              onPointerDown={() => setActive(i)}
            >
              <span
                className="t-1 leading-tight"
                style={{ fontFamily: FONT_DEVANAGARI, color: e.status === "not_started" ? MUTED : INK }}
              >
                {e.letter}
              </span>
              <StatusMark status={e.status} size={10} />
            </span>
          ))}
        </div>
      )}
      <Readout text={active !== null ? describe(entries[active]) : null} />
    </div>
  );
}
