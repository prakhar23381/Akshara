/**
 * The new report's figures (screens/report-v2/model.ts). Most checks run on
 * the report lab's own scenarios — the children the lab renders — so a
 * number that looks wrong in the lab can be traced here. Dates are read in
 * India's time zone, where the app's children are.
 */
import { buildReportModel, letterDetail, pairDetail, periodsFor, localDate, type Range } from "../src/app/screens/report-v2/model";
import { buildProgressReport, type ReportSources } from "../src/app/api/client";
import { buildScenario, LAB_TODAY, type LabChild } from "../src/lab/fixtures/scenarios";
import { createPlayer, rowsOf, SUPPLIED } from "../src/lab/fixtures/play";

process.env.TZ = "Asia/Kolkata";
localStorage.setItem("akshara_offline_mode", "true");

let pass = 0;
let fail = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  if (cond) {
    pass++;
    console.log("  ✓", name);
  } else {
    fail++;
    console.log("  ✗", name, extra);
  }
};

const NOW = new Date(LAB_TODAY); // Sunday 11 Oct 2026, 17:30 in India
const pad = (n: number) => String(n).padStart(2, "0");
const local = (d: Date | null) => (d ? `${localDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}` : "null");
const LETTERS_PLAYED = (src: ReportSources) => [...new Set(src.rows.map((r: any) => r.letter as string))];
const parent = (id: string): LabChild => {
  const sc = buildScenario(id);
  if (sc.kind !== "parent") throw new Error(id);
  return sc.child;
};

console.log("-- calendar periods, compared with the same span before --");
{
  const w = periodsFor("week", NOW);
  ok("week runs from Monday", local(w.current.from) === "2026-10-05 00:00", local(w.current.from));
  ok("compared with last Monday to the same moment last Sunday",
    local(w.previous!.from) === "2026-09-28 00:00" && local(w.previous!.to) === "2026-10-04 17:30", local(w.previous!.to));
  const tue = periodsFor("week", new Date("2026-10-13T06:00:00Z")); // Tuesday 11:30
  ok("on a Tuesday, against last Monday–Tuesday only", local(tue.previous!.to) === "2026-10-06 11:30", local(tue.previous!.to));
  const late = periodsFor("week", new Date("2026-10-11T19:00:00Z")); // Monday 00:30
  ok("just after midnight on Monday, a new week has begun", local(late.current.from) === "2026-10-12 00:00");
  const m = periodsFor("month", NOW);
  ok("month runs from the 1st", local(m.current.from) === "2026-10-01 00:00");
  ok("against 1–11 September", local(m.previous!.from) === "2026-09-01 00:00" && local(m.previous!.to) === "2026-09-11 17:30");
  const mar31 = periodsFor("month", new Date("2027-03-31T06:30:00Z"));
  ok("on 31 March, all of February", local(mar31.previous!.to) === "2027-03-01 00:00", local(mar31.previous!.to));
  ok("all has nothing to compare with", periodsFor("all", NOW).previous === null);
}

