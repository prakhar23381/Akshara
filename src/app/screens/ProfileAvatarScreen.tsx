import { useState } from "react";
import { useNavigate } from "react-router";
import { AvatarCircle } from "../components/AvatarCircle";
import { AksharaButton } from "../components/AksharaButton";
import { useProfileSetup } from "../contexts/ProfileSetupContext";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

export function ProfileAvatarScreen() {
  const navigate = useNavigate();
  const { name, age, avatar, setAvatar } = useProfileSetup();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const avatars = ["🐻", "🐼", "🐨", "🦁", "🐯", "🐸", "🐰", "🦊"];

  async function handleContinue() {
    if (!avatar || !user) return;
    setSaving(true);
    setError(null);

    // 1. Upsert into user_profiles table (reliable, survives re-logins)
    const { error: dbError } = await supabase.from("user_profiles").upsert(
      {
        id: user.id,
        display_name: name,
        age,
        avatar,
        profile_complete: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    if (dbError) {
      console.error("[ProfileAvatarScreen] Failed to save profile:", dbError);
      setError("Couldn't save your profile. Please try again.");
      setSaving(false);
      return;
    }

    // 2. Also stamp profile_complete on auth metadata so HomeRedirect can read it
    //    without an extra DB round-trip on every load.
    await supabase.auth.updateUser({
      data: { profile_complete: true, display_name: name, avatar },
    });

    navigate("/resume", { replace: true });
  }

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
            selected={avatar === emoji}
            onClick={() => setAvatar(emoji)}
          />
        ))}
      </div>

      {error && (
        <p className="text-red-500 text-lg text-center">{error}</p>
      )}

      <AksharaButton
        onClick={handleContinue}
        disabled={!avatar || saving}
      >
        {saving ? "Saving…" : "Let's go!"}
      </AksharaButton>
    </div>
  );
}
