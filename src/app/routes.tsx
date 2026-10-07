import { createBrowserRouter, Navigate } from "react-router";
import { WelcomeScreen } from "./screens/WelcomeScreen";
import { UserTypeScreen } from "./screens/UserTypeScreen";
import { ProfileNameScreen } from "./screens/ProfileNameScreen";
import { ProfileAgeScreen } from "./screens/ProfileAgeScreen";
import { ProfileAvatarScreen } from "./screens/ProfileAvatarScreen";
import { AssessmentScreen } from "./screens/AssessmentScreen";
import { ResumeScreen } from "./screens/ResumeScreen";
import { LetterRoadmapScreen } from "./screens/LetterRoadmapScreen";
import { PlayScreen } from "./screens/play/PlayScreen";
import { HomeRedirect } from "./screens/HomeRedirect";
import { ReportScreen } from "./screens/ReportScreen";
import { ChildProgressScreen } from "./screens/ChildProgressScreen";

export const router = createBrowserRouter([
  { path: "/", Component: HomeRedirect },

  // Onboarding
  { path: "/welcome", Component: WelcomeScreen },
  { path: "/user-type", Component: UserTypeScreen },
  { path: "/profile/name", Component: ProfileNameScreen },
  { path: "/profile/age", Component: ProfileAgeScreen },
  { path: "/profile/avatar", Component: ProfileAvatarScreen },
  { path: "/assessment", Component: AssessmentScreen },

  // Home
  { path: "/resume", Component: ResumeScreen },
  { path: "/roadmap", Component: LetterRoadmapScreen },

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
  { path: "/play", Component: PlayScreen },

  // Reports.
  // The child's own view and the adult report are separate artifacts: the
  // child's shows effort and letters earned and never an error rate, while
  // /report carries the clinical figures. /progress and /parent-dashboard were
  // two overlapping adult reports and now both resolve to the merged one.
  { path: "/my-progress", Component: ChildProgressScreen },
  { path: "/report", Component: ReportScreen },
  { path: "/progress", element: <Navigate to="/report" replace /> },
  { path: "/parent-dashboard", element: <Navigate to="/report" replace /> },

  // Anything else — including the retired activity URLs — goes home.
  { path: "*", element: <Navigate to="/roadmap" replace /> },
]);
