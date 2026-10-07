import { useNavigate } from "react-router";
import { AksharaButton } from "../components/AksharaButton";
import { motion } from "motion/react";

export function WelcomeScreen() {
  const navigate = useNavigate();

  return (
    <div className="h-[100dvh] bg-[#F7F6F2] flex flex-col items-center justify-center gap-[var(--gap-screen)] overflow-hidden">
      {/* Mascot / Friendly Visual */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="relative"
      >
        <div className="t-5">🌟</div>
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute -top-8 -right-8 t-4"
        >
          ✨
        </motion.div>
      </motion.div>

      <div className="text-center">
        <h1 className="t-4 font-bold text-gray-800 mb-4 tracking-wide">
          Akshara-Flow
        </h1>
        <p className="t-2 text-gray-600 tracking-wide">
          Let's learn together!
        </p>
      </div>

      {/* Single Start Button */}
      <AksharaButton onClick={() => navigate("/user-type")}>
        Start
      </AksharaButton>
    </div>
  );
}
