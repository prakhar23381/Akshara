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
  CHECK_AFTER_PICKS,
} from "../src/app/lib/letterStatus";
import { analyzeLocally } from "../src/app/lib/adaptiveEngine";
import type { LearningSession } from "../src/app/types/session";
import type { CognitiveState, QuestionAttempt } from "../src/app/types/levelConfig";

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
  clock += 3600_000;
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
  ok("and a saved 'still learning' with all answers right is mastered", st.mastered);
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
  const st = letterStatuses([session("क", right("क")), pickK()])["क"];
  ok(`one mistaken pick: no check (needs ${CHECK_AFTER_PICKS})`, st.mastered && !st.checkDue);
  const twice = letterStatuses([session("क", right("क")), pickK(), pickK()]);
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
  const st = letterStatuses([session("क", right("क")), supplied, supplied])["क"];
  ok("an answer the app supplied is no mix-up", !st.checkDue);
}
{
  const word = session("ब", [ask("ब", "का"), ...right("ब", 9)]);
  const st = letterStatuses([session("क", right("क")), word, { ...word, session_id: "w2" }])["क"];
  ok("a matra or word picked is no mix-up", !st.checkDue);
}

console.log("\n-- the check question --");
{
  const st = letterStatuses([session("क", right("क")), pickK(), pickK(), checkK(ask("क", "क"))])["क"];
  ok("right first time: still mastered", st.mastered);
  ok("and the mix-ups are settled", !st.checkDue && Object.keys(st.pickedFor).length === 0);
}
{
  const st = letterStatuses([session("क", right("क")), pickK(), pickK(), checkK(ask("क", "ब"), ask("क", "क"))])["क"];
  ok("wrong first time — even with the retry right — back to still learning", !st.mastered && st.state === "feature_neglect", st.state);
  ok("which is 60 roadmap points, not 0", completionScore(st) === 60);
}
{
  const st = letterStatuses([session("क", right("क")), pickK(), pickK(), checkK(ask("क", "क", true))])["क"];
  ok("answered by the app: back to still learning", !st.mastered);
}
{
  const s = [session("क", right("क")), pickK(), pickK(), checkK(ask("क", "ब")), session("क", right("क"))];
  ok("one good session on क earns it back", letterStatuses(s)["क"].mastered);
}
{
  const s = [session("क", right("क")), pickK(), pickK(), checkK(ask("क", "ब"))];
  ok("the check is not evidence against ब", letterStatuses(s)["ब"].mastered);
}
{
  // A check answered before the child quit the session still counts. (Built in
  // order: each session() is an hour after the one before.)
  const s = [session("क", right("क")), pickK(), pickK()];
  s.push(session("ब", [...right("ब", 4), ask("क", "ब")], { status: "abandoned" }));
  ok("a check in an abandoned session still counts", !letterStatuses(s)["क"].mastered);
}

console.log("\n-- the roadmap --");
{
  const page1 = pageLetters(0);
  const allMastered = page1.map((l) => session(l, right(l)));
  const open = letterStatuses(allMastered);
  ok("page 2 opens when page 1 averages 75%", pageOpen(1, open));

  // Re-judged: seven of page 1's letters had 5 of 11 answers supplied, so they
  // score 60, not 100 — an average of 72%.
  const flattered = page1.map((l, i) =>
    i < 7 ? session(l, [...right(l, 6), ...[...Array(5)].map(() => ask(l, l, true))]) : session(l, right(l)),
  );
  const shut = letterStatuses(flattered);
  ok("a corrected page 1 no longer opens page 2 by itself", !pageOpen(1, shut));
  const played = letterStatuses([...flattered, session(pageLetters(1)[0], [ask(pageLetters(1)[0], "ल")], { status: "abandoned" })]);
  ok("but a page the child has played on stays open", pageOpen(1, played));
  ok("page 1 is always open", pageOpen(0, {}));
}

console.log(`\nRESULT ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
