/**
 * A letter's status is judged from the child's answers on every read (E2,
 * option c), and a mix-up counts for both letters (E3): a mastered letter the
 * child keeps picking by mistake is asked for once more, and only failing that
 * question takes mastery away. These checks pin both, and the roadmap rule that
 * a page the child has played on never closes again.
 */
import {
  letterStatuses,
  checksDue,
  completionScore,
  pageOpen,
  pageLetters,
  TOTAL_PAGES,
  CHECK_AFTER_PICKS,
} from "../src/app/lib/letterStatus";
import { LESSON_STEPS, UNITS } from "../src/app/data/curriculum";
import { analyzeLocally } from "../src/app/lib/adaptiveEngine";
import type { LearningSession } from "../src/app/types/session";
import type { CognitiveState, LessonKind, QuestionAttempt } from "../src/app/types/levelConfig";

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

const ask = (target: string, selected: string, guided = false): QuestionAttempt => ({
  target_letter: target,
  selected_letter: selected,
  module_type: "similar",
  time_to_interact_ms: guided ? 0 : 3000,
  was_guided_win: guided,
  hover_duration_ms: 0,
  jitter_count: 0,
});
const right = (letter: string, n = 10) => [...Array(n)].map(() => ask(letter, letter));

let clock = Date.parse("2026-10-01T10:00:00Z");
const session = (
  letter: string,
  attempts: QuestionAttempt[],
  opts: { status?: LearningSession["status"]; saved?: CognitiveState } = {},
): LearningSession => {
  // A day apart, so two sessions are two days (G2: mastery must hold on two).
  clock += 25 * 3600_000;
  return {
    session_id: `s-${clock}`,
    user_id: "child",
    letter,
    session_number: 1,
    status: opts.status ?? "completed",
    started_at: new Date(clock).toISOString(),
    ended_at: new Date(clock + 600_000).toISOString(),
    level_config: analyzeLocally({
      user_id: "child",
      target_alphabet: letter,
      session_id: "x",
      session_number: 1,
      avg_latency_ms: 6000,
      consecutive_fails_peak: 0,
      attempts: [],
    }).levelConfig,
    activities: [
      {
        type: "identify",
        started_at: new Date(clock).toISOString(),
        completed_at: new Date(clock + 600_000).toISOString(),
        outcome: { kind: "questions", attempts },
      },
    ],
    metrics: null,
    // The label saved at the time — which statuses must not trust.
    cognitive_state: opts.saved ?? "visual_mastery",
    reasoning: null,
    schema_version: 2,
  };
};

/** A letter mastered: right throughout, on two different days. */
const twoDays = (letter: string) => [session(letter, right(letter)), session(letter, right(letter))];

/** A ब session in which the child taps क once by mistake. */
const pickK = () => session("ब", [ask("ब", "क"), ...right("ब", 9)]);
/** A ब session whose last Listen & tap question asks for क. */
const checkK = (...answers: QuestionAttempt[]) => session("ब", [...right("ब", 9), ...answers]);

console.log("-- judged from the answers, not the saved label --");
{
  const supplied = [...right("ग", 7), ...[...Array(4)].map(() => ask("ग", "ग", true))];
  const st = letterStatuses([session("ग", supplied, { saved: "visual_mastery" })])["ग"];
  ok("4 supplied answers of 11 are not mastery, whatever was saved", !st.mastered && st.state === "feature_neglect", st.state);
  ok("the letter is judged", st.judged);
}
{
  const st = letterStatuses([session("घ", right("घ"), { saved: "feature_neglect" })])["घ"];
  ok("and a saved 'still learning' with all answers right is mastered once", st.masteredOnce && !st.mastered && st.state === "visual_mastery");
}
{
  const s = letterStatuses([session("ङ", [ask("ङ", "ड")], { status: "abandoned" })])["ङ"];
  ok("an abandoned session is played but never judged", s.sessions === 1 && !s.judged && s.state === "insufficient_data");
}
{
  const saved = [{ letter: "च", mastered: true, last_cognitive_state: "visual_mastery", sessions_count: 4 }];
  const only = letterStatuses([], saved)["च"];
  ok("a letter with only a saved row keeps its label", only.mastered && only.judged && only.sessions === 4);
  const answered = letterStatuses([session("च", [ask("च", "छ"), ask("च", "छ"), ...right("च", 3)])], saved)["च"];
  ok("answers override a saved row", !answered.mastered && answered.state === "feature_neglect", answered.state);
  ok("the saved count still counts", answered.sessions === 4);
}

