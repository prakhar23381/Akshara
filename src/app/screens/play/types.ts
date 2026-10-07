import type { LevelConfig } from "../../types/levelConfig";
import type { ActivityOutcome } from "../../types/session";

/**
 * Every activity has the same shape: it is handed the letter and the config,
 * and reports an outcome when it is finished. No activity knows which activity
 * comes next — that is the step machine's job, derived from the level config.
 */
export interface StepProps {
  letter: string;
  levelConfig: LevelConfig;
  /** Omit the outcome for question activities — attempts are recorded live. */
  onComplete: (outcome?: ActivityOutcome) => void;
}
