import { createRoot } from "react-dom/client";
import { isolateStorage } from "../memoryStorage";
import "../../styles/index.css";

/**
 * The play lab — development only, like the report lab. `vite build` builds
 * index.html alone, so neither this page nor anything only it imports reaches
 * production.
 *
 * Nothing here writes app data, but storage is isolated anyway so a prototype
 * can never touch the guest child at localhost:5173.
 */
const root = document.getElementById("root")!;
try {
  isolateStorage({ akshara_offline_mode: "true" });
  import("./PlayLab").then(({ PlayLab }) => createRoot(root).render(<PlayLab />));
} catch (err) {
  root.textContent = `Play lab not started: ${(err as Error).message}. It will not run against real storage.`;
}
