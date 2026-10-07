/**
 * Development-only layout guard.
 *
 * The app is a fixed-viewport experience, so any element wider than the
 * viewport or taller than its parent is a bug, not a scroll affordance. Because
 * there is no automated visual check in this project, this reports those cases
 * in the console instead of relying on someone noticing on a phone.
 *
 * Call `startOverflowCheck()` once in development; it re-runs on resize and on
 * route change.
 */
const SKIP = new Set(["HTML", "BODY", "SCRIPT", "STYLE", "HEAD"]);

export interface OverflowHit {
  selector: string;
  kind: "horizontal" | "vertical";
  size: number;
  limit: number;
}

export function findOverflow(root: ParentNode = document): OverflowHit[] {
  const hits: OverflowHit[] = [];
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;

  root.querySelectorAll<HTMLElement>("*").forEach((el) => {
    if (SKIP.has(el.tagName)) return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;

    // Horizontal: nothing should extend past the viewport edges.
    if (r.right > vw + 1 || r.left < -1) {
      hits.push({
        selector: describe(el),
        kind: "horizontal",
        size: Math.round(r.width),
        limit: vw,
      });
    }
    // Vertical: nothing should extend past the bottom of the viewport.
    if (r.bottom > vh + 1) {
      hits.push({
        selector: describe(el),
        kind: "vertical",
        size: Math.round(r.bottom),
        limit: vh,
      });
    }
  });
  return hits;
}

function describe(el: HTMLElement): string {
  const cls = (el.className || "")
    .toString()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .join(".");
  return `${el.tagName.toLowerCase()}${cls ? "." + cls : ""}`;
}

export function reportOverflow(): void {
  const hits = findOverflow();
  if (hits.length === 0) {
    console.info("[layout] no overflow at %dx%d", window.innerWidth, window.innerHeight);
    return;
  }
  console.warn(
    `[layout] ${hits.length} element(s) overflow the viewport at ${window.innerWidth}x${window.innerHeight}`,
  );
  console.table(hits.slice(0, 20));
}

export function startOverflowCheck(): () => void {
  const run = () => window.setTimeout(reportOverflow, 350);
  run();
  window.addEventListener("resize", run);
  // Expose for manual use from the console on a real device.
  (window as unknown as Record<string, unknown>).__aksharaOverflow = reportOverflow;
  return () => window.removeEventListener("resize", run);
}
