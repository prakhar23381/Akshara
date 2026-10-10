import { createBrowserRouter, Navigate } from "react-router";
import type { ReactNode } from "react";
import { ProfileNameScreen } from "./screens/ProfileNameScreen";
import { ProfileAgeScreen } from "./screens/ProfileAgeScreen";
import { ProfileAvatarScreen } from "./screens/ProfileAvatarScreen";
import { ResumeScreen } from "./screens/ResumeScreen";
import { LetterRoadmapScreen } from "./screens/LetterRoadmapScreen";
import { PlayScreen } from "./screens/play/PlayScreen";
import { HomeRedirect } from "./screens/HomeRedirect";
import { ReportScreen } from "./screens/ReportScreen";
import { ChildProgressScreen } from "./screens/ChildProgressScreen";
import { RoleScreen } from "./screens/account/RoleScreen";
import { PinSetupScreen } from "./screens/account/PinSetupScreen";
import { UnlockScreen } from "./screens/account/UnlockScreen";
import { AdultHomeScreen } from "./screens/account/AdultHomeScreen";
import { RequireAccount, RequireAdult, RequireChild } from "./components/AccountGuards";

const adult = (el: ReactNode) => <RequireAdult>{el}</RequireAdult>;
const child = (el: ReactNode) => <RequireChild>{el}</RequireChild>;
const loaded = (el: ReactNode) => <RequireAccount>{el}</RequireAccount>;

/**
 * Two areas, each behind its own guard (components/AccountGuards.tsx):
 *
 *  - **Adult** — the adult home, adding a child, reports. Needs a role, a PIN,
 *    and the PIN entered in this tab.
 *  - **Child** — resume, roadmap, play, the child's own progress. Needs a
 *    child active on this device. Leaving goes through /unlock.
 *
 * "/" decides which one a device opens in (HomeRedirect → homeRoute).
 */
export const router = createBrowserRouter([
  { path: "/", Component: HomeRedirect },

  // First-time setup and the grown-ups lock
  { path: "/setup/role", element: loaded(<RoleScreen />) },
  { path: "/setup/pin", element: loaded(<PinSetupScreen />) },
  { path: "/unlock", element: loaded(<UnlockScreen />) },

  // Adult area
  { path: "/home", element: adult(<AdultHomeScreen />) },
  { path: "/profile/name", element: adult(<ProfileNameScreen />) },
  { path: "/profile/age", element: adult(<ProfileAgeScreen />) },
  { path: "/profile/avatar", element: adult(<ProfileAvatarScreen />) },
  { path: "/report", element: adult(<ReportScreen />) },

  // Child area
  { path: "/resume", element: child(<ResumeScreen />) },
  { path: "/roadmap", element: child(<LetterRoadmapScreen />) },

  /**
   * The whole activity sequence for one letter, at one URL.
   *
   * This replaces nine separate routes — /animation, /pronunciation,
   * /example-words, /tracing, /memory, /game, /word-fill, /word-spelling and
   * /reward — each of which hardcoded the next with a navigate() call while all
   * the state that made them coherent lived in unpersisted React context. The
   * step is now derived from the session, so a refresh resumes where the child
   * left off instead of resetting the letter.
   */
  { path: "/play", element: child(<PlayScreen />) },

  // The child's own view shows effort and letters earned, never an error
  // rate; /report carries the clinical figures and is adult-only.
  { path: "/my-progress", element: child(<ChildProgressScreen />) },

  // Retired: /welcome and /user-type were the old onboarding (whose Parent
  // and Teacher buttons ran the same code); /assessment recorded nothing.
  { path: "/welcome", element: <Navigate to="/" replace /> },
  { path: "/user-type", element: <Navigate to="/" replace /> },
  { path: "/assessment", element: <Navigate to="/" replace /> },
  { path: "/progress", element: <Navigate to="/report" replace /> },
  { path: "/parent-dashboard", element: <Navigate to="/report" replace /> },

  // Anything else goes home, which decides.
  { path: "*", element: <Navigate to="/" replace /> },
]);
