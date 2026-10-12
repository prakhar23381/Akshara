import type { ReactNode } from "react";
import type { ReportModel } from "./model";
import { Summary } from "./views/Summary";
import { LettersView } from "./views/Letters";
import { SkillsView } from "./views/Skills";
import { PracticeView } from "./views/Practice";
import { MixUpsView } from "./views/MixUps";
import { SessionsView } from "./views/Sessions";
import { PrintContext, periodCaption } from "./views/shared";
import { GRID, INK, INK2 } from "./charts/theme";

/**
 * Narrower than A4 or Letter less 12mm margins (~700px), so a chart measured
 * on screen at this width fits the page unchanged.
 */
export const PRINT_WIDTH = 680;

/**
 * The download (design §6): the summary, the four sections and the session
 * table, for the period chosen, in one column. It is laid out on screen first
 * — charts are drawn at the width they measure — and then printed; the
 * browser's "Save as PDF" makes the file. Backgrounds print as shown
 * (`print-color-adjust`), since the bars and the heatmap are coloured boxes.
 */
export function PrintReport({ model, today }: { model: ReportModel; today: Date }) {
  const printed = today.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
  return (
    <PrintContext.Provider value={true}>
      <style>{"@page { margin: 12mm; }"}</style>
      <article
        className="mx-auto flex flex-col gap-5"
        style={{ width: PRINT_WIDTH, maxWidth: "100%", color: INK, printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
      >
        <header className="flex flex-col gap-1">
          <h1 className="t-3 font-bold">{model.childName}: practice report</h1>
          <p className="t--1" style={{ color: INK2 }}>
            {periodCaption(model)} · printed {printed}
          </p>
        </header>
        <Part title="Summary">
          <Summary model={model} today={today} />
        </Part>
        <Part title="Letters">
          <LettersView model={model} />
        </Part>
        <Part title="Skills">
          <SkillsView model={model} />
        </Part>
        <Part title="Practice">
          <PracticeView model={model} today={today} />
        </Part>
        <Part title="Mix-ups">
          <MixUpsView model={model} />
        </Part>
        <Part title="All sessions">
          <SessionsView model={model} />
        </Part>
        <footer className="t--1 flex flex-col gap-1" style={{ color: INK2 }}>
          {model.dataSource === "device" && (
            <p>Saved on this device only: sessions played on another device are not included.</p>
          )}
          {model.legacySessions > 0 && (
            <p>
              {model.legacySessions} older session{model.legacySessions === 1 ? " is" : "s are"} counted but recorded
              before answers were kept, so not analysed.
            </p>
          )}
          <p>Made from {model.childName}'s practice in Akshara. It records practice; it is not a test or a diagnosis.</p>
        </footer>
      </article>
    </PrintContext.Provider>
  );
}

/**
 * A part of the document: a heading over a hairline, no background — a card
 * that does not fit moves whole to the next page, and a background would
 * leave an empty block where it was.
 */
function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 pt-3" style={{ borderTop: `1px solid ${GRID}` }}>
      <h2 className="t-2 font-bold print:break-after-avoid">{title}</h2>
      {children}
    </section>
  );
}
