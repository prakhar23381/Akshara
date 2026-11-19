/**
 * The G3 games (docs/12 §7): See & match, Letter hunt, Teach Mitthu — what
 * the planner asks, that their answers never decide a letter's stage, that
 * they count as review and mix-ups, and that the report shows them.
 */
import { hasLetter } from "../src/app/screens/play/steps/LetterHuntStep";
import { planSession, planReview, analyzeLocally, DISTRACTOR_POOLS } from "../src/app/lib/adaptiveEngine";
import { buildLearnerProfile, EMPTY_PROFILE } from "../src/app/lib/learnerProfile";
import { letterStatuses } from "../src/app/lib/letterStatus";
import { reviewBoxes, personalPairs } from "../src/app/lib/review";
import { buildReportModel } from "../src/app/screens/report-v2/model";
import { LESSON_STEPS, SEE_MATCH_QUESTIONS, MITTHU_ITEMS, CONTRAST_SEE_MATCH } from "../src/app/data/curriculum";
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
const T0 = Date.parse("2026-10-01T04:30:00Z");
const ask = (target: string, selected = target, q?: number): QuestionAttempt => ({
  target_letter: target, selected_letter: selected, module_type: "similar",
  time_to_interact_ms: 3000, was_guided_win: false, hover_duration_ms: 0, jitter_count: 0,
  ...(q !== undefined ? { q } : {}),
});
const right = (l: string, k: number) => [...Array(k)].map((_, i) => ask(l, l, i));

let n = 0;
const session = (
  letter: string,
  day: number,
  lesson: LessonKind,
  acts: Partial<Record<ActivityType, QuestionAttempt[]>>,
  focus?: string[],
): LearningSession => {
  const at = new Date(T0 + day * DAY + n++ * 60_000).toISOString();
  const base = analyzeLocally({
    user_id: "c", target_alphabet: letter, session_id: "x", session_number: 1,
    avg_latency_ms: 6000, consecutive_fails_peak: 0, attempts: [],
  }).levelConfig;
  return {
    session_id: `g-${n}`, user_id: "c", letter, session_number: 1, status: "completed",
    started_at: at, ended_at: at,
    level_config: { ...base, lesson, steps: [...LESSON_STEPS[lesson]], ...(focus ? { focus } : {}) },
    activities: Object.entries(acts).map(([type, attempts]) => ({
      type: type as ActivityType, started_at: at, completed_at: at,
      outcome: { kind: "questions" as const, attempts: attempts! },
    })),
    metrics: null, cognitive_state: null, reasoning: null, schema_version: 2,
  };
};
const whole = (l: string, day: number) => [
  session(l, day, "meet", { identify: right(l, 3) }),
  session(l, day, "find", { identify: right(l, 5) }),
  session(l, day, "words", { word_fill: right(l, 3), word_spelling: right(l, 3) }),
];

console.log("\n-- Letter hunt: which aksharas hold the letter --");
ok("as the leading consonant, with a matra", hasLetter("का", "क"));
ok("inside a cluster (the ङ in ङ्गा)", hasLetter("ङ्गा", "ङ"));
ok("not the same consonant with a nukta (ड़ is not ड)", !hasLetter("ड़", "ड"));
ok("not another letter", !hasLetter("ख", "क"));

console.log("\n-- See & match in Find it --");
{
  const find = planSession("c", "म", EMPTY_PROFILE, [], "find").levelConfig;
  ok("Find it has See & match after Listen & tap", find.steps?.join() === "identify,see_match,memory", String(find.steps));
  ok(`${SEE_MATCH_QUESTIONS} questions on the lesson's letter`, find.see_match?.length === SEE_MATCH_QUESTIONS && find.see_match.every((q) => q.target === "म"));
  ok("among its look-alikes, whatever the stage", find.see_match!.every((q) => DISTRACTOR_POOLS["म"].hard.every((l) => q.pool.includes(l))));
  ok("never the letter itself as a wrong choice", find.see_match!.every((q) => !q.pool.includes("म")));
  ok("Meet and In words have none", ["meet", "words"].every((k) => !planSession("c", "म", EMPTY_PROFILE, [], k as LessonKind).levelConfig.see_match));
  ok("In words opens with Letter hunt", planSession("c", "म", EMPTY_PROFILE, [], "words").levelConfig.steps?.[0] === "letter_hunt");
}

