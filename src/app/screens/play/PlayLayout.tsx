import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { ChildScreen } from "../../components/ChildScreen";
import { TopBar } from "../../components/TopBar";
import { useAuth } from "../../contexts/AuthContext";
import { useSession } from "../../contexts/SessionContext";

/**
 * The frame every activity in a session renders inside.
 *
 * One header for the whole session rather than nine screens each building their
 * own, which is why the progress bar, avatar and exit button used to sit in a
 * different place on every step. Progress is the real fraction of the session's
 * activities completed, replacing the hardcoded 10/20/30/40/70/80 each screen
 * used to pass.
 */
export function PlayLayout({
  children,
  footer,
  centerBody = true,
}: {
  children: ReactNode;
  footer?: ReactNode;
  centerBody?: boolean;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { progressPct, abandonSession } = useSession();

  function handleExit() {
    const confirmed = window.confirm("Stop practising this letter for now?");
    if (!confirmed) return;
    // Keep whatever was collected — stopping partway is itself a signal.
    abandonSession();
    navigate("/roadmap", { replace: true });
  }

  return (
    <ChildScreen
      header={
        <TopBar
          avatarEmoji={user?.user_metadata?.avatar ?? "🐻"}
          progress={progressPct}
          onExit={handleExit}
        />
      }
      footer={footer}
      centerBody={centerBody}
    >
      {children}
    </ChildScreen>
  );
}
