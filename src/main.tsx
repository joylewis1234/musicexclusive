import React, { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log("[Boot] main.tsx executing");

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

window.addEventListener("unhandledrejection", (event) => {
  console.error("[Global] Unhandled promise rejection:", event.reason);
});

const rootEl = document.getElementById("root");

if (!rootEl) {
  document.body.innerHTML = '<div style="color:#fff;padding:2rem;background:#000;font-family:sans-serif;">Fatal: #root element missing</div>';
} else {
  try {
    console.log("[Boot] Creating root");
    const root = createRoot(rootEl);
    root.render(
      <React.StrictMode>
        <BootErrorBoundary>
          <App />
        </BootErrorBoundary>
      </React.StrictMode>
    );
    console.log("[Boot] render() called successfully");
  } catch (e) {
    console.error("[Boot] Fatal error:", e);
    rootEl.innerHTML = `<div style="color:#fff;padding:2rem;font-family:sans-serif;background:#000;min-height:100vh;">
      <h1>Boot Error</h1>
      <p style="color:#aaa;margin:1rem 0;">${e}</p>
      <button onclick="location.reload()" style="padding:8px 20px;background:#fff;color:#000;border:none;border-radius:6px;cursor:pointer;">Reload</button>
    </div>`;
  }
}
