import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { v4 as uuidv4 } from "uuid";
import type { LevelConfig, QuestionAttempt } from "../types/levelConfig";
import {
  nextStep,
  sessionAttempts,
  sessionProgressPct,
  type ActivityOutcome,
  type ActivityRecord,
  type ActivityType,
  type LearningSession,
} from "../types/session";
import { computeSessionMetrics } from "../lib/sessionMetrics";
import {
  getActiveSessionId,
  loadSession,
  setActiveSessionId,
  sweepStaleSessions,
  upsertSession,
} from "../lib/sessionStore";
import { analyzeSession } from "../api/client";

interface SessionContextValue {
  session: LearningSession | null;
  /** The activity the child should be on: the first one not yet completed. */
  currentStep: ActivityType | null;
  progressPct: number;

  startSession(args: {
    userId: string;
    letter: string;
    sessionNumber: number;
    levelConfig: LevelConfig;
  }): LearningSession;

  beginActivity(type: ActivityType): void;
  /** Omit `outcome` for question activities — attempts are already recorded. */
  completeActivity(type: ActivityType, outcome?: ActivityOutcome): void;
  recordAttempt(type: ActivityType, attempt: QuestionAttempt): void;

  endSession(): Promise<{
    letterMastered: boolean;
    nextConfig: LevelConfig | null;
  }>;
  abandonSession(): void;
}

const Ctx = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<LearningSession | null>(null);

  // The committed session, used by callbacks so rapid successive updates
  // (a run of answers) never read stale React state.
  const ref = useRef<LearningSession | null>(null);
  const commit = useCallback((next: LearningSession | null) => {
    ref.current = next;
    setSession(next);
    if (next) upsertSession(next);
  }, []);

  // Resume on boot, after closing out anything left open from a previous visit.
  useEffect(() => {
    sweepStaleSessions();
    const id = getActiveSessionId();
    if (!id) return;
    const restored = loadSession(id);
    if (restored && restored.status === "in_progress") {
      ref.current = restored;
      setSession(restored);
    } else {
      setActiveSessionId(null);
    }
  }, []);

  const startSession: SessionContextValue["startSession"] = useCallback(
    ({ userId, letter, sessionNumber, levelConfig }) => {
      // The id is minted here — before the first activity — rather than lazily
      // inside the sixth screen, which is why the earlier activities used to be
      // recorded against nothing.
      const fresh: LearningSession = {
        session_id: uuidv4(),
        user_id: userId,
        letter,
        session_number: sessionNumber,
        status: "in_progress",
        started_at: new Date().toISOString(),
        ended_at: null,
        level_config: levelConfig,
        activities: [],
        metrics: null,
        cognitive_state: null,
        reasoning: null,
        schema_version: 2,
      };
      setActiveSessionId(fresh.session_id);
      commit(fresh);
      return fresh;
    },
    [commit],
  );

  const upsertActivity = useCallback(
    (type: ActivityType, patch: Partial<ActivityRecord>) => {
      const current = ref.current;
      if (!current) return;
      const activities = [...current.activities];
      const i = activities.findIndex((a) => a.type === type);
      if (i >= 0) {
        activities[i] = { ...activities[i], ...patch };
      } else {
        activities.push({
          type,
          started_at: new Date().toISOString(),
          completed_at: null,
          outcome: null,
          ...patch,
        });
      }
      commit({ ...current, activities });
    },
    [commit],
  );

  const beginActivity = useCallback(
    (type: ActivityType) => {
      const current = ref.current;
      if (!current) return;
      // Re-entering a step (a replay) must not reset the original start time.
      if (current.activities.some((a) => a.type === type)) return;
      upsertActivity(type, { started_at: new Date().toISOString() });
    },
    [upsertActivity],
  );

  const completeActivity = useCallback(
    (type: ActivityType, outcome?: ActivityOutcome) => {
      // Question activities accumulate their outcome through recordAttempt as
      // the child answers, so completing must not overwrite it with nothing.
      upsertActivity(type, {
        completed_at: new Date().toISOString(),
        ...(outcome ? { outcome } : {}),
      });
    },
    [upsertActivity],
  );

  const recordAttempt = useCallback(
    (type: ActivityType, attempt: QuestionAttempt) => {
      const current = ref.current;
      if (!current) return;
      const activities = [...current.activities];
      const i = activities.findIndex((a) => a.type === type);
      const existing =
        i >= 0 && activities[i].outcome?.kind === "questions"
          ? (activities[i].outcome as { kind: "questions"; attempts: QuestionAttempt[] })
              .attempts
          : [];
      const outcome: ActivityOutcome = {
        kind: "questions",
        attempts: [...existing, attempt],
      };
      if (i >= 0) activities[i] = { ...activities[i], outcome };
      else
        activities.push({
          type,
          started_at: new Date().toISOString(),
          completed_at: null,
          outcome,
        });
      commit({ ...current, activities });
    },
    [commit],
  );

  const endSession: SessionContextValue["endSession"] = useCallback(async () => {
    const current = ref.current;
    if (!current) return { letterMastered: false, nextConfig: null };

    const attempts = sessionAttempts(current);
    const metrics = computeSessionMetrics(attempts);
    const latencies = attempts
      .filter((a) => !a.was_guided_win && a.time_to_interact_ms > 0)
      .map((a) => a.time_to_interact_ms);

    // One analysis call for the whole session, carrying every attempt from
    // every assessed activity, rather than one call per screen.
    const response = await analyzeSession({
      user_id: current.user_id,
      target_alphabet: current.letter,
      session_id: current.session_id,
      session_number: current.session_number,
      avg_latency_ms:
        latencies.length > 0
          ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
          : 0,
      consecutive_fails_peak: peakConsecutiveFails(attempts),
      attempts,
    });

    const closed: LearningSession = {
      ...current,
      status: "completed",
      ended_at: new Date().toISOString(),
      metrics,
      cognitive_state: response.debug.cognitive_state,
      reasoning: response.level_config.reasoning,
    };
    commit(closed);
    setActiveSessionId(null);

    return {
      letterMastered: response.letter_mastered ?? false,
      nextConfig: response.level_config,
    };
  }, [commit]);

  const abandonSession = useCallback(() => {
    const current = ref.current;
    if (!current || current.status !== "in_progress") return;
    // Keep whatever was collected: dropping out partway is itself a signal.
    commit({
      ...current,
      status: "abandoned",
      ended_at: new Date().toISOString(),
      metrics: computeSessionMetrics(sessionAttempts(current)),
    });
    setActiveSessionId(null);
  }, [commit]);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      currentStep: session ? nextStep(session) : null,
      progressPct: session ? sessionProgressPct(session) : 0,
      startSession,
      beginActivity,
      completeActivity,
      recordAttempt,
      endSession,
      abandonSession,
    }),
    [
      session,
      startSession,
      beginActivity,
      completeActivity,
      recordAttempt,
      endSession,
      abandonSession,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function peakConsecutiveFails(attempts: QuestionAttempt[]): number {
  let run = 0;
  let peak = 0;
  attempts.forEach((a) => {
    if (a.was_guided_win) run = 0;
    else if (a.target_letter !== a.selected_letter) {
      run += 1;
      peak = Math.max(peak, run);
    } else run = 0;
  });
  return peak;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
