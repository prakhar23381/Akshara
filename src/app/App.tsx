import { RouterProvider } from "react-router";
import { router } from "./routes";
import { LevelConfigProvider } from "./hooks/useLevelConfig";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LoginScreen } from "./screens/LoginScreen";
import { ProfileSetupProvider } from "./contexts/ProfileSetupContext";

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
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

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <ProfileSetupProvider>
      <LevelConfigProvider>
        <RouterProvider router={router} />
      </LevelConfigProvider>
    </ProfileSetupProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
