import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";

export function ProfileAgeScreen() {
  const navigate = useNavigate();
  const [selectedAge, setSelectedAge] = useState<number | null>(null);
  const ages = [5, 6, 7, 8, 9, 10];

  const handleAgeSelect = (age: number) => {
    setSelectedAge(age);
    // Auto-advance after selection
    setTimeout(() => {
      navigate("/profile/avatar");
    }, 500);
  };

  return (
    <div className="h-screen bg-[#F7F6F2] flex flex-col items-center justify-center gap-16 overflow-hidden p-8">
      <div className="text-8xl">🎂</div>

      <h1 className="text-5xl font-bold text-gray-800 tracking-wide text-center">
        How old are you?
      </h1>

      <div className="grid grid-cols-3 gap-6 max-w-3xl">
        {ages.map((age) => (
          <motion.button
            key={age}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleAgeSelect(age)}
            className={`w-32 h-32 rounded-3xl text-5xl font-bold transition-all ${
              selectedAge === age
                ? "bg-[#4A90E2] text-white border-4 border-[#4A90E2]"
                : "bg-white text-gray-800 border-4 border-gray-300 hover:border-[#4A90E2]"
            }`}
          >
            {age}
          </motion.button>
        ))}
      </div>

      <div className="absolute top-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm">
        3B. Profile: Age
      </div>
    </div>
  );
}
