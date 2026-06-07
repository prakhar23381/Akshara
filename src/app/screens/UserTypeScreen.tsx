import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";

export function UserTypeScreen() {
  const navigate = useNavigate();
  const [showMathGate, setShowMathGate] = useState(false);
  const [mathProblem, setMathProblem] = useState({ num1: 0, num2: 0, answer: 0 });
  const [userAnswer, setUserAnswer] = useState("");
  const [gateError, setGateError] = useState("");

  const triggerMathGate = (target: "parent" | "teacher") => {
    const num1 = Math.floor(Math.random() * 8) + 6; // 6 to 13
    const num2 = Math.floor(Math.random() * 8) + 6; // 6 to 13
    setMathProblem({ num1, num2, answer: num1 + num2 });
    setUserAnswer("");
    setGateError("");
    setShowMathGate(true);
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (parseInt(userAnswer, 10) === mathProblem.answer) {
      setShowMathGate(false);
      navigate("/parent-dashboard");
    } else {
      setGateError("Oops! That's incorrect. Try again! 🧐");
      setUserAnswer("");
    }
  };

  const UserTypeButton = ({
    emoji,
    label,
    onClick,
    dominant = false,
  }: {
    emoji: string;
    label: string;
    onClick: () => void;
    dominant?: boolean;
  }) => (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`${
        dominant
          ? "bg-[#4A90E2] text-white border-4 border-[#4A90E2]"
          : "bg-white text-gray-800 border-4 border-gray-300"
      } rounded-3xl p-12 flex flex-col items-center gap-6 hover:shadow-xl transition-all ${
        dominant ? "col-span-2" : ""
      }`}
    >
      <div className={dominant ? "text-8xl" : "text-6xl"}>{emoji}</div>
      <div className={`${dominant ? "text-4xl" : "text-3xl"} font-medium tracking-wide`}>
        {label}
      </div>
    </motion.button>
  );

  return (
    <div className="h-screen bg-[#F7F6F2] flex flex-col items-center justify-center gap-12 overflow-hidden p-8 relative">
      <h1 className="text-5xl font-bold text-gray-800 tracking-wide">
        Who is using Akshara-Flow?
      </h1>

      <div className="grid grid-cols-2 gap-8 max-w-4xl w-full">
        <UserTypeButton
          emoji="🧒"
          label="Child"
          onClick={() => navigate("/profile/name")}
          dominant
        />
        <UserTypeButton
          emoji="👨‍👩‍👧"
          label="Parent"
          onClick={() => triggerMathGate("parent")}
        />
        <UserTypeButton
          emoji="👨‍🏫"
          label="Teacher"
          onClick={() => triggerMathGate("teacher")}
        />
      </div>

      <div className="absolute top-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm">
        2. User Type Selection
      </div>

      {/* Adult Gate Modal Overlay */}
      <AnimatePresence>
        {showMathGate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center p-6 z-55"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6 border border-gray-100"
            >
              <div className="text-center">
                <span className="text-5xl">🔐</span>
                <h2 className="text-3xl font-extrabold text-gray-800 mt-3">Adults Only!</h2>
                <p className="text-gray-500 mt-2">
                  Please solve this simple arithmetic problem to verify you are a parent or teacher:
                </p>
              </div>

              <form onSubmit={handleVerify} className="space-y-4">
                <div className="text-center text-4xl font-black text-[#4A90E2] tracking-wider py-4 bg-blue-50 rounded-2xl">
                  {mathProblem.num1} + {mathProblem.num2} = ?
                </div>

                <input
                  type="number"
                  required
                  placeholder="Your answer"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  className="w-full text-center text-2xl font-bold p-4 bg-gray-50 border-2 border-gray-300 rounded-2xl focus:border-[#4A90E2] focus:outline-none transition-colors"
                />

                {gateError && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 text-center font-semibold text-sm"
                  >
                    {gateError}
                  </motion.p>
                )}

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowMathGate(false)}
                    className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl text-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-[#4A90E2] hover:bg-[#3b80d2] text-white font-bold rounded-2xl text-lg transition-colors shadow-md"
                  >
                    Verify & Enter
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
