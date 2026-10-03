export interface Point {
  x: number;
  y: number;
}

export interface TracingEvaluationParams {
  guideDots: Point[];
  visitedNodesCount: number;
  targetCells: Set<number>;
  userCells: Set<number>;
  totalDrawnPoints: number;
  strayPointsCount: number;
}

export interface TracingEvaluationResult {
  score: number;
  passed: boolean;
  modelName: "easy" | "strict";
  details: {
    tp: number;
    fp: number;
    fn: number;
    nodeCoveragePct: number;
    gridSimilarityPct: number;
    passingThreshold: number;
  };
}

/**
 * STRICT TRACING MODEL:
 * Designed for high precision stroke validation.
 * Uses 10x10 fine spatial grid, heavy penalties for stray lines (FP weight 1.5x),
 * and requires 75% accuracy to pass.
 */
export function evaluateStrictModel(
  params: TracingEvaluationParams
): TracingEvaluationResult {
  const { guideDots, visitedNodesCount, targetCells, userCells } = params;

  if (targetCells.size === 0 || userCells.size === 0) {
    return {
      score: 0,
      passed: false,
      modelName: "strict",
      details: {
        tp: 0,
        fp: 0,
        fn: 0,
        nodeCoveragePct: 0,
        gridSimilarityPct: 0,
        passingThreshold: 75,
      },
    };
  }

  let tp = 0;
  let fp = 0;
  let fn = 0;

  targetCells.forEach((cell) => {
    if (userCells.has(cell)) {
      tp++;
    } else {
      fn++;
    }
  });

  userCells.forEach((cell) => {
    if (!targetCells.has(cell)) {
      fp++;
    }
  });

  const penaltyWeightFP = 1.5;
  const penaltyWeightFN = 1.0;
  const denominator = tp + penaltyWeightFP * fp + penaltyWeightFN * fn;
  const similarity = denominator > 0 ? tp / denominator : 0;
  const finalScore = Math.max(0, Math.round(similarity * 100));

  const nodeCoveragePct =
    guideDots.length > 0
      ? Math.round((visitedNodesCount / guideDots.length) * 100)
      : 0;

  const passingThreshold = 75;

  return {
    score: finalScore,
    passed: finalScore >= passingThreshold,
    modelName: "strict",
    details: {
      tp,
      fp,
      fn,
      nodeCoveragePct,
      gridSimilarityPct: finalScore,
      passingThreshold,
    },
  };
}

/**
 * EASY TRACING MODEL (DEFAULT FOR CURRENT USER SESSION):
 * Designed for kids, beginners, and dysgraphia/dyslexia accessibility.
 * Uses wider node coverage weighting, lower penalties for extra strokes (FP weight 0.3x),
 * forgiving hit tolerance, and requires only 45% score OR 50% node coverage to pass.
 */
export function evaluateEasyModel(
  params: TracingEvaluationParams
): TracingEvaluationResult {
  const { guideDots, visitedNodesCount, targetCells, userCells } = params;

  if (guideDots.length === 0 || visitedNodesCount === 0) {
    return {
      score: 0,
      passed: false,
      modelName: "easy",
      details: {
        tp: 0,
        fp: 0,
        fn: 0,
        nodeCoveragePct: 0,
        gridSimilarityPct: 0,
        passingThreshold: 45,
      },
    };
  }

  const nodeCoverageRatio = visitedNodesCount / guideDots.length;
  const nodeCoveragePct = Math.round(nodeCoverageRatio * 100);

  let tp = 0;
  let fp = 0;
  let fn = 0;

  if (targetCells.size > 0 && userCells.size > 0) {
    targetCells.forEach((cell) => {
      if (userCells.has(cell)) {
        tp++;
      } else {
        fn++;
      }
    });

    userCells.forEach((cell) => {
      if (!targetCells.has(cell)) {
        fp++;
      }
    });
  }

  // Softened penalties in easy mode:
  // Off-path lines are penalized only lightly (0.3x) so shaky fingers aren't punished.
  const penaltyWeightFP = 0.3;
  const penaltyWeightFN = 0.6;
  const denominator = tp + penaltyWeightFP * fp + penaltyWeightFN * fn;
  const gridSimilarity = denominator > 0 ? tp / denominator : 0;
  const gridSimilarityPct = Math.round(gridSimilarity * 100);

  // Hybrid Score: 60% Node Coverage + 40% Softened Grid Overlap
  const hybridScore = Math.round(nodeCoveragePct * 0.6 + gridSimilarityPct * 0.4);
  const finalScore = Math.min(100, Math.max(0, hybridScore));

  const passingThreshold = 45;
  // Pass if hybrid score >= 45 OR node coverage >= 50%
  const passed = finalScore >= passingThreshold || nodeCoveragePct >= 50;

  return {
    score: finalScore,
    passed,
    modelName: "easy",
    details: {
      tp,
      fp,
      fn,
      nodeCoveragePct,
      gridSimilarityPct,
      passingThreshold,
    },
  };
}

/**
 * Global Configuration for Active Drawing Model.
 * Currently set to "easy" per requested system update.
 */
export const ACTIVE_TRACING_MODEL: "easy" | "strict" = "easy";

/**
 * Helper to execute evaluation using the selected model.
 */
export function evaluateDrawing(
  params: TracingEvaluationParams,
  model: "easy" | "strict" = ACTIVE_TRACING_MODEL
): TracingEvaluationResult {
  if (model === "strict") {
    return evaluateStrictModel(params);
  }
  return evaluateEasyModel(params);
}
