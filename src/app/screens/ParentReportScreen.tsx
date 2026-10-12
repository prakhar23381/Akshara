import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { Screen } from "../components/Screen";
import { fetchReportSources, type ReportSources } from "../api/reportSources";
import { useAccount } from "../contexts/AccountContext";
import { ParentReport } from "./report-v2/ParentReport";
import type { Range } from "./report-v2/model";
import { parseView, upOf, type View } from "./report-v2/views/shared";

const RANGES: Range[] = ["week", "month", "all"];
const asRange = (v: string | null): Range => (RANGES.includes(v as Range) ? (v as Range) : "week");

/**
 * `/report` — the parent report (W4, B5; design: docs/10_REPORT_DESIGN.md).
 *
 * Loads one child's records and hands them to `ParentReport`, keeping the
 * period and the view in the address:
 *
 *   /report?child=<id>&range=month&view=letter:क
 *
 * so a view can be shared or reloaded, and the phone's back button goes back
 * a level. Opening a view adds a history entry; the report's own "‹" goes
 * back through it when it came from there (and otherwise replaces the
 * address). Changing the period replaces the address — the back button never
 * steps through Week / Month / All.
 *
 * Whose report: the child named in `?child=` — only one of this adult's own
 * children, never an arbitrary id — else the child playing on the device.
 */
export function ParentReportScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { children: myChildren, activeChild } = useAccount();
  const asked = params.get("child");
  const subject = myChildren.find((c) => c.id === asked) ?? activeChild ?? myChildren[0] ?? null;
  const subjectId = subject?.id ?? null;
  const subjectName = subject?.display_name;

  const [sources, setSources] = useState<ReportSources | null>(null);
  // "Today" is fixed when the records arrive, so the figures do not shift
  // while the parent moves between views.
  const [today, setToday] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!subjectId) {
      setLoading(false);
      return;
    }
    let live = true;
    setLoading(true);
    fetchReportSources(subjectId, subjectName).then((s) => {
      if (!live) return;
      setSources(s);
      setToday(new Date());
      setLoading(false);
    });
    return () => {
      live = false;
    };
  }, [subjectId, subjectName]);

  const range = asRange(params.get("range"));
  const view = parseView(params.get("view"));
  const from = (location.state as { fromView?: View } | null)?.fromView;

  const address = (next: { range?: Range; view?: View }) => {
    const p = new URLSearchParams();
    if (subjectId) p.set("child", subjectId);
    p.set("range", next.range ?? range);
    const v = next.view ?? view;
    if (v !== "summary") p.set("view", v);
    return `?${p.toString()}`;
  };
  const onViewChange = (v: View) => {
    if (v === upOf(view) && from === v) navigate(-1);
    else if (v === upOf(view)) navigate({ search: address({ view: v }) }, { replace: true });
    else navigate({ search: address({ view: v }) }, { state: { fromView: view } });
  };
  const onRangeChange = (r: Range) => navigate({ search: address({ range: r }) }, { replace: true, state: location.state });

  if (loading) {
    return (
      <Screen>
        <div className="flex-1 flex items-center justify-center">
          <p className="t-1" style={{ color: "#52514e" }}>
            Building report…
          </p>
        </div>
      </Screen>
    );
  }

  if (!subject || !sources) {
    return (
      <Screen>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
          <h1 className="t-2 font-semibold">No child to report on yet</h1>
          <button
            onClick={() => navigate("/home")}
            className="t-0 rounded-xl bg-[#4A90E2] px-5 py-2.5 font-semibold text-white"
            style={{ minHeight: "var(--tap-min)" }}
          >
            Back to your children
          </button>
        </div>
      </Screen>
    );
  }

  return (
    <ParentReport
      sources={sources}
      today={today}
      avatar={subject.avatar ?? undefined}
      range={range}
      onRangeChange={onRangeChange}
      view={view}
      onViewChange={onViewChange}
      onBack={() => navigate("/home")}
    />
  );
}
