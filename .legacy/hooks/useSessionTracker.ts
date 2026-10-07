import { useCallback, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import { analyzeSession } from "../api/client";
import type {
  AnalyzeSessionResponse,
  ModuleType,
  QuestionAttempt,
  SessionPayload,
} from "../types/levelConfig";

interface AttemptInput {
  targetLetter: string;
  selectedLetter: string;
  moduleType: ModuleType;
  timeToInteractMs?: number;
  wasGuidedWin?: boolean;
  hoverDurationMs?: number;
  jitterCount?: number;
}

interface UseSessionTrackerOptions {
  userId: string;
  targetAlphabet: string;
  sessionNumber: number;
}

interface TrackerState {
  sessionId: string;
  attempts: QuestionAttempt[];
  consecutiveFails: number;
  consecutiveFailsPeak: number;
  audioEndTime: number | null;
}

const trackerStateByKey = new Map<string, TrackerState>();

function buildTrackerKey(options: UseSessionTrackerOptions): string {
  return `${options.userId}::${options.targetAlphabet}::${options.sessionNumber}`;
}

function getOrCreateTrackerState(key: string): TrackerState {
  const existing = trackerStateByKey.get(key);
  if (existing) {
    return existing;
  }

  const freshState: TrackerState = {
    sessionId: uuidv4(),
    attempts: [],
    consecutiveFails: 0,
    consecutiveFailsPeak: 0,
    audioEndTime: null,
  };

  trackerStateByKey.set(key, freshState);
  return freshState;
}

export function useSessionTracker({
  userId,
  targetAlphabet,
  sessionNumber,
}: UseSessionTrackerOptions) {
  const trackerKey = useMemo(
    () => buildTrackerKey({ userId, targetAlphabet, sessionNumber }),
    [userId, targetAlphabet, sessionNumber],
  );

  const trackerState = useMemo(
    () => getOrCreateTrackerState(trackerKey),
    [trackerKey],
  );

  const markAudioEnd = useCallback((): number => {
    const now = performance.now();
    trackerState.audioEndTime = now;
    return now;
  }, [trackerState]);

  const recordAttempt = useCallback(
    (input: AttemptInput) => {
      const computedLatency =
        typeof input.timeToInteractMs === "number"
          ? input.timeToInteractMs
          : trackerState.audioEndTime != null
            ? performance.now() - trackerState.audioEndTime
            : 0;

      const attempt: QuestionAttempt = {
        target_letter: input.targetLetter,
        selected_letter: input.selectedLetter,
        module_type: input.moduleType,
        time_to_interact_ms: Math.max(0, Math.round(computedLatency)),
        was_guided_win: input.wasGuidedWin ?? false,
        hover_duration_ms: input.hoverDurationMs ?? 0,
        jitter_count: input.jitterCount ?? 0,
      };

      trackerState.attempts.push(attempt);

      if (attempt.was_guided_win) {
        trackerState.consecutiveFails = 0;
      } else if (input.targetLetter !== input.selectedLetter) {
        trackerState.consecutiveFails += 1;
        if (trackerState.consecutiveFails > trackerState.consecutiveFailsPeak) {
          trackerState.consecutiveFailsPeak = trackerState.consecutiveFails;
        }
      } else {
        trackerState.consecutiveFails = 0;
      }

      trackerState.audioEndTime = null;
    },
    [trackerState],
  );

  const recordGuidedWin = useCallback(
    (targetLetter: string, moduleType: ModuleType) => {
      recordAttempt({
        targetLetter,
        selectedLetter: targetLetter,
        moduleType,
        timeToInteractMs: 0,
        wasGuidedWin: true,
      });
      trackerState.consecutiveFails = 0;
    },
    [recordAttempt, trackerState],
  );

  const getConsecutiveFails = useCallback(
    () => trackerState.consecutiveFails,
    [trackerState],
  );

  const endLevel = useCallback(async (): Promise<AnalyzeSessionResponse> => {
    const latencies = trackerState.attempts
      .map((attempt) => attempt.time_to_interact_ms)
      .filter((latency) => latency > 0);

    const avgLatency =
      latencies.length > 0
        ? latencies.reduce((sum, latency) => sum + latency, 0) / latencies.length
        : 0;

    const payload: SessionPayload = {
      user_id: userId,
      target_alphabet: targetAlphabet,
      session_id: trackerState.sessionId,
      session_number: sessionNumber,
      avg_latency_ms: Math.round(avgLatency),
      consecutive_fails_peak: trackerState.consecutiveFailsPeak,
      attempts: trackerState.attempts,
    };

    const response = await analyzeSession(payload);
    trackerStateByKey.delete(trackerKey);

    return response;
  }, [sessionNumber, targetAlphabet, trackerKey, trackerState, userId]);

  return {
    attempts: trackerState.attempts,
    markAudioEnd,
    recordAttempt,
    recordGuidedWin,
    getConsecutiveFails,
    endLevel,
  };
}
