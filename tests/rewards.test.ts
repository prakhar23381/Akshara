/** The child's rewards (G4): week strip, tree, mission, today's sticker. */
import { weekStrip, treeLeaves, missionDone, todaysSticker, letterSticker, practisedDays, qualitiesOf, firstToday } from "../src/app/lib/rewards";
import type { ActivityRecord } from "../src/app/types/session";
import type { LearningSession } from "../src/app/types/session";
import type { LessonKind } from "../src/app/types/levelConfig";

let pass = 0;
let fail = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  if (cond) pass++;
  else fail++;
  console.log(cond ? "  ✓" : "  ✗", name, cond ? "" : extra);
};

// Local times, so days are the device's whatever the runner's time zone.
const at = (y: number, m: number, d: number, h = 10) => new Date(y, m - 1, d, h).toISOString();
let n = 0;
const s = (letter: string, when: string, opts: { status?: LearningSession["status"]; lesson?: LessonKind } = {}): LearningSession => ({
  session_id: `r-${n++}`, user_id: "c", letter, session_number: 1, status: opts.status ?? "completed",
  started_at: when, ended_at: when,
  level_config: { lesson: opts.lesson ?? "find" } as LearningSession["level_config"],
  activities: [], metrics: null, cognitive_state: null, reasoning: null, schema_version: 2,
});

// Thursday 12 Nov 2026; Monday was the 9th.
const THU = new Date(2026, 10, 12, 15);
const history = [
  s("क", at(2026, 11, 2)),            // the week before
  s("क", at(2026, 11, 9)),            // Monday
  s("ल", at(2026, 11, 10)),           // Tuesday
  s("ल", at(2026, 11, 10, 16)),       // Tuesday again
  s("र", at(2026, 11, 11), { status: "abandoned" }), // Wednesday, left
];

console.log("\n-- the week strip --");
{
  const w = weekStrip(history, THU);
  ok("seven days, Monday first", w.length === 7 && w[0].label === "सोम" && w[6].label === "रवि");
  ok("practised days are Monday and Tuesday", w.map((d) => (d.practised ? 1 : 0)).join("") === "1100000", w.map((d) => +d.practised).join(""));
  ok("a lesson left unfinished is no practice", !w[2].practised);
  ok("today is Thursday", w.findIndex((d) => d.today) === 3);
  const nextMonday = weekStrip(history, new Date(2026, 10, 16, 9));
  ok("a new week starts fresh", nextMonday.every((d) => !d.practised));
}

console.log("\n-- the tree never shrinks --");
ok("one leaf per day practised, ever", treeLeaves(history) === 3, String(treeLeaves(history)));
ok("two lessons in a day are one leaf", practisedDays(history.slice(2, 4)).size === 1);
ok("the next week keeps every leaf", treeLeaves(history) === treeLeaves([...history]));

console.log("\n-- the mission and its sticker --");
ok("not met before a lesson today", !missionDone(history, THU));
const today = [...history, s("ग", at(2026, 11, 12, 11), { lesson: "words" })];
ok("met by one finished lesson today", missionDone(today, THU));
ok("never 'failed': a missed day just has no mission next day", !missionDone(today, new Date(2026, 10, 13, 9)));
ok("its sticker is the letter's word picture (ग: गाय 🐄)", todaysSticker(today, THU)?.emoji === letterSticker("ग")?.emoji && letterSticker("ग")?.word === "गाय");
const reviewOnly = [...history, s("क", at(2026, 11, 12, 11), { lesson: "checkpoint" })];
ok("a day of review only gives the weekday's sticker", todaysSticker(reviewOnly, THU)?.emoji === "🥕");
ok("no lesson today, no sticker", todaysSticker(history, THU) === null);

console.log("\n-- quality cards --");
{
  const act = (type: ActivityRecord["type"], attempts?: { t: string; s: string; m?: "similar" | "dissimilar"; g?: boolean }[]): ActivityRecord => ({
    type, started_at: "x", completed_at: "y",
    outcome: attempts
      ? { kind: "questions", attempts: attempts.map((a) => ({ target_letter: a.t, selected_letter: a.s, module_type: a.m ?? "similar", time_to_interact_ms: 1, was_guided_win: !!a.g, hover_duration_ms: 0, jitter_count: 0 })) }
      : { kind: "viewed", dwell_ms: 1 },
  });
  const with_ = (acts: ActivityRecord[]) => ({ ...s("क", at(2026, 11, 12)), activities: acts });
  ok("always ends with 'Finished'", qualitiesOf(with_([])).join() === "finished");
  ok("sharp eyes: a look-alike right without help",
    qualitiesOf(with_([act("identify", [{ t: "क", s: "क" }])]))[0] === "sharpEyes");
  ok("…not among different shapes", !qualitiesOf(with_([act("identify", [{ t: "क", s: "क", m: "dissimilar" }])])).includes("sharpEyes"));
  ok("…not when the app gave the answer", !qualitiesOf(with_([act("identify", [{ t: "क", s: "क", g: true }])])).includes("sharpEyes"));
  ok("never gave up: a wrong answer, and finished anyway", qualitiesOf(with_([act("word_fill", [{ t: "क", s: "ख" }])])).includes("neverGaveUp"));
  const all = qualitiesOf(with_([act("identify", [{ t: "क", s: "ख" }, { t: "क", s: "क" }]), act("tracing"), act("memory")]));
  ok("at most three, the first two by preference", all.length === 3 && all.join() === "sharpEyes,steadyHand,finished", all.join());
}

console.log("\n-- the first lesson today --");
{
  const a = s("क", at(2026, 11, 12, 9));
  const b = s("ल", at(2026, 11, 12, 11));
  ok("the first lesson today is first", firstToday([a, b], a));
  ok("a second one is not", !firstToday([a, b], b));
  ok("a lesson yesterday does not count", firstToday([s("क", at(2026, 11, 11, 9)), b], b));
}

console.log(`\nRESULT ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
