import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { isProfileComplete } from "../lib/profile";

export function HomeRedirect() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function checkProfile() {
      const complete = await isProfileComplete(user!.id);
      navigate(complete ? "/resume" : "/welcome", { replace: true });
      setChecking(false);
    }

    checkProfile();
  }, [user, navigate]);

  if (!checking) return null;

  return (
    <div className="h-[100dvh] bg-[#F7F6F2] flex items-center justify-center overflow-hidden">
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-3 h-3 bg-amber-400 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
