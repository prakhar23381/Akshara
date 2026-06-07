import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  signInOffline: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load existing session on mount
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (data.session) {
          setSession(data.session);
          setUser(data.session.user);
        } else {
          // If no supabase session, check for mock local storage session
          const mockRaw = localStorage.getItem("akshara_mock_session");
          if (mockRaw) {
            const mockSess = JSON.parse(mockRaw);
            setSession(mockSess);
            setUser(mockSess.user);
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.warn("[Auth] Supabase getSession failed, checking local storage:", err);
        const mockRaw = localStorage.getItem("akshara_mock_session");
        if (mockRaw) {
          const mockSess = JSON.parse(mockRaw);
          setSession(mockSess);
          setUser(mockSess.user);
        }
        setLoading(false);
      });

    // Listen for auth state changes (login, logout, token refresh)
    let subscription: any = null;
    try {
      const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
        if (localStorage.getItem("akshara_offline_mode") !== "true") {
          setSession(newSession);
          setUser(newSession?.user ?? null);
          setLoading(false);
        }
      });
      subscription = data.subscription;
    } catch (err) {
      console.warn("[Auth] Supabase onAuthStateChange failed:", err);
    }

    // Local state listener for offline sandbox mode
    const localListener = () => {
      const mockRaw = localStorage.getItem("akshara_mock_session");
      if (mockRaw) {
        const mockSess = JSON.parse(mockRaw);
        setSession(mockSess);
        setUser(mockSess.user);
      } else {
        setSession(null);
        setUser(null);
      }
      setLoading(false);
    };
    window.addEventListener("akshara_auth_state_change", localListener);

    return () => {
      if (subscription) subscription.unsubscribe();
      window.removeEventListener("akshara_auth_state_change", localListener);
    };
  }, []);

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
  }

  async function signInOffline() {
    const mockUser = {
      id: "guest-user-id",
      email: "guest@akshara.org",
      user_metadata: {
        display_name: "Guest Explorer",
        avatar: "🦁"
      }
    } as any;
    
    const mockSession = {
      access_token: "mock-jwt-token-12345",
      user: mockUser
    } as any;
    
    localStorage.setItem("akshara_mock_session", JSON.stringify(mockSession));
    localStorage.setItem("akshara_offline_mode", "true");
    
    // Seed default user profile in mock DB if empty
    const profilesRaw = localStorage.getItem("akshara_db_user_profiles");
    const profiles = profilesRaw ? JSON.parse(profilesRaw) : [];
    if (!profiles.some((p: any) => p.id === mockUser.id)) {
      profiles.push({
        id: mockUser.id,
        display_name: "Guest Explorer",
        age: 6,
        avatar: "🦁",
        profile_complete: true,
        created_at: new Date().toISOString()
      });
      localStorage.setItem("akshara_db_user_profiles", JSON.stringify(profiles));
    }

    // Seed default letter progress in mock DB if empty
    const progressRaw = localStorage.getItem("akshara_db_letter_progress");
    const progress = progressRaw ? JSON.parse(progressRaw) : [];
    if (!progress.some((p: any) => p.user_id === mockUser.id)) {
      progress.push({
        user_id: mockUser.id,
        letter: "म",
        letter_index: 0,
        mastered: false,
        sessions_count: 0,
        last_cognitive_state: "insufficient_data",
        last_scaffold_intensity: 0.55,
        last_avg_latency_ms: 6000,
        created_at: new Date().toISOString()
      });
      localStorage.setItem("akshara_db_letter_progress", JSON.stringify(progress));
    }

    window.dispatchEvent(new Event("akshara_auth_state_change"));
  }

  async function signOut() {
    if (localStorage.getItem("akshara_offline_mode") === "true") {
      localStorage.removeItem("akshara_mock_session");
      localStorage.removeItem("akshara_offline_mode");
      window.dispatchEvent(new Event("akshara_auth_state_change"));
    } else {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn("[Auth] Supabase signOut failed, clearing local session:", err);
        localStorage.removeItem("akshara_mock_session");
        localStorage.removeItem("akshara_offline_mode");
        window.dispatchEvent(new Event("akshara_auth_state_change"));
      }
    }
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signInWithGoogle, signOut, signInOffline }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
