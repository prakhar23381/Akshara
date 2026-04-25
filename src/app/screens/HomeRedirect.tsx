import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

export function HomeRedirect() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function checkProfile() {
      // Always verify against the DB — auth metadata can be stale
      // (e.g. user deleted their profile row while testing)
      const { data } = await supabase
        .from("user_profiles")
        .select("profile_complete")
        .eq("id", user!.id)
        .single();

      if (data?.profile_complete) {
        navigate("/resume", { replace: true });
      } else {
        navigate("/welcome", { replace: true });
      }
      setChecking(false);
    }

    checkProfile();
  }, [user, navigate]);

  if (!checking) return null;

  return (
    <div className="h-screen bg-[#F7F6F2] flex items-center justify-center">
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