console.log("\n-- Aarav's week (the lab's 'week' scenario) --");
const aarav = parent("week");
{
  const m = buildReportModel(aarav.sources, NOW, "week");
  ok("6 sessions this week against 1 by this point last week",
    m.practice.sessions.value === 6 && m.practice.sessions.previous === 1 && m.practice.sessions.change === 5);
  ok("51 minutes against 9", m.practice.minutes.value === 51 && m.practice.minutes.previous === 9);
  ok("practised 6 of the 7 days", m.practice.days.value === 6 && m.practice.elapsedDays === 7);
  ok("one day per entry, Monday first", m.practice.byDay.length === 7 && m.practice.byDay[0].date === "2026-10-05");
  ok("finished 5, stopped early 1", m.practice.finished === 5 && m.practice.stopped === 1);
  const r = m.skills.rightFirstTime;
  ok("78% right first time against 64%", Math.round(r.value!) === 78 && Math.round(r.previous!) === 64, JSON.stringify(r));
  ok("so up 14 points", r.change !== null && Math.round(r.change) === 14);
  ok("answers add up", m.skills.mix.first + m.skills.mix.helped + m.skills.mix.wrong === m.skills.mix.total);
  const [top, second] = m.mixups.pairs;
  ok("top mix-up is क ↔ ख, 7 times, against 3", top.a === "क" && top.b === "ख" && top.count === 7 && top.previous === 3,
    JSON.stringify(top));
  ok("which way round: ख heard, क chosen 5×", top.bChoseA === 5 && top.aChoseB === 2);
  ok("क ↔ ख is not new", top.isNew === false);
  ok("ग ↔ घ is new this week", second.a === "ग" && second.b === "घ" && second.isNew && second.previous === 0);
  ok("practise next: क and ख", m.practiseNext?.kind === "mixup" && m.practiseNext.count === 7);
  ok("29 letters not started", m.letters.counts.not_started === 29);
  ok("letters learned agrees with the current report",
    m.letters.learned.value === buildProgressReport(aarav.sources).letters_mastered);
  ok("the session list is newest first", m.practice.list[0].letter === "घ" && m.practice.list.length === 6);
  ok("a week's trend has a point per day", m.skills.series.length === 7 && m.skills.series[0].start === "2026-10-05");
  const h = m.practice.history;
  ok("the day history spans every period: Aarav's 7 practice days from 3 Oct",
    h.length === 7 && h[0].date === "2026-10-03" && h.every((d, i) => i === 0 || d.date > h[i - 1].date), JSON.stringify(h.map((d) => d.date)));
  ok("…with the same minutes as the week's own days",
    m.practice.byDay.every((d) => d.sessions === 0 || h.find((x) => x.date === d.date)?.minutes === d.minutes));
  ok("the same records give the same report",
    JSON.stringify(m) === JSON.stringify(buildReportModel(aarav.sources, NOW, "week")));
}

console.log("\n-- a month, by calendar month --");
{
  const m = buildReportModel(parent("month").sources, NOW, "month");
  ok("the month's trend is two weeks, the first starting on the 1st",
    m.skills.series.length === 2 && m.skills.series[0].start === "2026-10-01" && m.skills.series[1].start === "2026-10-05",
    m.skills.series.map((p) => p.start).join(","));
  ok("11 days elapsed", m.practice.elapsedDays === 11);
  const all = buildReportModel(parent("month").sources, NOW, "all");
  ok("all: no changes at all", all.skills.rightFirstTime.change === null && all.practice.sessions.previous === null);
  ok("all: sessions are every session", all.practice.sessions.value === parent("month").sources.rows.length);
}

console.log("\n-- a supplied answer is not a right answer (TODO E2) --");
{
  const riya = parent("struggling");
  const m = buildReportModel(riya.sources, NOW, "all");
  const { first, helped, total } = m.skills.mix;
  ok("the struggling child had answers supplied", helped > 0);
  ok("right first time excludes them",
    Math.round(m.skills.rightFirstTime.value!) === Math.round((first / total) * 100));
  const w4a = buildProgressReport(riya.sources).totals!;
  ok("and is below the current report's 'not wrong' share",
    m.skills.rightFirstTime.value! < 100 - (w4a.gross_shape.errors + w4a.feature_level.errors) * 100 / total);
  // Before E2 the engine called 2 of her 3 letters mastered while the app
  // supplied 29% of her answers; this check pinned that disagreement.
  ok("since E2, the engine no longer calls her letters mastered",
    !m.letters.entries.some((e) => e.learned),
    m.letters.entries.filter((e) => e.learned).map((e) => `${e.letter}:${e.status}:${e.latestRightFirstTime}`).join(" "));
}

