import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { ChildScreen } from "../../components/ChildScreen";
import { TopBar } from "../../components/TopBar";
import { useAccount } from "../../contexts/AccountContext";
import { useSession } from "../../contexts/SessionContext";
import { Mitthu } from "../../components/Mitthu";
import { say } from "../../components/Bubble";
import { INSTRUCTION } from "../../data/mitthuLines";
import { sessionAttempts } from "../../types/session";
import { useEffect } from "react";

/**
 * Steps whose own sound starts on its own: Mitthu's line is shown but not
 * spoken there, so it never talks over the letter.
 */
const PLAYS_ITS_OWN_SOUND = ["intro", "identify", "warmup", "teach_mitthu"];

/** The last three answers right without help (docs/11 §3.8): the bar glows. */
function onARun(attempts: ReturnType<typeof sessionAttempts>): boolean {
  const last = attempts.slice(-3);
  return last.length === 3 && last.every((a) => !a.was_guided_win && a.target_letter === a.selected_letter);
}

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
  const { activeChild } = useAccount();
  const { progressPct, abandonSession, currentStep, session } = useSession();
  const line = currentStep ? INSTRUCTION[currentStep] : undefined;
  const glow = session ? onARun(sessionAttempts(session)) : false;

  // Mitthu says each game's instruction as it starts, in Hindi (docs/11 §3.1;
  // design_guidelines §9.6: the English instructions were unreadable to the
  // children they were for).
  useEffect(() => {
    if (line && currentStep && !PLAYS_ITS_OWN_SOUND.includes(currentStep)) say(line.hi);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

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
        <>
          <TopBar
            avatarEmoji={activeChild?.avatar ?? "🐻"}
            progress={progressPct}
            glow={glow}
            onExit={handleExit}
          />
          {line && (
            <button
              onClick={() => say(line.hi)}
              className="flex items-center gap-2 mx-auto max-w-xl w-full text-left"
              style={{ paddingInline: "var(--pad-screen)" }}
              aria-label={`${line.hi} — ${line.en}. Tap to hear.`}
            >
              <span className="shrink-0">
                <Mitthu pose="listen" size={40} />
              </span>
              <span className="letter-glyph min-w-0 rounded-xl border-2 border-[var(--c-line)] bg-white px-2 py-1 t--1 font-semibold text-[var(--c-ink)]">
                {line.hi} <span aria-hidden className="opacity-60">🔊</span>
              </span>
            </button>
          )}
        </>
      }
      footer={footer}
      centerBody={centerBody}
    >
      {children}
    </ChildScreen>
  );
}
