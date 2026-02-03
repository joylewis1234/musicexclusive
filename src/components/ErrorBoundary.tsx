import React from "react";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/ui/GlowCard";

type ErrorBoundaryState = {
  error: Error | null;
  componentStack?: string;
  lastRejection?: unknown;
};

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null, componentStack: undefined, lastRejection: undefined };

  private isBenignAbortRejection = (reason: unknown): boolean => {
    const anyReason = reason as any;
    const name = String(anyReason?.name ?? "");
    const message = String(anyReason?.message ?? anyReason ?? "");
    const combined = `${name} ${message}`.toLowerCase();

    // Common harmless cases during route changes/unmounts
    return (
      name === "AbortError" ||
      combined.includes("signal is aborted") ||
      combined.includes("request cancelled") ||
      combined.includes("request canceled") ||
      combined.includes("cancelled") ||
      combined.includes("canceled")
    );
  };

  private onUnhandledRejection = (event: PromiseRejectionEvent) => {
    if (this.isBenignAbortRejection(event.reason)) return;
    // Don’t crash the page; surface the error.
    this.setState({ lastRejection: event.reason });
  };

  componentDidMount(): void {
    window.addEventListener("unhandledrejection", this.onUnhandledRejection);
  }

  componentWillUnmount(): void {
    window.removeEventListener("unhandledrejection", this.onUnhandledRejection);
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Keep it minimal but informative.
    console.error("[ErrorBoundary] Caught render error:", error, info);
    this.setState({ componentStack: info.componentStack });
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    const { error, componentStack, lastRejection } = this.state;
    if (!error && !lastRejection) return this.props.children;

    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="max-w-xl mx-auto space-y-4">
          <GlowCard className="p-5">
            <h1 className="font-display text-lg font-semibold tracking-wide">Something went wrong</h1>
            <p className="text-sm text-muted-foreground mt-1">
              The app hit an error instead of rendering this page. This prevents a white-screen and helps debug.
            </p>

            {error && (
              <pre className="mt-4 text-xs bg-muted/50 p-3 rounded overflow-x-auto whitespace-pre-wrap break-words">
                {error.name}: {error.message}
              </pre>
            )}

            {lastRejection && !error && (
              <pre className="mt-4 text-xs bg-muted/50 p-3 rounded overflow-x-auto whitespace-pre-wrap break-words">
                Unhandled promise rejection: {String((lastRejection as any)?.message ?? lastRejection)}
              </pre>
            )}

            {componentStack && (
              <pre className="mt-3 text-[11px] text-muted-foreground bg-muted/30 p-3 rounded overflow-x-auto whitespace-pre-wrap break-words">
                {componentStack.trim()}
              </pre>
            )}

            <div className="mt-4 flex gap-2">
              <Button onClick={this.handleReload}>Reload</Button>
              <Button variant="outline" onClick={() => this.setState({ error: null, componentStack: undefined, lastRejection: undefined })}>
                Dismiss
              </Button>
            </div>
          </GlowCard>
        </div>
      </div>
    );
  }
}
