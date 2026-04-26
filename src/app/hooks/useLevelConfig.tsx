import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { FALLBACK_LEVEL_CONFIG } from "../api/client";
import { LETTER_SEQUENCE } from "../types/levelConfig";
import type { LevelConfig } from "../types/levelConfig";

interface LevelConfigContextValue {
  levelConfig: LevelConfig;
  setLevelConfig: (config: LevelConfig) => void;
  sessionNumber: number;
  incrementSessionNumber: () => void;
  letterIndex: number;
  advanceLetter: () => void;
  jumpToLetterIndex: (index: number) => void;
  currentLetter: string;
  nextLetter: string | null;
  lastAvgLatencyMs: number;
  setLastAvgLatencyMs: (ms: number) => void;
}

const LevelConfigContext = createContext<LevelConfigContextValue | undefined>(
  undefined,
);

export function LevelConfigProvider({ children }: { children: ReactNode }) {
  const [levelConfig, setLevelConfig] =
    useState<LevelConfig>(FALLBACK_LEVEL_CONFIG);
  const [sessionNumber, setSessionNumber] = useState<number>(1);
  const [letterIndex, setLetterIndex] = useState<number>(0);
  const [lastAvgLatencyMs, setLastAvgLatencyMs] = useState<number>(6000);

  const incrementSessionNumber = () => {
    setSessionNumber((current) => current + 1);
  };

  const advanceLetter = () => {
    setLetterIndex((i) => Math.min(i + 1, LETTER_SEQUENCE.length - 1));
    setSessionNumber(1);
  };

  const jumpToLetterIndex = (index: number) => {
    setLetterIndex(Math.min(index, LETTER_SEQUENCE.length - 1));
    setSessionNumber(1);
  };

  const currentLetter = LETTER_SEQUENCE[letterIndex];
  const nextLetter =
    letterIndex < LETTER_SEQUENCE.length - 1
      ? LETTER_SEQUENCE[letterIndex + 1]
      : null;

  const value = useMemo(
    () => ({
      levelConfig,
      setLevelConfig,
      sessionNumber,
      incrementSessionNumber,
      letterIndex,
      advanceLetter,
      jumpToLetterIndex,
      currentLetter,
      nextLetter,
      lastAvgLatencyMs,
      setLastAvgLatencyMs,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [levelConfig, sessionNumber, letterIndex, currentLetter, nextLetter, lastAvgLatencyMs, jumpToLetterIndex],
  );

  return (
    <LevelConfigContext.Provider value={value}>
      {children}
    </LevelConfigContext.Provider>
  );
}

export function useLevelConfig(): LevelConfigContextValue {
  const context = useContext(LevelConfigContext);
  if (!context) {
    throw new Error("useLevelConfig must be used within LevelConfigProvider");
  }
  return context;
}
