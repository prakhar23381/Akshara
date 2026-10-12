import { useState, type ReactNode } from "react";
import { GRID, INK, INK2 } from "./theme";
import { usePrinting } from "../views/shared";

/**
 * A plain table of the figures. `numeric` lists the columns that are numbers,
 * which are right-aligned so their digits line up.
 */
export function Table({
  caption,
  head,
  rows,
  numeric = [],
  showCaption = false,
}: {
  caption: string;
  head: string[];
  rows: ReactNode[][];
  numeric?: number[];
  showCaption?: boolean;
}) {
  const align = (i: number) => (numeric.includes(i) ? "text-right" : "text-left");
  return (
    <div className="overflow-x-auto">
      <table className="t--1 w-full tabular-nums" style={{ borderCollapse: "collapse", color: INK }}>
        <caption className={showCaption ? "t--1 text-left pb-1" : "sr-only"} style={{ color: INK2 }}>
          {caption}
        </caption>
        <thead>
          <tr>
            {head.map((h, i) => (
              <th
                key={i}
                scope="col"
                className={`font-semibold py-1.5 pr-3 last:pr-0 align-bottom ${align(i)}`}
                style={{ color: INK2, borderBottom: `1px solid ${GRID}` }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, j) => (
            <tr key={j} className="print:break-inside-avoid">
              {r.map((c, i) => (
                <td key={i} className={`py-1.5 pr-3 last:pr-0 ${align(i)}`} style={{ borderBottom: `1px solid ${GRID}` }}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * "Show numbers" (design §6): every chart's figures as a table, one tap away —
 * for exact values, and for anyone the chart does not reach. Left out on paper.
 */
export function NumbersTable(props: { caption: string; head: string[]; rows: ReactNode[][]; numeric?: number[] }) {
  const [open, setOpen] = useState(false);
  const printing = usePrinting();
  if (props.rows.length === 0 || printing) return null;
  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="t--1 self-start inline-flex items-center gap-1 font-semibold -my-2"
        style={{ minHeight: "var(--tap-min)", color: INK2 }}
      >
        {open ? "Hide numbers" : "Show numbers"}
        <span aria-hidden>{open ? "▴" : "▾"}</span>
      </button>
      {open && <Table {...props} />}
    </div>
  );
}
