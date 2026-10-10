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
    small: "w-16 h-16 t-2",
    large: "w-32 h-32 t-4",
  };

  const className = `${sizeClasses[size]} rounded-full bg-white border-4 ${
    selected ? "border-[#4A90E2]" : "border-gray-300"
  } flex items-center justify-center transition-all`;

  // A choice is a real button: it was a clickable <div>, which a keyboard
  // cannot reach and a screen reader does not announce — and choosing an
  // avatar is now in every adult's path through adding a child.
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        aria-label={`Choose ${emoji}`}
        className={`${className} cursor-pointer hover:border-[#4A90E2]`}
      >
        {emoji}
      </button>
    );
  }
  return <div className={className}>{emoji}</div>;
}
