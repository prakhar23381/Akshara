import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { ArrowLeft, BookOpen, Clock, Activity, Brain, User, ChevronRight } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { LETTER_SEQUENCE } from "../types/levelConfig";

interface UserProfile {
  display_name: string;
  age: number;
  avatar: string;
}

interface SessionRecord {
  id: string;
  letter: string;
  session_number: number;
  cognitive_state: string;
  error_rate_pct: number;
  avg_latency_ms: number;
  created_at: string;
}

export function ParentDashboardScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [masteryCount, setMasteryCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function loadDashboardData() {
      try {
        // Fetch child profile
        const { data: profileData } = await supabase
          .from("user_profiles")
          .select("display_name, age, avatar")
          .eq("id", user!.id)
          .single();
        if (profileData) {
          setProfile(profileData as UserProfile);
        }

        // Fetch recent learning sessions
        const { data: sessionsData } = await supabase
          .from("learning_sessions")
          .select("id, letter, session_number, cognitive_state, error_rate_pct, avg_latency_ms, created_at")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(10);
        if (sessionsData) {
          setSessions(sessionsData as SessionRecord[]);
        }

        // Fetch mastery count
        const { data: progressData } = await supabase
          .from("letter_progress")
          .select("letter")
          .eq("user_id", user!.id)
          .eq("mastered", true);
        if (progressData) {
          setMasteryCount(progressData.length);
        }
      } catch (err) {
        console.error("Error loading parent dashboard data", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [user]);

  if (loading) {
    return (
      <div className="h-screen bg-[#F7F6F2] flex flex-col items-center justify-center gap-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="text-6xl"
        >
          ⚙️
        </motion.div>
        <p className="text-xl text-gray-600 font-medium">Loading Parent Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF8F0] via-[#FAFAFA] to-[#F0F4FF] overflow-y-auto pb-12">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-100 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate("/user-type")}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-800 tracking-wide">
          Parent & Teacher Dashboard
        </h1>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Child Overview Hero */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col sm:flex-row items-center gap-6">
          <div className="text-7xl bg-amber-50 p-4 rounded-full border border-amber-100">
            {profile?.avatar ?? "🧒"}
          </div>
          <div className="flex-1 text-center sm:text-left space-y-2">
            <h2 className="text-3xl font-extrabold text-gray-800">
              {profile?.display_name ?? "Learner"}'s Profile
            </h2>
            <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <User size={16} /> Age {profile?.age ?? 0}
              </span>
              <span className="flex items-center gap-1">
                <Brain size={16} /> {masteryCount} / {LETTER_SEQUENCE.length} Mastered
              </span>
              <span className="flex items-center gap-1">
                <Clock size={16} /> {sessions.length} Recent Sessions
              </span>
            </div>
          </div>
          <button
            onClick={() => navigate("/progress")}
            className="w-full sm:w-auto bg-[#4A90E2] hover:bg-[#3b80d2] text-white font-bold py-3 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md"
          >
            <span>View Detailed AI Report</span>
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Learning Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-5 border border-green-100 flex items-center gap-4">
            <div className="bg-green-500 text-white p-3 rounded-xl">
              <BookOpen size={24} />
            </div>
            <div>
              <p className="text-sm text-green-700 font-semibold uppercase tracking-wider">Mastery Status</p>
              <h3 className="text-2xl font-black text-green-950 mt-1">
                {Math.round((masteryCount / LETTER_SEQUENCE.length) * 100)}% Complete
              </h3>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100 flex items-center gap-4">
            <div className="bg-blue-500 text-white p-3 rounded-xl">
              <Activity size={24} />
            </div>
            <div>
              <p className="text-sm text-blue-700 font-semibold uppercase tracking-wider">Avg Latency</p>
              <h3 className="text-2xl font-black text-blue-950 mt-1">
                {sessions.length > 0
                  ? (sessions.reduce((acc, s) => acc + s.avg_latency_ms, 0) / sessions.length / 1000).toFixed(1)
                  : 0}{" "}
                sec
              </h3>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-100 flex items-center gap-4">
            <div className="bg-amber-500 text-white p-3 rounded-xl">
              <Brain size={24} />
            </div>
            <div>
              <p className="text-sm text-amber-700 font-semibold uppercase tracking-wider">Current Letter</p>
              <h3 className="text-2xl font-black text-amber-950 mt-1">
                {sessions.length > 0 ? sessions[0].letter : LETTER_SEQUENCE[0]}
              </h3>
            </div>
          </div>
        </div>

        {/* Sessions History Timeline */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Clock size={20} className="text-gray-500" />
              <span>Recent Session History</span>
            </h3>
            <span className="text-sm text-gray-400">Showing last 10 entries</span>
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-lg">No sessions recorded yet.</p>
              <p className="text-sm">Progress logs will appear once the child starts practicing.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-sm font-semibold text-gray-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Letter</th>
                    <th className="py-3 px-4">State</th>
                    <th className="py-3 px-4">Mistake Rate</th>
                    <th className="py-3 px-4">Avg Speed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-gray-700">
                  {sessions.map((s) => {
                    const dateFormatted = new Date(s.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    const stateLabel = s.cognitive_state.replace(/_/g, " ");
                    return (
                      <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3.5 px-4 text-sm text-gray-500 font-medium">{dateFormatted}</td>
                        <td className="py-3.5 px-4 font-bold text-lg text-gray-800">{s.letter}</td>
                        <td className="py-3.5 px-4">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            s.cognitive_state === "visual_mastery"
                              ? "bg-green-100 text-green-700"
                              : s.cognitive_state === "feature_neglect"
                              ? "bg-amber-100 text-amber-700"
                              : s.cognitive_state === "gross_shape_blindness"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-600"
                          }`}>
                            {stateLabel}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-sm font-semibold">
                          <span className={s.error_rate_pct < 15 ? "text-green-600" : s.error_rate_pct < 35 ? "text-amber-600" : "text-red-500"}>
                            {s.error_rate_pct.toFixed(0)}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-sm text-gray-500 font-medium">{(s.avg_latency_ms / 1000).toFixed(1)}s</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