console.log("\n-- ● means learned, and nothing else (2026-10-12) --");
{
  const kids = [parent("week"), parent("month"), parent("struggling"), parent("first")];
  const sc = buildScenario("class");
  if (sc.kind === "class") kids.push(...sc.children);
  let letters = 0;
  const odd: string[] = [];
  kids.forEach((c) =>
    (["week", "month", "all"] as Range[]).forEach((range) =>
      buildReportModel(c.sources, NOW, range).letters.entries.forEach((e) => {
        letters++;
        if ((e.status === "secure") !== e.learned) odd.push(`${c.display_name} ${e.letter} ${range}`);
      }),
    ),
  );
  ok(`every ● is a learned letter and every learned letter is ● (${letters} checked)`, odd.length === 0, odd.slice(0, 5).join(", "));
}

console.log("\n-- E3: a check answer counts for the letter it asked for --");
{
  const K = "क", KH = "ख";
  const { history, play } = createPlayer("check-child", { idPrefix: "c4ec0000", metrics: true });
  play({ letter: K, when: "2026-10-05T10:00:00Z", identify: [K, K, K, K, K], words: [K, K, K, K, K, K] });
  // Two taps of क in place of ख: क is due a check.
  play({ letter: KH, when: "2026-10-06T10:00:00Z", identify: [KH, K, KH, KH, KH], words: [KH, KH, K, KH, KH, KH] });
  const due = buildReportModel({ rows: rowsOf(history), progress: [], displayName: "Check", source: "device" }, NOW, "all").letters.checks;
  ok("the report lists क as due a check, picked twice for ख",
    due.length === 1 && due[0].letter === K && due[0].picks === 2 && due[0].pickedFor[0] === KH, JSON.stringify(due));
  // The planner makes the fifth Listen & tap question a check on क; the
  // script's wrong fifth answer means the child tapped ख for it.
  const last = play({ letter: KH, when: "2026-10-08T10:00:00Z", identify: [KH, KH, KH, KH, "थ"], words: [KH, KH, KH, KH, KH, KH] });
  ok("the fixture plays the planned check", last.level_config.check?.letter === K, JSON.stringify(last.level_config.check));
  const m = buildReportModel({ rows: rowsOf(history), progress: [], displayName: "Check", source: "device" }, NOW, "all");
  const k = m.letters.entries.find((e) => e.letter === K)!;
  const kh = m.letters.entries.find((e) => e.letter === KH)!;
  ok("क was learned, and the missed check takes it away here too", !k.learned, JSON.stringify(k));
  ok("क's latest answer is the check: 0% right first time", k.latestRightFirstTime === 0, String(k.latestRightFirstTime));
  ok("…in ख's session, but filed under क", k.history.length === 2 && kh.history.length === 2, `${k.history.length} ${kh.history.length}`);
  ok("…and says whose session it was", k.history[1].sessionLetter === KH && k.history[0].sessionLetter === K);
  ok("ख's own figures leave the check out", kh.latestRightFirstTime === 100, String(kh.latestRightFirstTime));
  ok("the mix-up is counted once, as क ↔ ख", m.mixups.pairs.some((p) => p.a === K && p.b === KH));
  ok("once asked, the check is no longer due", m.letters.checks.length === 0, JSON.stringify(m.letters.checks));
}