console.log("\n-- a mix-up earns a check, it never takes mastery away --");
{
  const st = letterStatuses([...twoDays("क"), pickK()])["क"];
  ok(`one mistaken pick: no check (needs ${CHECK_AFTER_PICKS})`, st.mastered && !st.checkDue);
  const twice = letterStatuses([...twoDays("क"), pickK(), pickK()]);
  ok("two: a check is due", twice["क"].checkDue);
  ok("and क is still mastered", twice["क"].mastered);
  ok("recorded against the letter asked for", twice["क"].pickedFor["ब"] === 2);
  const due = checksDue(twice);
  ok("checksDue lists it, with the letter it was picked for", due[0]?.letter === "क" && due[0]?.pickedFor[0] === "ब", JSON.stringify(due));
  ok("and the same tap is a miss in ब's own session (1 of 10: not mastered)", !twice["ब"].mastered && twice["ब"].state === "feature_neglect", twice["ब"].state);
}
{
  const st = letterStatuses([session("क", [ask("क", "ख"), ask("क", "ख"), ...right("क", 3)]), pickK(), pickK()])["क"];
  ok("picks of a letter not yet mastered earn nothing", !st.checkDue && Object.keys(st.pickedFor).length === 0);
}
{
  const supplied = session("ब", [ask("ब", "क", true), ...right("ब", 9)]);
  const st = letterStatuses([...twoDays("क"), supplied, supplied])["क"];
  ok("an answer the app supplied is no mix-up", !st.checkDue);
}
{
  const word = session("ब", [ask("ब", "का"), ...right("ब", 9)]);
  const st = letterStatuses([...twoDays("क"), word, { ...word, session_id: "w2" }])["क"];
  ok("a matra or word picked is no mix-up", !st.checkDue);
}

console.log("\n-- the check question --");
{
  const st = letterStatuses([...twoDays("क"), pickK(), pickK(), checkK(ask("क", "क"))])["क"];
  ok("right first time: still mastered", st.mastered);
  ok("and the mix-ups are settled", !st.checkDue && Object.keys(st.pickedFor).length === 0);
}
{
  const st = letterStatuses([...twoDays("क"), pickK(), pickK(), checkK(ask("क", "ब"), ask("क", "क"))])["क"];
  ok("wrong first time — even with the retry right — back to still learning", !st.mastered && st.state === "feature_neglect", st.state);
  ok("which is 60 roadmap points, not 0", completionScore(st) === 60);
}
{
  const st = letterStatuses([...twoDays("क"), pickK(), pickK(), checkK(ask("क", "क", true))])["क"];
  ok("answered by the app: back to still learning", !st.mastered);
}
{
  const s = [...twoDays("क"), pickK(), pickK(), checkK(ask("क", "ब")), session("क", right("क"))];
  ok("one good session on क makes it mastered once again", letterStatuses(s)["क"].masteredOnce);
  ok("and a second, another day, earns it back", letterStatuses([...s, session("क", right("क"))])["क"].mastered);
}
{
  const s = [...twoDays("क"), pickK(), pickK(), checkK(ask("क", "ब"))];
  ok("the check is not evidence against ब", letterStatuses(s)["ब"].state === "visual_mastery");
}
{
  // A check answered before the child quit the session still counts. (Built in
  // order: each session() is an hour after the one before.)
  const s = [...twoDays("क"), pickK(), pickK()];
  s.push(session("ब", [...right("ब", 4), ask("क", "ब")], { status: "abandoned" }));
  ok("a check in an abandoned session still counts", !letterStatuses(s)["क"].mastered);
}

// ── Lessons (G1) ─────────────────────────────────────────────────────────────

/** One lesson on a letter: its Listen & tap answers and/or its word-game answers. */
const lesson = (
  letter: string,
  kind: LessonKind,
  answers: { heard?: QuestionAttempt[]; inWords?: QuestionAttempt[] },
  status: LearningSession["status"] = "completed",
): LearningSession => {
  const base = session(letter, [], { status });
  const at = base.started_at;
  const act = (type: "identify" | "word_fill", attempts: QuestionAttempt[]) => ({
    type,
    started_at: at,
    completed_at: at,
    outcome: { kind: "questions" as const, attempts },
  });
  return {
    ...base,
    level_config: { ...base.level_config, lesson: kind, steps: [...LESSON_STEPS[kind]] },
    activities: [
      ...(answers.heard ? [act("identify", answers.heard)] : []),
      ...(answers.inWords ? [act("word_fill", answers.inWords)] : []),
    ],
  };
};
const shape = (letter: string, picked = letter): QuestionAttempt => ({ ...ask(letter, picked), module_type: "dissimilar" });
const meet = (l: string, misses = 0) =>
  lesson(l, "meet", { heard: [...Array(3)].map((_, i) => shape(l, i < misses ? "ल" : l)) });
const find = (l: string, misses = 0) =>
  lesson(l, "find", { heard: [...Array(5)].map((_, i) => ask(l, i < misses ? "ख" : l)) });
const words = (l: string, misses = 0) =>
  lesson(l, "words", { inWords: [...Array(6)].map((_, i) => ask(l, i < misses ? "ख" : l)) });

