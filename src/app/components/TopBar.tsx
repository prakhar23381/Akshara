import { AvatarCircle } from "./AvatarCircle";
import { ProgressBar } from "./ProgressBar";
import { X } from "lucide-react";

/**
 * The header for every child-facing screen past onboarding.
 *
 * The rule, which did not exist before: if a child is on it and it is not
 * onboarding, it gets a TopBar. That means the roadmap, the assessment, every
 * step of a play session, and the child's own progress screen. Onboarding is
 * excluded because it is linear and there is nowhere to exit to; the adult
 * report is excluded because it is not a child screen and has its own chrome.
 *
 * Nine screens used to use this and eight hand-rolled their own, which is why
 * the avatar, the progress bar and the way out each moved between pages. One
 * component means one position for all three.
 */
interface TopBarProps {
  /** `null` where the avatar already appears in the body, e.g. a hero. */
  avatarEmoji?: string | null;
  /**
   * 0–100. Pass `null` on screens that are not inside an activity — the roadmap
   * used to render `progress={0}`, a bar that could never move and told the
   * child nothing.
   */
  progress?: number | null;
  /** Shown in place of the progress bar. For destinations rather than tasks. */
  title?: string;
  onExit?: () => void;
  /** Optional control placed between the bar and the exit button. */
  action?: React.ReactNode;
}

export function TopBar({
  avatarEmoji = "👤",
  progress = null,
  title,
  onExit,
  action,
}: TopBarProps) {
  return (
    <div
      className="flex items-center gap-3"
      style={{
        paddingInline: "var(--pad-screen)",
        paddingBlock: "calc(var(--pad-screen) / 1.5)",
      }}
    >
      {avatarEmoji !== null && <AvatarCircle emoji={avatarEmoji} size="small" />}

      {progress !== null ? (
        <ProgressBar progress={progress} />
      ) : title ? (
        <h1 className="t-1 font-bold text-gray-800 tracking-wide flex-1 truncate">
          {title}
        </h1>
      ) : (
        <span className="flex-1" />
      )}

      {action}

      {onExit && (
        <button
          onClick={onExit}
          aria-label="Exit"
          className="shrink-0 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-all"
          style={{
            width: "var(--tap-min)",
            height: "var(--tap-min)",
          }}
        >
          <X className="text-gray-600" style={{ width: "55%", height: "55%" }} />
        </button>
      )}
    </div>
  );
}
