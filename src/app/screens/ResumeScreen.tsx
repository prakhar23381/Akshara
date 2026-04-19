import { useNavigate } from "react-router";
import { AksharaButton } from "../components/AksharaButton";
import { motion } from "motion/react";

export function ResumeScreen() {
  const navigate = useNavigate();

  return (
    <div className="h-screen bg-[#F7F6F2] flex flex-col items-center justify-center gap-16 overflow-hidden p-8">
      <div className="text-center">
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-9xl mb-6"
        >
          🐻
        </motion.div>
        <h1 className="text-5xl font-bold text-gray-800 mb-4 tracking-wide">
          Welcome back!
        </h1>
        <p className="text-3xl text-gray-600 tracking-wide">
          Ready to learn more?
        </p>
      </div>

      {/* Primary Action - Visually Dominant */}
      <div className="flex flex-col gap-6">
        <AksharaButton onClick={() => navigate("/animation")} size="large">
          Continue Learning
        </AksharaButton>

        {/* Secondary Actions - Smaller */}
        <div className="flex gap-4 justify-center">
          <AksharaButton
            onClick={() => alert("Rewards screen (not implemented)")}
            variant="secondary"
            size="small"
          >
            🏆 Rewards
          </AksharaButton>
          <AksharaButton
            onClick={() => alert("Progress screen (not implemented)")}
            variant="secondary"
            size="small"
          >
            📊 Progress
          </AksharaButton>
        </div>
      </div>

      <div className="absolute top-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm">
        5. Resume Screen (Dashboard)
      </div>
    </div>
  );
}
