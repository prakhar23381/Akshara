import { useState } from "react";
import { motion } from "motion/react";
import { useAuth } from "../contexts/AuthContext";

export function LoginScreen() {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  async function handleGoogleLogin() {
    setLoading(true);
    await signInWithGoogle();
    // Page will redirect — no need to reset loading
  }

  return (
    <div className="h-screen bg-[#F7F6F2] flex flex-col items-center justify-center gap-12 p-8">
      {/* Logo / branding */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="text-8xl mb-6"
        >
          📖
        </motion.div>
        <h1 className="text-6xl font-bold text-gray-800 tracking-wide mb-3">
          Akshara
        </h1>
        <p className="text-2xl text-gray-500 tracking-wide">
          Learn Hindi letters — one step at a time
        </p>
      </motion.div>

      {/* Login card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="bg-white rounded-3xl shadow-lg px-10 py-8 flex flex-col items-center gap-6 w-full max-w-sm"
      >
        <p className="text-xl text-gray-600 text-center">
          Sign in to save your progress
        </p>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 hover:border-gray-400 rounded-2xl px-6 py-4 text-lg font-semibold text-gray-700 transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {/* Google logo SVG */}
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {loading ? "Redirecting…" : "Continue with Google"}
        </button>

        <p className="text-sm text-gray-400 text-center">
          Your learning data is private and only used to personalise your lessons.
        </p>
      </motion.div>
    </div>
  );
}
