interface AvatarCircleProps {
  emoji?: string;
  size?: "small" | "large";
  selected?: boolean;
  onClick?: () => void;
}

export function AvatarCircle({
  emoji = "👤",
  size = "small",
  selected = false,
  onClick,
}: AvatarCircleProps) {
  const sizeClasses = {
    small: "w-16 h-16 text-3xl",
    large: "w-32 h-32 text-6xl",
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-white border-4 ${
        selected ? "border-[#4A90E2]" : "border-gray-300"
      } flex items-center justify-center cursor-pointer hover:border-[#4A90E2] transition-all`}
      onClick={onClick}
    >
      {emoji}
    </div>
  );
}
