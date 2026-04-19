import { useRef, useState, useEffect } from "react";
import { motion } from "motion/react";

interface TracingCanvasProps {
  letter: string;
}

export function TracingCanvas({ letter }: TracingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = 400;
    canvas.height = 400;

    // Draw letter outline
    ctx.strokeStyle = "#D1D5DB";
    ctx.lineWidth = 8;
    ctx.font = "300px bold sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeText(letter, 200, 220);

    // Draw guide dots (simplified path)
    ctx.fillStyle = "#FFD166";
    const dots = [
      { x: 100, y: 100 },
      { x: 200, y: 80 },
      { x: 300, y: 100 },
      { x: 280, y: 200 },
      { x: 200, y: 250 },
      { x: 120, y: 200 },
    ];
    dots.forEach((dot) => {
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, 8, 0, Math.PI * 2);
      ctx.fill();
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

    // Simulate progress
    setProgress((prev) => Math.min(prev + 0.5, 100));
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="border-4 border-gray-300 rounded-2xl bg-white cursor-crosshair"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      
      {progress > 70 && (
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
