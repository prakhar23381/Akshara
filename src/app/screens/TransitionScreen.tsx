import { useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";

export function TransitionScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => {
      navigate("/resume");
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="h-screen bg-[#F7F6F2] flex flex-col items-center justify-center gap-16 overflow-hidden">
      {/* Loading Animation */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 360],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="text-9xl"
      >
        🌟
      </motion.div>

      <div className="text-center">
        <h2 className="text-4xl font-bold text-gray-800 mb-4 tracking-wide">
          Getting next lesson ready...
        </h2>
        
        {/* Loading dots */}
        <div className="flex gap-3 justify-center">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-4 h-4 bg-[#4A90E2] rounded-full"
              animate={{
                y: [0, -15, 0],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      </div>

      {/* Fun fact or tip */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white px-8 py-6 rounded-2xl border-4 border-gray-300 max-w-2xl"
      >
        <p className="text-2xl text-gray-700 text-center tracking-wide">
          💡 Did you know? Learning one new letter every day is better than rushing!
        </p>
      </motion.div>
    </div>
  );
}
