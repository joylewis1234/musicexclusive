// Force Vite cache rebuild - v7
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Global safety net for unhandled promise rejections
window.addEventListener("unhandledrejection", (event) => {
  console.error("[Global] Unhandled promise rejection:", event.reason);
  event.preventDefault();
});

try {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
} catch (e) {
  console.error("[Boot] Fatal error:", e);
  document.getElementById("root")!.innerHTML = `<div style="color:#fff;padding:2rem;font-family:sans-serif;">Boot error: ${e}</div>`;
}