console.log("\n-- detail views: a letter and a pair, whole history (B4) --");
{
  const K = "क", KH = "ख";
  const src = aarav.sources;
  const all = buildReportModel(src, NOW, "all");
  const pair = all.mixups.pairs.find((p) => p.a === K && p.b === KH)!;
  const k = letterDetail(src, NOW, K);
  const withKh = k.mixedUpWith.find((m) => m.letter === KH)!;
  ok("क's top mix-up is ख", k.mixedUpWith[0]?.letter === KH, JSON.stringify(k.mixedUpWith));
  ok("…as many times as the pair, over everything", withKh.count === pair.count, `${withKh.count} vs ${pair.count}`);
  ok("…and the same way round: क asked, ख chosen", withKh.askedThis === pair.aChoseB && withKh.askedOther === pair.bChoseA);
  ok("its answers are its history's answers",
    k.mix.total === k.entry.history.reduce((n, h) => n + h.answers, 0), `${k.mix.total}`);
  ok("its entry is the model's entry", JSON.stringify(k.entry) === JSON.stringify(all.letters.entries.find((e) => e.letter === K)));
  ok("speed is measured", k.speed !== null && k.speed > 0, `${k.speed}`);
  let traced = 0;
  const wrongWriting: string[] = [];
  ["week", "month", "first", "struggling"].forEach((id) => {
    const kid = parent(id).sources;
    const byLetter = buildReportModel(kid, NOW, "all").skills.entries.find((e) => e.id === "writing")!.byLetter;
    LETTERS_PLAYED(kid).forEach((l) => {
      const d = letterDetail(kid, NOW, l);
      const t = byLetter.find((x) => x.letter === l);
      if (t) traced++;
      if (t ? d.writing !== t.value || d.tracings !== t.n : d.writing !== null || d.tracings !== 0) wrongWriting.push(`${id} ${l}`);
    });
  });
  ok(`a letter's writing is the skill's figure for it, over everything (${traced} traced letters)`,
    traced > 0 && wrongWriting.length === 0, wrongWriting.join(", "));
  ok("first practised on its first session", k.firstPractised === k.entry.history[0].at);

  const d = pairDetail(src, NOW, KH, K);
  ok("a pair reads the same either way round", d.a === K && d.b === KH && JSON.stringify(d) === JSON.stringify(pairDetail(src, NOW, K, KH)));
  ok("…with the model's count and directions", d.count === pair.count && d.aChoseB === pair.aChoseB && d.bChoseA === pair.bChoseA);
  ok("its weeks add up to it", d.weekly.reduce((n, w) => n + w.count, 0) === d.count, JSON.stringify(d.weekly));
  ok("…from the week of the first session", d.weekly[0]?.start === "2026-09-28" && d.weekly[d.weekly.length - 1].start === "2026-10-05",
    d.weekly.map((w) => w.start).join(","));
  ok("its sessions add up to it, newest first",
    d.sessions.reduce((n, x) => n + x.times, 0) === d.count && d.sessions.every((x, i) => i === 0 || x.at <= d.sessions[i - 1].at));
  ok("first and last seen bound its sessions",
    d.firstSeen === d.sessions[d.sessions.length - 1].at && d.lastSeen === d.sessions[0].at);

  const ng = letterDetail(src, NOW, "ङ");
  ok("a letter not started has nothing", ng.entry.status === "not_started" && ng.mix.total === 0 &&
    ng.mixedUpWith.length === 0 && ng.speed === null && ng.writing === null && ng.firstPractised === null);
  const none = pairDetail(parent("new").sources, NOW, K, KH);
  ok("a child with no sessions: an empty pair", none.count === 0 && none.weekly.length === 0 && none.firstSeen === null);
}

console.log("\n-- skills, letter by letter (B4) --");
{
  const m = buildReportModel(aarav.sources, NOW, "week");
  const skill = (id: string) => m.skills.entries.find((e) => e.id === id)!;
  ["sound", "lookalike", "words", "writing", "speed"].forEach((id) => {
    const e = skill(id);
    ok(`${id}: the letters add up to the skill's ${e.n}`, e.byLetter.reduce((n, l) => n + l.n, 0) === e.n,
      JSON.stringify(e.byLetter));
  });
  const sound = skill("sound");
  const weighted = sound.byLetter.reduce((t, l) => t + l.value * l.n, 0) / sound.n;
  ok("sound: the letters' right first time averages back to the skill's",
    Math.abs(weighted - sound.measure.value!) < 0.5, `${weighted} vs ${sound.measure.value}`);
  ok("in alphabet order", sound.byLetter.map((l) => l.letter).join("") === "कखगघ", sound.byLetter.map((l) => l.letter).join(""));
  ok("matras have none", skill("matras").byLetter.length === 0);
}