console.log("\n-- a letter's three lessons --");
{
  ok("a letter never played starts at Meet", letterStatuses([meet("ल")])["क"] === undefined);
  const afterMeet = letterStatuses([meet("क")])["क"];
  ok("after Meet comes Find it", afterMeet.nextLesson === "find" && afterMeet.lessons.meet && !afterMeet.complete);
  ok("a clean Meet reads as learning the fine detail", afterMeet.state === "feature_neglect", afterMeet.state);
  ok("one miss in Meet's three reads as learning the shape", letterStatuses([meet("क", 1)])["क"].state === "gross_shape_blindness");

  const afterFind = letterStatuses([meet("क"), find("क")])["क"];
  ok("after Find it comes In words", afterFind.nextLesson === "words" && !afterFind.complete);
  ok("a clean Find it alone is not mastery", !afterFind.mastered && afterFind.state === "feature_neglect", afterFind.state);

  const done = letterStatuses([meet("क"), find("क"), words("क")])["क"];
  ok("In words completes the letter", done.complete && done.lessons.words);
  ok("clean Find it and In words together are mastery — once, on one day", done.masteredOnce && !done.mastered);
  const later = letterStatuses([meet("क"), find("क"), words("क"), find("क")])["क"];
  ok("mastered once a later day agrees", later.mastered && !later.masteredOnce);
  ok("a complete letter goes back to Find it, never Meet", done.nextLesson === "find");
  ok("its miss rate is over both lessons", done.errorRate === 0);

  const again = letterStatuses([meet("क"), find("क"), words("क"), find("क")])["क"];
  ok("then In words again", again.nextLesson === "words" && again.complete);

  const quit = letterStatuses([meet("क"), lesson("क", "find", { heard: [ask("क", "ख")] }, "abandoned")])["क"];
  ok("a lesson the child left is offered again", quit.nextLesson === "find" && !quit.lessons.find);
}
{
  // The pooled judgement: 11 answers, as when one session held every game.
  const oneMiss = letterStatuses([meet("क"), find("क", 1), words("क")])["क"];
  ok("one miss in eleven is still mastery (9%)", oneMiss.state === "visual_mastery", String(oneMiss.errorRate));
  const twoMisses = letterStatuses([meet("क"), find("क", 1), words("क", 1)])["क"];
  ok("two in eleven is not (18%)", !twoMisses.mastered && twoMisses.state === "feature_neglect");

  // A clean word lesson must not erase a failed Listen & tap.
  const failedFind = letterStatuses([meet("क"), find("क", 3), words("क")])["क"];
  ok("a clean In words does not outweigh a failed Find it", !failedFind.mastered, failedFind.state);
  // Replaying a lesson replaces that lesson's answers, and only those.
  const retried = letterStatuses([meet("क"), find("क", 3), words("क"), find("क")])["क"];
  ok("replaying Find it cleanly replaces its answers", retried.state === "visual_mastery");
  const slipped = letterStatuses([meet("क"), find("क"), words("क"), words("क", 3)])["क"];
  ok("and a poor In words takes mastery away again", !slipped.mastered && slipped.complete);
}
{
  // Sessions from before lessons: every game in one sitting.
  const old = letterStatuses([session("क", right("क"))])["क"];
  ok("a session from before lessons counts as all three", old.complete && old.lessons.meet && old.nextLesson === "find");
  ok("and is judged on itself, as it was — mastered once, under the two-day rule", old.masteredOnce);
  const savedOnly = letterStatuses([], [{ letter: "ग", mastered: true, sessions_count: 2 }])["ग"];
  ok("a letter known only from a saved row is complete", savedOnly.complete && savedOnly.nextLesson === "find");
  // The reward screen saves a row after every lesson; it must not complete the letter.
  const row = letterStatuses([meet("क")], [{ letter: "क", mastered: false, sessions_count: 1 }])["क"];
  ok("a saved row beside lessons does not complete the letter", !row.complete && row.nextLesson === "find");
}

console.log("\n-- the roadmap --");
{
  const page1 = pageLetters(0);
  ok("a page is a unit of the course", page1.join("") === UNITS[0].join("") && TOTAL_PAGES === UNITS.length);
  const whole = (l: string) => [meet(l), find(l, 2), words(l, 2)];
  const finished = letterStatuses(page1.flatMap(whole));
  ok("page 2 opens when every letter on page 1 is complete, however well", pageOpen(1, finished) && !finished[page1[0]].mastered);
  const oneShort = letterStatuses([...page1.slice(1).flatMap(whole), meet(page1[0]), find(page1[0])]);
  ok("one letter short of In words keeps it shut", !pageOpen(1, oneShort));
  const mastery = letterStatuses(page1.map((l) => session(l, right(l))));
  ok("letters played whole before lessons open it too", pageOpen(1, mastery));
  const played = letterStatuses([meet(page1[0]), lesson(pageLetters(1)[0], "meet", { heard: [shape(pageLetters(1)[0], "ल")] }, "abandoned")]);
  ok("a page the child has played on stays open", pageOpen(1, played));
  ok("page 1 is always open", pageOpen(0, {}));
  ok("a page past the last is not open", !pageOpen(TOTAL_PAGES, finished) || pageLetters(TOTAL_PAGES).length === 0);
}

console.log(`\nRESULT ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
