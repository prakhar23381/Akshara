import { AvatarCircle } from "./AvatarCircle";
import { ProgressBar } from "./ProgressBar";
import { X } from "lucide-react";

interface TopBarProps {
  avatarEmoji?: string;
  progress?: number;
  onExit?: () => void;
}

export function TopBar({ avatarEmoji = "👤", progress = 0, onExit }: TopBarProps) {
  return (
    <div className="flex items-center justify-between px-8 py-6">
      <AvatarCircle emoji={avatarEmoji} size="small" />
      <ProgressBar progress={progress} />
      <button
        className="w-16 h-16 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-all"
        onClick={onExit}
      >
        <X size={32} className="text-gray-600" />
      </button>
    </div>
  );
}