console.log("\n-- the sections' extra detail (B3, deepened) --");
{
  const K = "क", KH = "ख";
  const m = buildReportModel(aarav.sources, NOW, "week");
  const all = buildReportModel(aarav.sources, NOW, "all");
  const k = m.letters.entries.find((e) => e.letter === K)!;
  ok("क is mixed up most with ख, as often as the pair over everything",
    k.mixedUpMost?.letter === KH && k.mixedUpMost.count === all.mixups.pairs.find((p) => p.a === K && p.b === KH)!.count,
    JSON.stringify(k.mixedUpMost));
  ok("…the same letter the letter's own view leads with",
    letterDetail(aarav.sources, NOW, K).mixedUpWith[0].letter === k.mixedUpMost!.letter);
  ok("a letter never played has no mix-up", m.letters.entries.find((e) => e.letter === "ङ")!.mixedUpMost === null);

  const pages = m.letters.pages;
  ok("four roadmap pages, 10 · 10 · 10 · 3 letters", pages.length === 4 && pages.map((p) => p.letters.length).join() === "10,10,10,3");
  ok("their learned letters are the learned count",
    pages.reduce((n, p) => n + p.learned, 0) === m.letters.counts.secure);
  ok("their started letters are every letter not 'not started'",
    pages.reduce((n, p) => n + p.started, 0) === 33 - m.letters.counts.not_started);
  ok("Aarav: page 1 open, page 2 not yet", pages[0].open && !pages[1].open, JSON.stringify(pages.map((p) => [p.average, p.open])));
  const ishaan = buildReportModel(parent("month").sources, NOW, "week").letters.pages;
  ok("Ishaan has played on page 2, so it is open", ishaan[1].open && ishaan[1].started > 0, JSON.stringify(ishaan.map((p) => [p.average, p.open, p.started])));

  const skill = (id: string) => m.skills.entries.find((e) => e.id === id)!;
  ok("a skill's answer mix is its answers", ["sound", "lookalike", "words"].every((id) => skill(id).mix!.total === skill(id).n));
  ok("…and Listen & tap plus the word games are every answer",
    skill("sound").mix!.total + skill("words").mix!.total === m.skills.mix.total);
  ok("…the helped answers too", skill("sound").mix!.helped + skill("words").mix!.helped === m.skills.mix.helped);
  ok("writing and speed are not answers", skill("writing").mix === null && skill("speed").mix === null);

  ok("every session stopped early has a step it stopped at",
    m.practice.stoppedAt.reduce((n, x) => n + x.count, 0) === m.practice.stopped, JSON.stringify(m.practice.stoppedAt));
  const days = all.practice.history.map((d) => d.date);
  ok("Aarav: 6 days in a row, up to yesterday", m.practice.streak.current === 6, `${JSON.stringify(m.practice.streak)} ${days}`);
  ok("…and that is the longest", m.practice.streak.longest === 6, JSON.stringify(m.practice.streak));
  ok("the streak does not depend on the period", JSON.stringify(all.practice.streak) === JSON.stringify(m.practice.streak));

  ok("a resolved pair is not a pair this period, and had its chance",
    m.mixups.resolved.every((r) => r.before > 0 && r.askedNow > 0 && !m.mixups.pairs.some((p) => p.a === r.a && p.b === r.b)),
    JSON.stringify(m.mixups.resolved));
  ok("All has no 'before'", all.mixups.resolved.length === 0);

  const { history, play } = createPlayer("better-child", { idPrefix: "be77e700", metrics: true });
  play({ letter: K, when: "2026-09-29T10:00:00Z", identify: [K, KH, K, KH, K], words: [K, K, K, K, K, K] });
  play({ letter: K, when: "2026-10-06T10:00:00Z", identify: [K, K, K, K, K], words: [K, K, K, K, K, K] });
  const better = buildReportModel({ rows: rowsOf(history), progress: [], displayName: "Better", source: "device" }, NOW, "week");
  const r = better.mixups.resolved.find((x) => x.a === K && x.b === KH);
  ok("क ↔ ख last week, none this week while क was practised: no longer mixed up",
    r !== undefined && r.before === 2 && r.askedNow === 11, JSON.stringify(better.mixups.resolved));
  ok("…and a two-day gap breaks the streak", better.practice.streak.current === 0 && better.practice.streak.longest === 1,
    JSON.stringify(better.practice.streak));
}

