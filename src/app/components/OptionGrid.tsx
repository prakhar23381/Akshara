import type { ReactNode } from "react";

type Shape = "tile" | "row";

/**
 * The one answer-options layout.
 *
 * Replaces four separate implementations that each overflowed differently:
 *   GameScreen        `grid-cols-4` with `p-8` cards
 *   WordFillBlank     `flex-wrap` with fixed `w-20 h-20 sm:w-24 sm:h-24`
 *   WordSpelling      four full-width stacked buttons
 *   MemoryGame        `grid-cols-3`
 *
 * Three rules make it fit on any screen:
 *
 *  1. Column count is chosen from the option count, not from `auto-fit`.
 *     `auto-fit` is what produced the "three in one row and one in the next"
 *     split — four 96px tiles plus gaps exceed a 375px phone, so the fourth
 *     wrapped alone.
 *  2. Tiles are square and the grid's height follows from its width, capped
 *     by the space available. Letting tiles stretch to fill the height is what
 *     turned four options on a tablet into four tall strips (device feedback
 *     3b/4b) — and it fixed nothing on a phone, where width is the limit.
 *  3. Text is sized from the cell, not the viewport: each cell is a size
 *     container, read by `.tile-glyph` and `.row-word` in fonts.css.
 */

/**
 * Square tiles, laid out by option count.
 *
 * Tiles used to stretch to fill whatever height was left, so their shape
 * depended on the screen: on a tablet, four options in one row became four
 * 170×700px strips. Every tile grid is now square-celled: the grid's height
 * follows from its width (`aspect` = columns ÷ rows), and the column count may
 * change with the screen as long as the aspect changes with it. Tailwind only
 * generates classes it finds as literal text, hence the table.
 */
const SQUARE: Record<number, { cols: string; aspect: string }> = {
  1: { cols: "grid-cols-1", aspect: "aspect-square" },
  2: { cols: "grid-cols-2", aspect: "aspect-[2/1]" },
  3: { cols: "grid-cols-3", aspect: "aspect-[3/1]" },
  // By orientation, not width: 2×2 fills a portrait screen of any size (a
  // portrait tablet left empty bands above and below a 4×1 row), and a
  // landscape screen is too short for 2×2.
  4: { cols: "grid-cols-2 landscape:grid-cols-4", aspect: "aspect-square landscape:aspect-[4/1]" },
  5: { cols: "grid-cols-3", aspect: "aspect-[3/2]" },
  6: { cols: "grid-cols-3", aspect: "aspect-[3/2]" },
  8: { cols: "grid-cols-4", aspect: "aspect-[2/1]" },
};

export function OptionGrid<T>({
  items,
  render,
  shape = "tile",
  keyOf,
  className = "",
}: {
  items: T[];
  render: (item: T, index: number) => ReactNode;
  shape?: Shape;
  keyOf?: (item: T, index: number) => string;
  className?: string;
}) {
  // Each cell is a size container, so the text inside can be sized as a
  // share of the cell (`.tile-glyph`, `.row-word` in fonts.css).
  const cells = items.map((item, i) => (
    <div key={keyOf ? keyOf(item, i) : i} className="option-cell min-h-0 min-w-0 flex">
      {render(item, i)}
    </div>
  ));

  // Tiles: the grid's height follows from its width, so an outer box takes
  // the leftover space and centres the grid inside it. If the screen is too
  // short for that height, max-height wins and the cells get a little shorter
  // rather than the grid overflowing.
  if (shape === "tile") {
    const sq = SQUARE[items.length] ?? { cols: "grid-cols-3", aspect: "aspect-[3/2]" };
    return (
      <div className={`flex-1 min-h-0 w-full flex items-center justify-center ${className}`}>
        <div
          className={`grid w-full ${sq.cols} ${sq.aspect}`}
          style={{
            gap: "var(--gap-screen)",
            maxWidth: "min(48rem, 100%)",
            maxHeight: "100%",
            gridAutoRows: "minmax(0, 1fr)",
          }}
        >
          {cells}
        </div>
      </div>
    );
  }

  // Rows (whole-word options): bounded height, so four rows never become four
  // tall slabs with a small word in each.
  return (
    <div
      className={`grid grid-cols-1 w-full flex-1 min-h-0 ${className}`}
      style={{
        gap: "var(--gap-screen)",
        gridAutoRows: "minmax(3.25rem, 5.5rem)",
        maxWidth: "var(--cta-max)",
        alignContent: "center",
        // `justify-self` does nothing here: the parent is ChildScreen's <main>,
        // which is a flex column, and justify-self only applies to grid items.
        // With an explicit max-width and the default `align-items: stretch`,
        // that left the grid pinned to the left edge — which is why every
        // activity read as "not centred", worst on a tablet and on the
        // row-shaped spelling options at any width.
        marginInline: "auto",
      }}
    >
      {cells}
    </div>
  );
}
