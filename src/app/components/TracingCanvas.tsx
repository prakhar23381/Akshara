import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LETTER_STROKES, StrokePath } from "../data/letterPaths";
import { playSuccessSound, playErrorSound } from "../utils/soundEffects";

interface TracingCanvasProps {
  letter: string;
  onComplete?: (score: number, success: boolean) => void;
  onClear?: () => void;
}

const DEFAULT_DOTS = [
  { x: 100, y: 100 },
  { x: 200, y: 80 },
  { x: 300, y: 100 },
  { x: 280, y: 200 },
  { x: 200, y: 250 },
  { x: 120, y: 200 },
];
const GRID_SIZE = 10;
const CELL_SIZE = 400 / GRID_SIZE; // 40px per cell

const getCellIndex = (x: number, y: number) => {
  const col = Math.min(GRID_SIZE - 1, Math.max(0, Math.floor(x / CELL_SIZE)));
  const row = Math.min(GRID_SIZE - 1, Math.max(0, Math.floor(y / CELL_SIZE)));
  return row * GRID_SIZE + col;
};

export function TracingCanvas({ letter, onComplete, onClear }: TracingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const targetGridRef = useRef<Set<number>>(new Set());
  const userGridRef = useRef<Set<number>>(new Set());
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [progress, setProgress] = useState(0);
  const [guideDots, setGuideDots] = useState<{ x: number; y: number }[]>([]);
  const [animatingTemplate, setAnimatingTemplate] = useState(true);
  const [activeStrokeIdx, setActiveStrokeIdx] = useState(0);
  const [pointerPos, setPointerPos] = useState({ x: 200, y: 200 });
  const [evaluation, setEvaluation] = useState<"none" | "success" | "fail">("none");
  const [score, setScore] = useState(0);
  const visitedRef = useRef<Set<number>>(new Set());
  const totalPointsRef = useRef(0);
  const strayPointsRef = useRef(0);

  const strokes: StrokePath[] = LETTER_STROKES[letter] || [];

  // Generate guide dots dynamically by sampling the SVG paths at a higher resolution (spacing = 10)
  useEffect(() => {
    const dots: { x: number; y: number }[] = [];
    if (strokes.length > 0) {
      strokes.forEach((stroke) => {
        try {
          const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
          pathEl.setAttribute("d", stroke.path);
          const totalLength = pathEl.getTotalLength();
          
          // Sample a guide dot every 10 pixels along the stroke path for high precision tracking
          const spacing = 10;
          const numPoints = Math.max(4, Math.floor(totalLength / spacing));
          for (let i = 0; i <= numPoints; i++) {
            const ratio = i / numPoints;
            const pt = pathEl.getPointAtLength(ratio * totalLength);
            dots.push({ x: pt.x, y: pt.y });
          }
        } catch (e) {
          console.error("Failed to sample SVG path", e);
        }
      });
    }

    const finalDots = dots.length > 0 ? dots : DEFAULT_DOTS;
    setGuideDots(finalDots);
    
    // Initialize target grid cells
    const targetCells = new Set<number>();
    finalDots.forEach(dot => {
      targetCells.add(getCellIndex(dot.x, dot.y));
    });
    targetGridRef.current = targetCells;
    
    // Clear state
    visitedRef.current = new Set();
    setProgress(0);
    setIsDrawing(false);
    setHasDrawn(false);
    setEvaluation("none");
    setScore(0);

    // Clear canvas drawing
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, 400, 400);
      }
    }

    // Play drawing template guide demonstration
    playPreviewAnimation();
  }, [letter]);

  const playPreviewAnimation = () => {
    setAnimatingTemplate(true);
    setActiveStrokeIdx(0);
    setPointerPos({ x: 200, y: 200 });

    if (strokes.length === 0) {
      setAnimatingTemplate(false);
      return;
    }

    let delayAccumulator = 0;
    strokes.forEach((stroke, idx) => {
      const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
      pathEl.setAttribute("d", stroke.path);
      const startPt = pathEl.getPointAtLength(0);

      // Animate pointer to starting point
      setTimeout(() => {
        setActiveStrokeIdx(idx);
        setPointerPos({ x: startPt.x, y: startPt.y });

        // Animate traveling along the path
        const duration = stroke.duration * 1000;
        const totalLen = pathEl.getTotalLength();
        const start = performance.now();

        const step = (now: number) => {
          const elapsed = now - start;
          const pct = Math.min(1, elapsed / duration);
          const currentPt = pathEl.getPointAtLength(pct * totalLen);
          setPointerPos({ x: currentPt.x, y: currentPt.y });
          if (pct < 1) {
            requestAnimationFrame(step);
          }
        };
        requestAnimationFrame(step);
      }, delayAccumulator);

      delayAccumulator += (stroke.duration + 0.3) * 1000; // duration + pause
    });

    // Mark animation done
    setTimeout(() => {
      setAnimatingTemplate(false);
    }, delayAccumulator);
  };

  const getScaledCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    // Scale client coordinate to 400x400 internal coordinate space
    const x = (clientX - rect.left) * (400 / rect.width);
    const y = (clientY - rect.top) * (400 / rect.height);
    return { x, y };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (animatingTemplate || evaluation !== "none") return;
    setIsDrawing(true);
    setHasDrawn(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getScaledCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || animatingTemplate || evaluation !== "none") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getScaledCoordinates(e);

    // Record user drawing cell in grid
    userGridRef.current.add(getCellIndex(x, y));

    // Draw raw brush stroke freely on the canvas without visual dots or snapping
    ctx.strokeStyle = "#4A90E2";
    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineTo(x, y);
    ctx.stroke();

    // Background hit test sample nodes
    let updated = false;
    let minDistance = Infinity;

    guideDots.forEach((dot, index) => {
      const dist = Math.hypot(x - dot.x, y - dot.y);
      if (dist < minDistance) {
        minDistance = dist;
      }
      if (dist < 28 && !visitedRef.current.has(index)) {
        visitedRef.current.add(index);
        updated = true;
      }
    });

    totalPointsRef.current += 1;
    if (minDistance > 30) { // 30px stray distance threshold (slightly above 28px hit radius)
      strayPointsRef.current += 1;
    }

    if (totalPointsRef.current % 15 === 0) {
      console.log(`[TracingCanvas draw] x=${x.toFixed(1)}, y=${y.toFixed(1)}, minDistance=${minDistance.toFixed(1)}, total=${totalPointsRef.current}, stray=${strayPointsRef.current}`);
    }

    if (updated) {
      const currentProgress = (visitedRef.current.size / guideDots.length) * 100;
      setProgress(currentProgress);
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, 400, 400);
      }
    }
    visitedRef.current = new Set();
    totalPointsRef.current = 0;
    strayPointsRef.current = 0;
    userGridRef.current.clear();
    setProgress(0);
    setHasDrawn(false);
    setEvaluation("none");
    setScore(0);
    if (onClear) onClear();
  };

  const checkDrawing = () => {
    const targetCells = targetGridRef.current;
    const userCells = userGridRef.current;

    if (targetCells.size === 0 || userCells.size === 0) {
      setScore(0);
      setEvaluation("fail");
      playErrorSound();
      if (onComplete) onComplete(0, false);
      return;
    }

    let tp = 0; // True Positives
    let fp = 0; // False Positives
    let fn = 0; // False Negatives

    // Evaluate true positives and false negatives
    targetCells.forEach((cell) => {
      if (userCells.has(cell)) {
        tp++;
      } else {
        fn++;
      }
    });

    // Evaluate false positives (off-path drawing)
    userCells.forEach((cell) => {
      if (!targetCells.has(cell)) {
        fp++;
      }
    });

    // Weighted Jaccard Similarity: penalize FP (drawing wrong paths) more than missing some path (FN)
    const penaltyWeightFP = 1.5;
    const penaltyWeightFN = 1.0;

    const denominator = tp + penaltyWeightFP * fp + penaltyWeightFN * fn;
    const similarity = denominator > 0 ? tp / denominator : 0;
    const finalScore = Math.max(0, Math.round(similarity * 100));

    console.log(`[TracingCanvas checkDrawing] TP=${tp}, FP=${fp}, FN=${fn}, JaccardScore=${finalScore}%`);

    setScore(finalScore);

    if (finalScore >= 75) { // 75% master threshold adjusted for grid checks
      setEvaluation("success");
      playSuccessSound();
      if (onComplete) onComplete(finalScore, true);
    } else {
      setEvaluation("fail");
      playErrorSound();
      if (onComplete) onComplete(finalScore, false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 sm:gap-6 w-full max-w-[400px]">
      {/* Responsive visual container */}
      <div className="relative w-[280px] h-[280px] sm:w-[340px] sm:h-[340px] md:w-[400px] md:h-[400px] select-none">
        
        {/* SVG Drawing Outline Silhouette Guide Layer */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none rounded-3xl bg-white border-4 border-gray-300 shadow-md z-0"
          viewBox="0 0 400 400"
        >
          {/* Bolder gray template guide of the Devanagari letter */}
          {strokes.map((stroke, i) => (
            <path
              key={`bg-${i}`}
              d={stroke.path}
              fill="none"
              stroke="#E5E7EB"
              strokeWidth={20}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* Animating preview strokes */}
          {animatingTemplate &&
            strokes.map((stroke, i) => {
              if (i > activeStrokeIdx) return null;
              const isCurrent = i === activeStrokeIdx;
              return (
                <motion.path
                  key={`anim-${i}`}
                  d={stroke.path}
                  fill="none"
                  stroke="#93C5FD"
                  strokeWidth={20}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: isCurrent ? 1 : 1 }}
                  transition={{
                    duration: stroke.duration,
                    ease: "easeInOut",
                  }}
                />
              );
            })}
        </svg>

        {/* User Interaction Canvas Layer */}
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className="absolute inset-0 w-full h-full cursor-crosshair z-10 bg-transparent rounded-3xl"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />

        {/* Glowing pointer during demonstration */}
        {animatingTemplate && (
          <motion.div
            className="absolute w-8 h-8 bg-yellow-400 border-2 border-white rounded-full shadow-lg z-20 pointer-events-none -translate-x-1/2 -translate-y-1/2"
            animate={{
              left: `${(pointerPos.x / 400) * 100}%`,
              top: `${(pointerPos.y / 400) * 100}%`,
            }}
            transition={{
              type: "tween",
              ease: "linear",
              duration: 0.05,
            }}
          />
        )}

        {/* Evaluation Card overlay on success/fail */}
        <AnimatePresence>
          {evaluation !== "none" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 bg-white/90 rounded-3xl z-20 flex flex-col items-center justify-center p-4 sm:p-8 gap-2 sm:gap-4 border-4 border-gray-300"
            >
              {evaluation === "success" ? (
                <div className="text-center space-y-2 sm:space-y-4">
                  <span className="text-5xl sm:text-7xl">🌟</span>
                  <h3 className="text-2xl sm:text-3xl font-black text-emerald-600">Great Job! Success!</h3>
                  <p className="text-base sm:text-xl text-gray-500 font-medium">
                    You matched the letter shape with a score of{" "}
                    <span className="font-bold text-gray-800">{score}%</span>!
                  </p>
                </div>
              ) : (
                <div className="text-center space-y-2 sm:space-y-4">
                  <span className="text-5xl sm:text-7xl">🔄</span>
                  <h3 className="text-2xl sm:text-3xl font-black text-rose-500">Try Again!</h3>
                  <p className="text-base sm:text-xl text-gray-500 font-medium">
                    Keep practicing! You scored{" "}
                    <span className="font-bold text-gray-800">{score}%</span>.
                  </p>
                  <button
                    onClick={clearCanvas}
                    className="px-4 py-2 sm:px-6 sm:py-3 bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm sm:text-lg rounded-2xl shadow-md transition-colors"
                  >
                    Clear and Retry 🧹
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Buttons Panel */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-4 select-none">
        <button
          onClick={clearCanvas}
          disabled={animatingTemplate || !hasDrawn}
          className="px-4 py-2 sm:px-6 sm:py-3 font-bold rounded-2xl bg-gray-200 hover:bg-gray-300 text-gray-700 disabled:opacity-50 transition-colors border border-gray-300 shadow-sm text-sm sm:text-lg flex items-center gap-1 sm:gap-2"
        >
          Clear Drawing 🧹
        </button>

        {evaluation === "none" && (
          <button
            onClick={checkDrawing}
            disabled={animatingTemplate || !hasDrawn}
            className="px-4 py-2 sm:px-6 sm:py-3 font-bold rounded-2xl bg-[#4A90E2] hover:bg-[#357ABD] text-white disabled:opacity-50 transition-colors shadow-md text-sm sm:text-lg flex items-center gap-1 sm:gap-2"
          >
            Check Drawing 🔍
          </button>
        )}

        <button
          onClick={playPreviewAnimation}
          disabled={animatingTemplate || evaluation !== "none"}
          className="px-4 py-2 sm:px-6 sm:py-3 font-bold rounded-2xl bg-amber-100 hover:bg-amber-200 text-amber-800 disabled:opacity-50 transition-colors border border-amber-200 shadow-sm text-sm sm:text-lg"
        >
          👁️ Watch guide
        </button>
      </div>
    </div>
  );
}
