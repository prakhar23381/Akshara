import { useRef, useState, useEffect } from "react";
import { motion } from "motion/react";

interface TracingCanvasProps {
  letter: string;
  onComplete?: () => void;
}

const LETTER_DOTS: Record<string, { x: number; y: number }[]> = {
  "म": [
    { x: 120, y: 100 }, { x: 220, y: 100 }, { x: 320, y: 100 }, // Shirorekha
    { x: 170, y: 150 }, { x: 170, y: 220 }, // Left line down
    { x: 170, y: 280 }, { x: 220, y: 280 }, // Loop and middle bar
    { x: 280, y: 150 }, { x: 280, y: 220 }, { x: 280, y: 290 }  // Right vertical line
  ],
  "ग": [
    { x: 120, y: 100 }, { x: 220, y: 100 }, { x: 320, y: 100 }, // Shirorekha
    { x: 180, y: 150 }, { x: 180, y: 220 }, { x: 180, y: 270 }, // Left vertical
    { x: 150, y: 270 }, { x: 150, y: 230 }, // Left loop
    { x: 280, y: 150 }, { x: 280, y: 220 }, { x: 280, y: 290 }  // Right vertical line
  ],
  "घ": [
    { x: 120, y: 100 }, { x: 220, y: 100 }, { x: 320, y: 100 }, // Shirorekha
    { x: 170, y: 150 }, { x: 220, y: 170 }, // First curve
    { x: 170, y: 210 }, { x: 220, y: 250 }, // Second curve
    { x: 280, y: 150 }, { x: 280, y: 220 }, { x: 280, y: 290 }  // Vertical line
  ],
  "ध": [
    { x: 200, y: 100 }, { x: 260, y: 100 }, { x: 320, y: 100 }, // Shirorekha (right side only)
    { x: 150, y: 130 }, { x: 170, y: 150 }, // Small loop start
    { x: 220, y: 170 }, { x: 170, y: 210 }, { x: 220, y: 250 }, // Curves
    { x: 280, y: 150 }, { x: 280, y: 220 }, { x: 280, y: 290 }  // Vertical line
  ],
  "ब": [
    { x: 120, y: 100 }, { x: 220, y: 100 }, { x: 320, y: 100 }, // Shirorekha
    { x: 280, y: 130 }, { x: 280, y: 200 }, { x: 280, y: 280 }, // Vertical line
    { x: 220, y: 200 }, { x: 170, y: 200 }, { x: 220, y: 250 }, // Circle loop
    { x: 190, y: 170 }, { x: 240, y: 230 }  // Diagonal cross-bar
  ]
};

const DEFAULT_DOTS = [
  { x: 100, y: 100 },
  { x: 200, y: 80 },
  { x: 300, y: 100 },
  { x: 280, y: 200 },
  { x: 200, y: 250 },
  { x: 120, y: 200 },
];

const drawDot = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  // White inner border for premium appearance
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 2;
  ctx.stroke();
};

export function TracingCanvas({ letter, onComplete }: TracingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [progress, setProgress] = useState(0);
  const visitedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Reset progress tracking
    setProgress(0);
    visitedRef.current = new Set();

    // Set canvas size
    canvas.width = 400;
    canvas.height = 400;

    // Clear canvas
    ctx.clearRect(0, 0, 400, 400);

    // Draw letter outline
    ctx.strokeStyle = "#E5E7EB";
    ctx.lineWidth = 12;
    ctx.font = "300px bold sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeText(letter, 200, 220);

    // Draw guide dots
    const dots = LETTER_DOTS[letter] || DEFAULT_DOTS;
    dots.forEach((dot) => {
      drawDot(ctx, dot.x, dot.y, "#FFD166");
    });
  }, [letter]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.strokeStyle = "#4A90E2";
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineTo(x, y);
    ctx.stroke();

    // Check hit test for guide dots
    const dots = LETTER_DOTS[letter] || DEFAULT_DOTS;
    let updated = false;
    dots.forEach((dot, index) => {
      const dist = Math.hypot(x - dot.x, y - dot.y);
      if (dist < 25 && !visitedRef.current.has(index)) {
        visitedRef.current.add(index);
        updated = true;

        // Draw green dot instantly on top of user drawing
        drawDot(ctx, dot.x, dot.y, "#4CAF50");
      }
    });

    if (updated) {
      const currentProgress = (visitedRef.current.size / dots.length) * 100;
      setProgress(currentProgress);
      if (currentProgress >= 80 && onComplete) {
        onComplete();
      }
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="border-4 border-gray-300 rounded-2xl bg-white cursor-crosshair shadow-md"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />

      {progress > 80 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-8 -right-8 text-6xl"
        >
          ✨
        </motion.div>
      )}
    </div>
  );
}
