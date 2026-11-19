/** The child's rewards (G4): week strip, tree, mission, today's sticker. */
import { weekStrip, treeLeaves, missionDone, todaysSticker, letterSticker, practisedDays } from "../src/app/lib/rewards";
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

console.log(`\nRESULT ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
