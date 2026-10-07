
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";

  createRoot(document.getElementById("root")!).render(<App />);

  // Layout guard: the app is fixed-viewport, so anything overflowing is a bug.
  // Also exposed as window.__aksharaOverflow() for checking on a real device.
  if (import.meta.env.DEV) {
    import("./app/lib/devOverflowCheck").then(({ startOverflowCheck }) =>
      startOverflowCheck(),
    );
  }
  