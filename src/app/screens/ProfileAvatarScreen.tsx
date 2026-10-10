import { useState } from "react";
import { useNavigate } from "react-router";
import { AvatarCircle } from "../components/AvatarCircle";
import { AksharaButton } from "../components/AksharaButton";
import { useProfileSetup } from "../contexts/ProfileSetupContext";
import { useAccount } from "../contexts/AccountContext";

export function ProfileAvatarScreen() {
  const navigate = useNavigate();
  const { name, age, avatar, setAvatar, reset } = useProfileSetup();
  const { addChild } = useAccount();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const avatars = ["🐻", "🐼", "🐨", "🦁", "🐯", "🐸", "🐰", "🦊"];

  /**
   * The last step of adding a child. This used to write the name onto the
   * signed-in account's own profile row — the account *was* the child — so a
   * parent could only ever have one. It now creates a child the adult owns
   * (`create_child()` when signed in, this device's storage for a guest) and
   * returns to the adult home, where the new child appears with "Play as".
   */
  async function handleContinue() {
    if (!avatar) return;
    setSaving(true);
    setError(null);
    try {
      await addChild({ name, age, avatar });
      reset();
      navigate("/home", { replace: true });
    } catch (e) {
      console.error("[ProfileAvatarScreen] Failed to add child:", e);
      setError("Couldn't save. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="h-[100dvh] bg-[#F7F6F2] flex flex-col items-center justify-center gap-[var(--gap-screen)] overflow-hidden p-[var(--pad-screen)]">
      <h1 className="t-3 font-bold text-gray-800 tracking-wide text-center">
        Choose your friend
      </h1>

      <div className="grid grid-cols-4 gap-[var(--gap-screen)] max-w-4xl">
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
