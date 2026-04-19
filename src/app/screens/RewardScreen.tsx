import { useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";

export function RewardScreen() {
  const navigate = useNavigate();
  const stars = 3; // Could be 1-3 based on performance

  useEffect(() => {
    // Auto-transition after celebration
    const timer = setTimeout(() => {
      navigate("/transition");
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="h-screen bg-[#F7F6F2] flex flex-col items-center justify-center gap-16 overflow-hidden">
      {/* Celebration Animation */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
        className="text-center"
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 10, 0] }}
          transition={{ duration: 0.5, repeat: 2 }}
          className="text-9xl mb-6"
        >
          🎉
        </motion.div>
        <h1 className="text-6xl font-bold text-gray-800 mb-4 tracking-wide">
          Amazing!
        </h1>
        <p className="text-3xl text-gray-600 tracking-wide">
          You did it perfectly!
        </p>
      </motion.div>

      {/* Stars */}
      <div className="flex gap-8">
        {[1, 2, 3].map((star, index) => (
          <motion.div
            key={star}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: index * 0.2, type: "spring" }}
            className={`text-8xl ${star <= stars ? "" : "opacity-30"}`}
          >
            ⭐
          </motion.div>
        ))}
      </div>

      {/* Floating sparkles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-4xl"
          style={{
            left: `${20 + i * 15}%`,
            top: `${30 + (i % 2) * 30}%`,
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.3,
          }}
        >
          ✨
        </motion.div>
      ))}

      <p className="text-xl text-gray-500 tracking-wide">
        Auto-advancing in 3 seconds...
      </p>

      <div className="absolute top-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm">
        11. Reward Screen
      </div>
    </div>
  );
}
