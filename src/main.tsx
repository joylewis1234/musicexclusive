// Force Vite cache rebuild - v9
import React, { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log("[Boot] Script entry v9");
(window as any).__APP_BOOT_SCRIPT_LOADED__ = true;

// Top-level error boundary that catches crashes from ALL providers
class BootErrorBoundary extends React.Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(e: Error) {
    return { error: e };
  }

  componentDidCatch(e: Error) {
    console.error("[BootErrorBoundary]", e);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: "2rem",
            color: "#fff",
            background: "#000",
            minHeight: "100vh",
            fontFamily: "sans-serif",
            textAlign: "center",
          }}
        >
          <h1 style={{ marginBottom: "1rem" }}>Something went wrong</h1>
          <p style={{ marginBottom: "1rem", color: "#aaa" }}>
            {this.state.error.message}
          </p>
          <button
            onClick={() => location.reload()}
            style={{
              padding: "0.5rem 1.5rem",
              background: "#fff",
              color: "#000",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Global safety net for unhandled promise rejections — do NOT preventDefault
// so errors remain visible in devtools and monitoring
window.addEventListener("unhandledrejection", (event) => {
  console.error("[Global] Unhandled promise rejection:", event.reason);
});

try {
  console.log("[Boot] Creating root");
  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <BootErrorBoundary>
        <App />
      </BootErrorBoundary>
    </React.StrictMode>
  );
  console.log("[Boot] render() called");
} catch (e) {
  console.error("[Boot] Fatal error:", e);
  document.getElementById("root")!.innerHTML = `<div style="color:#fff;padding:2rem;font-family:sans-serif;">Boot error: ${e}</div>`;
}