console.log("\n-- nothing yet, or nothing to compare --");
{
  const diya = parent("new");
  (["week", "month", "all"] as Range[]).forEach((range) => {
    const m = buildReportModel(diya.sources, NOW, range);
    ok(`no sessions (${range}): builds, all 33 not started, nothing to suggest`,
      !m.hasAnySessions && m.letters.counts.not_started === 33 && m.practiseNext === null && m.skills.rightFirstTime.value === null);
  });
  const kabir = buildReportModel(parent("first").sources, NOW, "week");
  ok("one session: no comparison for a rate", kabir.skills.rightFirstTime.previous === null && kabir.skills.rightFirstTime.change === null);
  ok("but counts compare with zero", kabir.practice.sessions.previous === 0 && kabir.practice.sessions.change === 1);
  ok("the supplied answer is counted as help", kabir.skills.mix.helped === 1);
  const writing = kabir.skills.entries.find((s) => s.id === "writing")!;
  ok("a first session traces, so writing is measured", writing.measure.value === 58, String(writing.measure.value));
  const speed = kabir.skills.entries.find((s) => s.id === "speed")!;
  ok("speed is lower-is-better and ignores supplied answers (latency 0)", speed.lowerIsBetter && speed.measure.value! >= 4);
  ok("matras are listed as not measured", kabir.skills.entries.some((s) => s.id === "matras" && !s.measured));
}

console.log("\n-- day and week boundaries are the device's --");
{
  const { history, play } = createPlayer("edge-child", { idPrefix: "edde0000", metrics: true });
  const K = "क";
  play({ letter: K, when: "2026-10-04T18:20:00Z", identify: [K, K, K], words: [] }); // Sun 23:50 in India
  play({ letter: K, when: "2026-10-04T18:40:00Z", identify: [K, K, SUPPLIED], words: [] }); // Mon 00:10 in India
  const src: ReportSources = { rows: rowsOf(history), progress: [], displayName: "Edge", source: "device" };
  // Late on Sunday, so last week's comparison span reaches 23:59 too.
  const m = buildReportModel(src, new Date("2026-10-11T18:29:00Z"), "week");
  ok("Sunday 23:50 is last week, Monday 00:10 this week",
    m.practice.sessions.value === 1 && m.practice.sessions.previous === 1,
    `${m.practice.sessions.value} / ${m.practice.sessions.previous}`);
  ok("and it lands on Monday", m.practice.byDay[0].sessions === 1);
  const early = buildReportModel(src, NOW, "week");
  ok("at 17:30 on Sunday, last Sunday 23:50 is past the comparison span", early.practice.sessions.previous === 0);
}

console.log("\n-- older rows --");
{
  const src: ReportSources = {
    rows: [{ id: "old-1", user_id: "c", letter: "क", error_rate_pct: 20, created_at: "2026-10-06T10:00:00Z" }],
    progress: [],
    displayName: "Old",
    source: "device",
  };
  const m = buildReportModel(src, NOW, "week");
  ok("a row without activity detail is counted, not analysed",
    m.legacySessions === 1 && m.hasAnySessions && m.practice.sessions.value === 0);
}

console.log("\n-- a class of 25 --");
{
  const sc = buildScenario("class");
  const kids = sc.kind === "class" ? sc.children : [];
  let built = 0;
  kids.forEach((c) => (["week", "month", "all"] as Range[]).forEach((r) => {
    buildReportModel(c.sources, NOW, r);
    built++;
  }));
  ok("every child builds for every period", built === 75);
}

console.log(`\nRESULT ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