console.log("\n-- side by side, by the kind of pair --");
{
  const p = buildLearnerProfile([...whole("क", 0), ...whole("ख", 1)], "device", [], T0 + 3 * DAY);
  const sound = planReview("c", "contrast", ["क", "ख"], p);
  ok("a pair that sounds alike is heard: Listen & tap, Teach Mitthu, Memory", sound.steps?.join() === "identify,teach_mitthu,memory");
  const m = sound.mitthu!;
  ok(`${MITTHU_ITEMS} Mitthu items, on the pair's letters`, m.length === MITTHU_ITEMS && m.every((x) => ["क", "ख"].includes(x.target) && ["क", "ख"].includes(x.shown)));
  ok("half of his guesses are wrong", m.filter((x) => x.shown !== x.target).length === MITTHU_ITEMS / 2);
  const shape = planReview("c", "contrast", ["न", "म"], p);
  ok("a pair that only looks alike is seen: See & match, Memory", shape.steps?.join() === "see_match,memory");
  ok(`${CONTRAST_SEE_MATCH} questions across the pair, the other always a choice`,
    shape.see_match!.length === CONTRAST_SEE_MATCH && shape.see_match!.every((q) => q.confused?.[0] === (q.target === "न" ? "म" : "न")));
  ok("and no Mitthu, no Listen & tap", !shape.mitthu && shape.questions!.length === 0);
}

console.log("\n-- the new games never decide a stage --");
{
  const base = [...whole("क", 0)];
  const before = letterStatuses(base)["क"];
  const noisy = [
    ...base,
    session("क", 1, "find", { see_match: [ask("क", "ख", 0), ask("क", "ख", 1), ask("क", "ख", 2)] }),
    session("क", 1, "words", { letter_hunt: [ask("क", "ख", 0), ask("क", "फ", 1)] }),
  ];
  const after = letterStatuses(noisy)["क"];
  ok("wrong See & match and Letter hunt answers leave the stage where it was", after.state === before.state, `${before.state} → ${after.state}`);
  ok("and its miss rate", after.errorRate === before.errorRate);
  ok("but they are mix-ups: क/ख three times makes a pair to put side by side", personalPairs(noisy).some((x) => x.join("") === "कख"));
}
{
  const s = [...whole("क", 0), ...whole("ख", 0)];
  const c = session("क", 1, "contrast", { identify: [ask("क", "क", 0)], teach_mitthu: [ask("ख", "ख", 0)] }, ["क", "ख"]);
  ok("Teach Mitthu in a lesson side by side moves its letter through review", reviewBoxes([...s, c])["ख"].box === 2);
  const shapeC = session("न", 1, "contrast", { see_match: [ask("म", "म", 0)] }, ["न", "म"]);
  ok("so does See & match there", reviewBoxes([...whole("म", 0), shapeC])["म"].box === 2);
}

console.log("\n-- the report --");
{
  const rows = [
    session("क", 0, "find", { warmup: [ask("ल", "ल", 0)], identify: right("क", 5), see_match: [ask("क", "ख", 0), ask("क", "क", 0), ask("क", "क", 1)] }),
    session("क", 0, "words", { letter_hunt: right("क", 2), word_fill: right("क", 3), word_spelling: right("क", 3) }),
    session("क", 0, "contrast", { identify: [ask("ख", "ख", 0)], teach_mitthu: [ask("क", "ख", 0)] }, ["क", "ख"]),
  ].map((s) => ({ ...s, id: s.session_id }));
  const m = buildReportModel({ rows, progress: [], displayName: "G", source: "device" }, new Date(T0 + 2 * DAY), "all");
  const skill = (id: string) => m.skills.entries.find((e) => e.id === id)!;
  ok("a Seeing skill, from See & match alone", skill("seeing").n === 3 && Math.round(skill("seeing").measure.value!) === 67, JSON.stringify(skill("seeing").measure));
  ok("Sound → letter counts the warm-up and Teach Mitthu", skill("sound").n === 1 + 5 + 1 + 1);
  ok("Words counts Letter hunt", skill("words").n === 2 + 3 + 3);
  ok("hearing, seeing and words are every answer",
    skill("sound").mix!.total + skill("seeing").mix!.total + skill("words").mix!.total === m.skills.mix.total);
  ok("a Teach Mitthu slip is a mix-up of the pair", m.mixups.pairs.some((p) => p.a === "क" && p.b === "ख"));
}

console.log(`\nRESULT ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
