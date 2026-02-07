import React from "react";

interface UploadErrorBoundaryState {
  /** Number of auto-recovery attempts */
  recoveryCount: number;
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
 * NON-BLOCKING error boundary for the Upload Exclusive Track page.
 *
 * On ANY render-time crash it:
 *   1. Clears corrupt localStorage drafts.
 *   2. Re-renders the children — NEVER shows a blocking overlay.
 *
 * This ensures the upload form is always visible. File-processing
 * errors are handled inline by the form itself (try/catch in handlers),
 * not by this boundary.
 */
export class UploadErrorBoundary extends React.Component<
  UploadErrorBoundaryProps,
  UploadErrorBoundaryState
> {
  state: UploadErrorBoundaryState = { recoveryCount: 0 };

  static getDerivedStateFromError(_error: Error): Partial<UploadErrorBoundaryState> | null {
    // Don't set an error flag – we ALWAYS want to re-render children.
    // Returning null means "don't change state from this static method".
    return null;
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("[UploadErrorBoundary] Caught render error (recovering silently):", error, info);

    // Safety: cap recovery attempts to prevent infinite loops
    if (this.state.recoveryCount >= 3) {
      console.error("[UploadErrorBoundary] Max recovery attempts reached. Calling onResetForm.");
      clearUploadDrafts();
      this.props.onResetForm?.();
      // Don't setState again to avoid loop
      return;
    }

    clearUploadDrafts();

    // Bump recovery count and re-render children
    this.setState((prev) => ({
      recoveryCount: prev.recoveryCount + 1,
    }));
  }

  /** Allow parent to call this imperatively */
  public clearError = () => {
    this.setState({ recoveryCount: 0 });
  };

  render() {
    // ALWAYS render children – never show a blocking error overlay
    return this.props.children;
  }
}
