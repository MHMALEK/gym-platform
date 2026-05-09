import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./i18n";
import "./index.css";
import App from "./App.tsx";

if (import.meta.env.DEV) {
  // eslint-disable-next-line no-console -- intentional dev-only hint for stale-browser issues
  console.info(
    "[Gym Coach] Vite dev. If the UI looks unchanged, use the URL from this terminal (port may not be 5173) and hard-refresh (Cmd+Shift+R / Ctrl+Shift+R).",
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
