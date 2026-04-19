import { useNavigate } from "react-router";
import { motion } from "motion/react";

export function UserTypeScreen() {
  const navigate = useNavigate();

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
    <div className="h-screen bg-[#F7F6F2] flex flex-col items-center justify-center gap-12 overflow-hidden p-8">
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
          onClick={() => alert("Parent dashboard (not implemented in wireframe)")}
        />
        <UserTypeButton
          emoji="👨‍🏫"
          label="Teacher"
          onClick={() => alert("Teacher dashboard (not implemented in wireframe)")}
        />
      </div>

      <div className="absolute top-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm">
        2. User Type Selection
      </div>
    </div>
  );
}
