import { useState } from "react";
import { useNavigate } from "react-router";
import { AvatarCircle } from "../components/AvatarCircle";
import { AksharaButton } from "../components/AksharaButton";

export function ProfileAvatarScreen() {
  const navigate = useNavigate();
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);

  const avatars = ["🐻", "🐼", "🐨", "🦁", "🐯", "🐸", "🐰", "🦊"];

  return (
    <div className="h-screen bg-[#F7F6F2] flex flex-col items-center justify-center gap-16 overflow-hidden p-8">
      <h1 className="text-5xl font-bold text-gray-800 tracking-wide text-center">
        Choose your friend
      </h1>

      <div className="grid grid-cols-4 gap-8 max-w-4xl">
        {avatars.map((emoji) => (
          <AvatarCircle
            key={emoji}
            emoji={emoji}
            size="large"
            selected={selectedAvatar === emoji}
            onClick={() => setSelectedAvatar(emoji)}
          />
        ))}
      </div>

      <AksharaButton
        onClick={() => navigate("/assessment")}
        disabled={!selectedAvatar}
      >
        Continue
      </AksharaButton>

      <div className="absolute top-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm">
        3C. Profile: Avatar
      </div>
    </div>
  );
}
