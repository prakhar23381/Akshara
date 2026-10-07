import { useNavigate } from "react-router";
import { AksharaButton } from "../components/AksharaButton";
import { useProfileSetup } from "../contexts/ProfileSetupContext";

export function ProfileNameScreen() {
  const navigate = useNavigate();
  const { name, setName } = useProfileSetup();

  return (
    <div className="h-[100dvh] bg-[#F7F6F2] flex flex-col items-center justify-center gap-[var(--gap-screen)] overflow-hidden p-[var(--pad-screen)]">
      <div className="t-5">👋</div>

      <div className="text-center">
        <h1 className="t-3 font-bold text-gray-800 mb-4 tracking-wide">
          What's your name?
        </h1>
        <p className="t-2 text-gray-600 tracking-wide">
          We want to know you better
        </p>
      </div>

      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enter your name"
        className="w-96 px-8 py-6 t-2 text-center rounded-3xl border-4 border-gray-300 focus:border-[#4A90E2] focus:outline-none tracking-wider"
        autoFocus
      />

      <AksharaButton
        onClick={() => navigate("/profile/age")}
        disabled={name.trim().length === 0}
      >
        Next
      </AksharaButton>
    </div>
  );
}
