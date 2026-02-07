import React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

interface UploadErrorBoundaryState {
  /** Number of silent auto-recovery attempts */
  recoveryCount: number;
  /** true once we've exhausted silent recovery and need to show fallback UI */
  stuck: boolean;
}

interface UploadErrorBoundaryProps {
  children: React.ReactNode;
  /** Called when user clicks "Reset this form" – parent should clear all state + draft */
  onResetForm?: () => void;
}

/**
 * Best-effort: wipe all upload draft keys from localStorage.
 */
function clearUploadDrafts(): void {
  try {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("upload_draft_")) {
        console.error("[ArtistUpload] Clearing potentially corrupt draft key:", key);
        localStorage.removeItem(key);
      }
    });
  } catch {
    // ignore – storage may be unavailable
  }
}

/**
 * Error boundary for the Upload Exclusive Track page.
 *
 * On the first few render-time crashes it silently clears corrupt
 * localStorage drafts and re-renders the children.
 *
 * If crashes persist (recoveryCount >= 3) it shows a minimal
 * recovery UI with a "Dismiss" button that navigates to
 * /artist/upload?resetUpload=1 – guaranteeing the user always
 * escapes the crash loop.
 */
export class UploadErrorBoundary extends React.Component<
  UploadErrorBoundaryProps,
  UploadErrorBoundaryState
> {
  state: UploadErrorBoundaryState = { recoveryCount: 0, stuck: false };

  static getDerivedStateFromError(_error: Error): Partial<UploadErrorBoundaryState> | null {
    // Return null so we handle everything in componentDidCatch
    return null;
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("[UploadErrorBoundary] Caught render error:", error, info);

    clearUploadDrafts();

    // If we've already tried 3 silent recoveries, give up silently
    // and show the minimal recovery UI instead.
    if (this.state.recoveryCount >= 3) {
      console.error("[UploadErrorBoundary] Max silent recoveries reached – showing fallback UI.");
      this.setState({ stuck: true });
      return;
    }

    // Otherwise bump count and re-render children
    this.setState((prev) => ({
      recoveryCount: prev.recoveryCount + 1,
    }));
  }

  /** Allow parent to call this imperatively */
  public clearError = () => {
    this.setState({ recoveryCount: 0, stuck: false });
  };

  /** Hard-reset: clear drafts then navigate to the escape-hatch URL */
  private handleDismiss = () => {
    clearUploadDrafts();
    // Navigate to the hard-reset URL – this reloads the page and
    // clears all in-memory state.
    window.location.href = "/artist/upload?resetUpload=1";
  };

  render() {
    // If stuck after max recovery attempts, show a minimal non-blocking
    // recovery card (NOT a full-screen overlay).
    if (this.state.stuck) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-sm w-full rounded-xl border border-border bg-card p-6 text-center space-y-4">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
            <h2 className="text-lg font-semibold">Upload form couldn't load</h2>
            <p className="text-sm text-muted-foreground">
              Cached data may have been corrupted. Tap below to clear it and reload.
            </p>
            <button
              onClick={this.handleDismiss}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Dismiss &amp; Reset
            </button>
          </div>
        </div>
      );
    }

    // Normal path: always render children
    return this.props.children;
  }
}
