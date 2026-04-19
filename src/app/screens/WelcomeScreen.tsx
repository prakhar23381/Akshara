import { useNavigate } from "react-router";
import { AksharaButton } from "../components/AksharaButton";
import { motion } from "motion/react";

export function WelcomeScreen() {
  const navigate = useNavigate();

  return (
    <div className="h-screen bg-[#F7F6F2] flex flex-col items-center justify-center gap-16 overflow-hidden">
      {/* Mascot / Friendly Visual */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="relative"
      >
        <div className="text-9xl">🌟</div>
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute -top-8 -right-8 text-6xl"
        >
          ✨
        </motion.div>
      </motion.div>

      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-800 mb-4 tracking-wide">
          Akshara-Flow
        </h1>
        <p className="text-3xl text-gray-600 tracking-wide">
          Let's learn together!
        </p>
      </div>

      {/* Single Start Button */}
      <AksharaButton onClick={() => navigate("/user-type")}>
        Start
      </AksharaButton>

      {/* Wireframe Label */}
      <div className="absolute top-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm">
        1. Welcome Screen
      </div>
    </div>
  );
}
