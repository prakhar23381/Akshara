/**
 * Spaced review (G2, docs/12 §6.1): which earlier letters a warm-up asks, and
 * that review answers move a letter through its boxes without ever judging
 * its stage.
 */
import { reviewBoxes, reviewOrder, firstAnswers, reviewAnswers } from "../src/app/lib/review";
import { letterStatuses, completionScore } from "../src/app/lib/letterStatus";
import { buildLearnerProfile } from "../src/app/lib/learnerProfile";
import { planSession, analyzeLocally } from "../src/app/lib/adaptiveEngine";
import { LESSON_STEPS, BOX_DAYS } from "../src/app/data/curriculum";
import type { ActivityType, LearningSession } from "../src/app/types/session";
import type { LessonKind, QuestionAttempt } from "../src/app/types/levelConfig";

let pass = 0;
let fail = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  if (cond) pass++;
  else fail++;
  console.log(cond ? "  ✓" : "  ✗", name, cond ? "" : extra);
};

const DAY = 86_400_000;
const T0 = Date.parse("2026-10-01T10:00:00Z");
const ask = (target: string, selected = target, q?: number, guided = false): QuestionAttempt => ({
  target_letter: target,
  selected_letter: selected,
  module_type: "similar",
  time_to_interact_ms: guided ? 0 : 3000,
  was_guided_win: guided,
  hover_duration_ms: 0,
  jitter_count: 0,
  ...(q !== undefined ? { q } : {}),
});

let n = 0;
/** A session on `day` (days after T0), with the given activities' answers. */
const session = (
  letter: string,
  day: number,
  lesson: LessonKind | undefined,
  acts: Partial<Record<ActivityType, QuestionAttempt[]>>,
): LearningSession => {
  const at = new Date(T0 + day * DAY + n++ * 60_000).toISOString();
  const base = analyzeLocally({
    user_id: "c", target_alphabet: letter, session_id: "x", session_number: 1,
    avg_latency_ms: 6000, consecutive_fails_peak: 0, attempts: [],
  }).levelConfig;
  return {
    session_id: `s-${n}`,
    user_id: "c",
    letter,
    session_number: 1,
    status: "completed",
    started_at: at,
    ended_at: at,
    level_config: lesson ? { ...base, lesson, steps: [...LESSON_STEPS[lesson]] } : base,
    activities: Object.entries(acts).map(([type, attempts]) => ({
      type: type as ActivityType,
      started_at: at,
      completed_at: at,
      outcome: { kind: "questions" as const, attempts: attempts! },
    })),
    metrics: null,
    cognitive_state: null,
    reasoning: null,
    schema_version: 2,
  };
};
const right = (l: string, k: number) => [...Array(k)].map(() => ask(l));
/** A letter's three lessons, all right, on `day`. */
const whole = (l: string, day: number) => [
  session(l, day, "meet", { identify: right(l, 3) }),
  session(l, day, "find", { identify: right(l, 5) }),
  session(l, day, "words", { word_fill: right(l, 3), word_spelling: right(l, 3) }),
];
/** A lesson on `letter` whose warm-up asks the given answers. */
const warm = (letter: string, day: number, answers: QuestionAttempt[]) =>
  session(letter, day, "find", { warmup: answers, identify: right(letter, 5) });

console.log("\n-- first answers --");
ok("numbered: a retry shares the question's number",
  firstAnswers([ask("क", "ख", 0), ask("क", "क", 0), ask("ल", "ल", 1)]).length === 2);
ok("numbered: two questions on one letter stay two",
  firstAnswers([ask("क", "क", 0), ask("क", "क", 1)]).length === 2);
ok("unnumbered (before G2): the next answer on the same letter is the retry",
  firstAnswers([ask("क", "ख"), ask("क", "क"), ask("ल")]).length === 2);

console.log("\n-- boxes --");
{
  const b = reviewBoxes(whole("क", 0));
  ok("a letter enters box 1 when In words completes it", b["क"]?.box === 1);
  ok("due a day later", b["क"].dueAt - b["क"].lastAt === BOX_DAYS[0] * DAY);
  ok("Meet and Find it alone do not put it in review", reviewBoxes(whole("ल", 0).slice(0, 2))["ल"] === undefined);
  ok("a session from before lessons completes it too", reviewBoxes([session("र", 0, undefined, { identify: right("र", 5) })])["र"]?.box === 1);
}
{
  const s = [...whole("क", 0), warm("ल", 1, [ask("क", "क", 0)]), warm("ल", 3, [ask("क", "क", 0)])];
  const b = reviewBoxes(s);
  ok("right without help moves it up a box each time", b["क"].box === 3, String(b["क"].box));
  ok("and pushes the next review out (box 3: 4 days)", b["क"].dueAt - b["क"].lastAt === 4 * DAY);
  const miss = reviewBoxes([...s, warm("ल", 7, [ask("क", "ख", 0), ask("क", "क", 0)])]);
  ok("a wrong first answer sends it back to box 1, whatever the retry", miss["क"].box === 1);
  const helped = reviewBoxes([...s, warm("ल", 7, [ask("क", "क", 0, true)])]);
  ok("so does an answer the app supplied", helped["क"].box === 1);
  ok("never above box 5", reviewBoxes([...whole("क", 0), ...[1, 2, 3, 4, 5, 6, 7].map((d) => warm("ल", d, [ask("क", "क", 0)]))])["क"].box === 5);
}
{
  // A letter lesson's own questions are teaching, not review.
  const s = [...whole("क", 0), session("क", 1, "find", { identify: [ask("क", "ख", 0), ask("क", "ख", 1)] })];
  ok("a letter's own lesson does not move its box", reviewBoxes(s)["क"].box === 1);
  const own = session("क", 1, "find", { identify: [ask("क", "क", 0), ask("ब", "ब", 4)] });
  ok("but its check question (another letter) is review", reviewAnswers(own).map((a) => a.target_letter).join() === "ब");
}

