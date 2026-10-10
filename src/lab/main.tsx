import { createRoot } from "react-dom/client";
import { isolateStorage } from "./memoryStorage";
import "../styles/index.css";

/**
 * The report lab — development only. `vite build` builds index.html alone, so
 * neither this page nor anything only it imports reaches production.
 *
 * Storage is isolated before any app module loads, which is why the lab itself
 * is imported dynamically. Offline mode keeps every app write on the device:
 * fixtures go through the real session writer, which otherwise mirrors to
 * Supabase.
 */
const root = document.getElementById("root")!;
try {
  isolateStorage({ akshara_offline_mode: "true" });
  import("./Lab").then(({ Lab }) => createRoot(root).render(<Lab />));
} catch (err) {
  root.textContent = `Report lab not started: ${(err as Error).message}. It will not run against real storage.`;
}
