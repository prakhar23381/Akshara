import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { ArrowLeft, BookOpen, Clock, Activity, Brain, User, ChevronRight, AlertTriangle, MessageSquare } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
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
  confused_pairs?: {
    confused_pairs?: [string, string][];
    reasoning?: string;
  };
  created_at: string;
}

interface ConfusionTrend {
  pair: string;
  count: number;
  target: string;
  selected: string;
}

export function ParentDashboardScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [masteryCount, setMasteryCount] = useState(0);
  const [confusionTrends, setConfusionTrends] = useState<ConfusionTrend[]>([]);
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
          .select("id, letter, session_number, cognitive_state, error_rate_pct, avg_latency_ms, confused_pairs, created_at")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(10);

        let parsedSessions: SessionRecord[] = [];
        if (sessionsData) {
          parsedSessions = (sessionsData as any[]).map((s) => {
            let cp = s.confused_pairs;
            // Handle if database returns stringified JSON
            if (typeof cp === "string") {
              try {
                cp = JSON.parse(cp);
              } catch (e) {
                cp = {};
              }
            }
            return {
              ...s,
              confused_pairs: cp,
            };
          });
          setSessions(parsedSessions);
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

        // Aggregate confusion trends from all sessions
        const confusionMap: Record<string, { count: number; target: string; selected: string }> = {};
        parsedSessions.forEach((s) => {
          const list = s.confused_pairs?.confused_pairs || [];
          list.forEach(([target, selected]) => {
            if (target && selected && target !== selected) {
              const pairKey = `${target} ↔ ${selected}`;
              if (!confusionMap[pairKey]) {
                confusionMap[pairKey] = { count: 0, target, selected };
              }
              confusionMap[pairKey].count += 1;
            }
          });
        });

        const sortedTrends = Object.entries(confusionMap)
          .map(([pair, detail]) => ({
            pair,
            count: detail.count,
            target: detail.target,
            selected: detail.selected,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 4);

        setConfusionTrends(sortedTrends);
      } catch (err) {
        console.error("Error loading parent dashboard data", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [user]);

  // Format data for Recharts (reversing sessions to show chronological order)
  const chartData = [...sessions]
    .reverse()
    .map((s, idx) => ({
      name: `S${sessions.length - idx}`,
      letter: s.letter,
      errorRate: Math.round(s.error_rate_pct),
      latencySec: parseFloat((s.avg_latency_ms / 1000).toFixed(1)),
    }));

  if (loading) {
    return (
      <div className="h-[100dvh] bg-[#F7F6F2] flex flex-col items-center justify-center gap-6 overflow-hidden">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="t-4"
        >
          ⚙️
        </motion.div>
        <p className="text-xl text-gray-600 font-medium">Loading Parent Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-gradient-to-tr from-[#FFF8F0] via-[#FAF9F6] to-[#EEF5FF] overflow-hidden flex flex-col relative pb-4 select-none">
      
      {/* Background ambient blobs */}
      <div className="absolute top-20 left-5 w-80 h-80 bg-orange-100/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-5 w-96 h-96 bg-blue-100/30 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/70 backdrop-blur-md border-b border-gray-200/50 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate("/user-type")}
          className="p-2.5 rounded-2xl hover:bg-gray-100/80 hover:scale-105 active:scale-95 transition-all text-gray-600 border border-transparent hover:border-gray-200"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-black text-gray-900 tracking-wide">
          Parent & Teacher Console
        </h1>
        <span className="ml-auto text-xs sm:text-sm font-bold bg-white border border-gray-200 px-3 py-1.5 rounded-full text-gray-500 shadow-sm">
          👪 Guest/Offline Account
        </span>
      </div>

      {/* Main Dashboard Panel */}
      <div className="flex-1 min-h-0 max-w-5xl w-full mx-auto px-6 py-6 flex flex-col gap-6 overflow-hidden relative z-10">
        
        {/* Child Overview Hero */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/60 backdrop-blur-md rounded-3xl p-5 border border-white/40 shadow-lg flex flex-col sm:flex-row items-center gap-5"
        >
          <div className="t-4 bg-amber-50/80 p-3 rounded-full border border-amber-100 shadow-inner select-none">
            {profile?.avatar ?? "🧒"}
          </div>
          <div className="flex-1 text-center sm:text-left space-y-1">
            <h2 className="t-2 font-black text-gray-800">
              {profile?.display_name ?? "Learner"}'s Progress
            </h2>
            <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-xs sm:text-sm text-gray-500 font-bold">
              <span className="flex items-center gap-1">
                👤 Age {profile?.age ?? 0}
              </span>
              <span className="flex items-center gap-1">
                🧠 {masteryCount} / {LETTER_SEQUENCE.length} Mastered
              </span>
              <span className="flex items-center gap-1">
                ⏱️ {sessions.length} Recent Sessions
              </span>
            </div>
          </div>
          <button
            onClick={() => navigate("/report")}
            className="w-full sm:w-auto bg-[#4A90E2] hover:bg-[#357ABD] text-white font-bold py-3 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
          >
            <span>View full report</span>
            <ChevronRight size={16} />
          </button>
        </motion.div>

        {/* Progress Stats Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-200/50 flex items-center gap-4 shadow-sm">
            <div className="bg-green-500 text-white p-2.5 rounded-xl">
              <BookOpen size={20} />
            </div>
            <div>
              <p className="text-sm text-green-700 font-black tracking-wider">Mastery Status</p>
              <h3 className="text-lg font-black text-green-950 mt-0.5">
                {Math.round((masteryCount / LETTER_SEQUENCE.length) * 100)}% Complete
              </h3>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-200/50 flex items-center gap-4 shadow-sm">
            <div className="bg-blue-500 text-white p-2.5 rounded-xl">
              <Activity size={20} />
            </div>
            <div>
              <p className="text-sm text-blue-700 font-black tracking-wider">Avg Latency</p>
              <h3 className="text-lg font-black text-blue-950 mt-0.5">
                {sessions.length > 0
                  ? (sessions.reduce((acc, s) => acc + s.avg_latency_ms, 0) / sessions.length / 1000).toFixed(1)
                  : 0}{" "}
                sec
              </h3>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-200/50 flex items-center gap-4 shadow-sm">
            <div className="bg-amber-500 text-white p-2.5 rounded-xl">
              <Brain size={20} />
            </div>
            <div>
              <p className="text-sm text-amber-700 font-black tracking-wider">Current Target</p>
              <h3 className="text-lg font-black text-amber-950 mt-0.5">
                {sessions.length > 0 ? sessions[0].letter : LETTER_SEQUENCE[0]}
              </h3>
            </div>
          </div>
        </div>

        {/* Analytics Section Split Grid */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
          
          {/* Left Column: Line Chart + History Table (Takes 2/3 space) */}
          <div className="lg:col-span-2 flex flex-col gap-4 overflow-hidden">
            
            {/* Two measures on different scales get two charts with one axis
                each. They were previously drawn as a single plot with a left
                and a right y-axis, which makes the crossing point of the two
                lines look meaningful when it is purely an artefact of the two
                chosen scales. */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col gap-3">
              {chartData.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-500">
                  No session data available for charts.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                      <Activity size={15} className="text-[#2a78d6]" />
                      <span>Mistakes per session (%)</span>
                    </h3>
                    <div className="w-full t--1" style={{ height: "clamp(84px, 17vh, 150px)" }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" />
                          <XAxis dataKey="name" stroke="#898781" tickLine={false} />
                          <YAxis domain={[0, 100]} stroke="#898781" tickLine={false} />
                          <Tooltip
                            formatter={(v: any) => [`${v}%`, "Mistakes"]}
                            contentStyle={{ borderRadius: 12, border: '1px solid #e1e0d9' }}
                          />
                          <Line
                            type="monotone"
                            dataKey="errorRate"
                            stroke="#2a78d6"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                            name="Mistakes"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                      <Clock size={15} className="text-[#eb6834]" />
                      <span>Response time per session (seconds)</span>
                    </h3>
                    <div className="w-full t--1" style={{ height: "clamp(84px, 17vh, 150px)" }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" />
                          <XAxis dataKey="name" stroke="#898781" tickLine={false} />
                          <YAxis stroke="#898781" tickLine={false} />
                          <Tooltip
                            formatter={(v: any) => [`${v}s`, "Response time"]}
                            contentStyle={{ borderRadius: 12, border: '1px solid #e1e0d9' }}
                          />
                          <Line
                            type="monotone"
                            dataKey="latencySec"
                            stroke="#eb6834"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                            name="Response time"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}
              <p className="text-sm text-gray-500">
                Sessions run oldest to newest. A falling mistake rate and a
                falling response time both indicate the letter is becoming
                automatic.
              </p>
            </div>

            {/* Recent Sessions Table Card */}
            <div className="flex-1 min-h-0 bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col gap-3 overflow-hidden">
              <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                <h3 className="text-sm font-black text-gray-800 flex items-center gap-2">
                  <Clock size={16} className="text-gray-500" />
                  <span>Recent Session History</span>
                </h3>
                <span className="text-sm font-bold text-gray-400 tracking-wide">Last 10 entries</span>
              </div>

              {/* Scrollable table container */}
              <div className="flex-1 overflow-y-auto min-h-0">
                {sessions.length === 0 ? (
                  <div className="text-center py-8 text-xs text-gray-400">
                    <p className="font-bold">No sessions recorded yet.</p>
                    <p className="mt-1">Progress logs will appear once the child starts practicing.</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-white z-10">
                      <tr className="border-b border-gray-100 text-sm font-black text-gray-400 tracking-wider">
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Letter</th>
                        <th className="py-2 px-3">State</th>
                        <th className="py-2 px-3">Error</th>
                        <th className="py-2 px-3">Speed</th>
                        <th className="py-2 px-3">Notes</th>
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
                        const reasoningText = s.confused_pairs?.reasoning ?? "No specific notes recorded.";
                        return (
                          <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-2 px-3 text-gray-400 font-bold">{dateFormatted}</td>
                            <td className="py-2 px-3 font-black text-sm text-gray-800">{s.letter}</td>
                            <td className="py-2 px-3">
                              <span className={`text-xs font-black px-2 py-0.5 rounded-full tracking-wider ${
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
                            <td className="py-2 px-3 font-bold">
                              <span className={s.error_rate_pct < 15 ? "text-green-600" : s.error_rate_pct < 35 ? "text-amber-600" : "text-red-500"}>
                                {s.error_rate_pct.toFixed(0)}%
                              </span>
                            </td>
                            <td className="py-2 px-3 text-gray-400 font-bold">{(s.avg_latency_ms / 1000).toFixed(1)}s</td>
                            <td className="py-2 px-3 text-gray-500 max-w-xs truncate" title={reasoningText}>
                              <span className="flex items-center gap-1 font-medium truncate">
                                <MessageSquare size={12} className="text-gray-400 flex-shrink-0" />
                                <span className="truncate">{reasoningText}</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>

          {/* Right Column: Confusion trends & Actions (Takes 1/3 space) */}
          <div className="lg:col-span-1 flex flex-col gap-4 overflow-hidden">
            
            {/* Visual Confusion trends */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col gap-3 overflow-hidden flex-1 min-h-0">
              <h3 className="text-sm font-black text-gray-800 flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" />
                <span>Visual Confusion Pairs</span>
              </h3>
              <p className="text-xs text-gray-500 font-medium leading-relaxed">
                Letter pairs this child confuses most frequently. Useful for spelling and sensory exercises.
              </p>
              
              <div className="flex-1 overflow-y-auto min-h-0 space-y-2.5 pt-1">
                {confusionTrends.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-400 font-medium">
                    No confusion patterns detected yet! ✨
                  </div>
                ) : (
                  confusionTrends.map((trend) => (
                    <div key={trend.pair} className="flex items-center justify-between p-2.5 rounded-2xl bg-amber-50/50 border border-amber-100">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base font-black text-amber-900 bg-amber-100/70 w-9 h-9 rounded-full flex items-center justify-center">
                          {trend.pair}
                        </span>
                        <div className="text-sm text-gray-500 font-bold">
                          Confused <span className="text-gray-800">{trend.target}</span> with <span className="text-gray-800">{trend.selected}</span>
                        </div>
                      </div>
                      <span className="text-xs font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                        {trend.count}x
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="bg-white/60 border border-white/40 shadow-sm rounded-3xl p-5 flex flex-col gap-3 justify-center items-center text-center select-none">
              <button
                onClick={() => navigate("/roadmap")}
                className="w-full bg-[#4A90E2] hover:bg-[#357ABD] text-white font-extrabold text-sm py-3.5 rounded-2xl shadow-md transition-all active:scale-98"
              >
                🏠 Return to Roadmap
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