console.log("\n-- what a warm-up asks --");
{
  const s = [...whole("क", 0), ...whole("ल", 0), ...whole("र", 0), warm("ज", 1, [ask("ल", "ल", 0)])];
  const statuses = letterStatuses(s);
  const order = reviewOrder(reviewBoxes(s), statuses, T0 + 2 * DAY);
  ok("due letters first, the most overdue first; one just reviewed last", order.join() === "क,र,ल", order.join());
  const p = buildLearnerProfile(s, "device", [], T0 + 2 * DAY);
  ok("the profile carries it", p.reviewOrder.join() === "क,र,ल");
  const plan = planSession("c", "ज", p, [], "find").levelConfig;
  ok("a lesson opens with two warm-up questions", plan.steps?.[0] === "warmup" && plan.warmup?.length === 2);
  ok("on the two most due letters", plan.warmup?.map((q) => q.target).join() === "क,र");
  ok("never offering the letter as its own wrong choice", plan.warmup!.every((q) => !q.pool.includes(q.target)));
  ok("with no dot until the child hesitates", plan.warmup!.every((q) => q.aid === "static"));
  ok("never on the lesson's own letter", planSession("c", "क", p, [], "find").levelConfig.warmup!.every((q) => q.target !== "क"));
}
{
  // A child at "learning the shape" on one letter: it is asked before others.
  // Among different shapes, as the early stages ask.
  const shape = (picked: string, q: number) => ({ ...ask("म", picked, q), module_type: "dissimilar" as const });
  const shaky = [
    session("म", 0, "meet", { identify: [shape("ल", 0), shape("ल", 1), shape("म", 2)] }),
    session("म", 0, "find", { identify: [shape("ल", 0), shape("ल", 1), shape("म", 2), shape("म", 3), shape("म", 4)] }),
    session("म", 0, "words", { word_fill: right("म", 3), word_spelling: right("म", 3) }),
  ];
  const s = [...whole("क", 0), ...shaky];
  const statuses = letterStatuses(s);
  ok("(म is at learning the shape)", statuses["म"].state === "gross_shape_blindness", statuses["म"].state);
  const order = reviewOrder(reviewBoxes(s), statuses, T0 + 2 * DAY);
  ok("letters still learning the shape come first", order[0] === "म", order.join());
  const p = buildLearnerProfile(s, "device", [], T0 + 2 * DAY);
  const q = planSession("c", "ज", p, [], "find").levelConfig.warmup!.find((x) => x.target === "म")!;
  ok("and are asked among different shapes", q.module === "dissimilar", q.pool.join(" "));
}

console.log("\n-- review never judges a stage --");
{
  const s = [...whole("क", 0), ...whole("क", 1)];
  ok("(क is mastered: right on two days)", letterStatuses(s)["क"].mastered);
  const missed = [...s, warm("ल", 2, [ask("क", "ख", 0)]), warm("ल", 3, [ask("क", "ख", 0)])];
  const st = letterStatuses(missed)["क"];
  ok("missing क in two warm-ups leaves it mastered", st.mastered);
  ok("warm-up answers on another letter are not check answers", st.state === "visual_mastery");
  const pickedK = [...s, warm("ल", 2, [ask("ख", "क", 0)]), warm("ल", 3, [ask("ख", "क", 0)])];
  ok("but picking a mastered क by mistake in warm-ups earns it a check", letterStatuses(pickedK)["क"].checkDue);
  const ownWarm = letterStatuses([...whole("ल", 0), warm("ल", 1, [ask("र", "ल", 0)])])["ल"];
  ok("and a warm-up never counts toward its lesson's own letter", ownWarm.errorRate === 0);
}

console.log("\n-- mastered once --");
{
  const once = letterStatuses(whole("क", 0))["क"];
  ok("one day of mastery is 80 roadmap points, short of the trophy", once.masteredOnce && completionScore(once) === 80);
  ok("two days are 100", completionScore(letterStatuses([...whole("क", 0), ...whole("क", 1)])["क"]) === 100);
}

console.log(`\nRESULT ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
