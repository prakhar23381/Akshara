import { createBrowserRouter } from "react-router";
import { WelcomeScreen } from "./screens/WelcomeScreen";
import { UserTypeScreen } from "./screens/UserTypeScreen";
import { ProfileNameScreen } from "./screens/ProfileNameScreen";
import { ProfileAgeScreen } from "./screens/ProfileAgeScreen";
import { ProfileAvatarScreen } from "./screens/ProfileAvatarScreen";
import { AssessmentScreen } from "./screens/AssessmentScreen";
import { ResumeScreen } from "./screens/ResumeScreen";
import { AnimationScreen } from "./screens/AnimationScreen";
import { PronunciationScreen } from "./screens/PronunciationScreen";
import { ExampleWordsScreen } from "./screens/ExampleWordsScreen";
import { GameScreen } from "./screens/GameScreen";
import { TracingScreen } from "./screens/TracingScreen";
import { RewardScreen } from "./screens/RewardScreen";
import { TransitionScreen } from "./screens/TransitionScreen";
import { HomeRedirect } from "./screens/HomeRedirect";
import { ProgressScreen } from "./screens/ProgressScreen";
import { ParentDashboardScreen } from "./screens/ParentDashboardScreen";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: HomeRedirect,
  },
  {
    path: "/welcome",
    Component: WelcomeScreen,
  },
  {
    path: "/user-type",
    Component: UserTypeScreen,
  },
  {
    path: "/profile/name",
    Component: ProfileNameScreen,
  },
  {
    path: "/profile/age",
    Component: ProfileAgeScreen,
  },
  {
    path: "/profile/avatar",
    Component: ProfileAvatarScreen,
  },
  {
    path: "/assessment",
    Component: AssessmentScreen,
  },
  {
    path: "/resume",
    Component: ResumeScreen,
  },
  {
    path: "/animation",
    Component: AnimationScreen,
  },
  {
    path: "/pronunciation",
    Component: PronunciationScreen,
  },
  {
    path: "/example-words",
    Component: ExampleWordsScreen,
  },
  {
    path: "/game",
    Component: GameScreen,
  },
  {
    path: "/tracing",
    Component: TracingScreen,
  },
  {
    path: "/reward",
    Component: RewardScreen,
  },
  {
    path: "/transition",
    Component: TransitionScreen,
  },
  {
    path: "/progress",
    Component: ProgressScreen,
  },
  {
    path: "/parent-dashboard",
    Component: ParentDashboardScreen,
  },
]);
