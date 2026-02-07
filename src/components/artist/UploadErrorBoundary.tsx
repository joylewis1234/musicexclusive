import React from "react";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/ui/GlowCard";
import { AlertCircle, RefreshCw, Trash2 } from "lucide-react";

interface UploadErrorBoundaryState {
  error: Error | null;
  componentStack?: string;
  /** How many times we've auto-recovered (prevents infinite loops) */
  autoRecoverCount: number;
}

interface UploadErrorBoundaryProps {
  children: React.ReactNode;
  /** Called when user clicks "Reset this form" – parent should clear all state + draft */
  onResetForm?: () => void;
}

/** Max auto-recovery attempts before showing the manual UI */
const MAX_AUTO_RECOVER = 1;

/**
 * Best-effort: wipe all upload draft keys from localStorage.
 * Returns true if any keys were cleared.
 */
function clearUploadDrafts(): boolean {
  let cleared = false;
  try {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("upload_draft_")) {
        console.error("[ArtistUpload] Clearing potentially corrupt draft key:", key);
        localStorage.removeItem(key);
        cleared = true;
      }
    });
  } catch {
    // ignore – storage may be unavailable
  }
  return cleared;
}

/**
 * A local error boundary scoped to the Upload Exclusive Track page.
 *
 * On the FIRST render-time crash it automatically clears any corrupt
 * localStorage drafts and re-renders – the user never sees the error.
 * If the crash recurs (or happens a second time) it falls through to
 * a manual recovery UI with "Try Again" / "Reset this form" buttons.
 */
export class UploadErrorBoundary extends React.Component<
  UploadErrorBoundaryProps,
  UploadErrorBoundaryState
> {
  state: UploadErrorBoundaryState = { error: null, autoRecoverCount: 0 };

  static getDerivedStateFromError(error: Error): Partial<UploadErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("[UploadErrorBoundary] Caught render error:", error, info);

    // --- Auto-recover on first crash ---
    if (this.state.autoRecoverCount < MAX_AUTO_RECOVER) {
      console.warn("[UploadErrorBoundary] Auto-recovering: clearing drafts and re-rendering...");
      clearUploadDrafts();
      this.setState((prev) => ({
        error: null,
        componentStack: undefined,
        autoRecoverCount: prev.autoRecoverCount + 1,
      }));
      return;
    }

    // Beyond auto-recover limit – show manual UI
    this.setState({ componentStack: info.componentStack });
  }

  /** Clear the boundary error so the children re-render normally */
  public clearError = () => {
    this.setState({ error: null, componentStack: undefined });
  };

  /**
   * "Try Again" – clear corrupt localStorage drafts, then dismiss overlay.
   */
  private handleDismiss = () => {
    clearUploadDrafts();
    this.clearError();
  };

  private handleResetForm = () => {
    clearUploadDrafts();
    this.props.onResetForm?.();
    this.clearError();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="px-4 py-10 max-w-lg mx-auto">
        <GlowCard className="p-5 border-destructive/40">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <h2 className="font-display text-base font-semibold">
                Something went wrong
              </h2>
              <p className="text-sm text-muted-foreground">
                The upload form couldn't load correctly. Please try resetting the form below.
              </p>
              <pre className="mt-2 text-xs bg-muted/50 p-3 rounded overflow-x-auto whitespace-pre-wrap break-words max-h-32 text-muted-foreground">
                {this.state.error.message}
              </pre>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button size="sm" onClick={this.handleDismiss}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Try Again
            </Button>
            <Button variant="outline" size="sm" onClick={this.handleResetForm}>
              <Trash2 className="h-4 w-4 mr-1" />
              Reset this form
            </Button>
          </div>
        </GlowCard>
      </div>
    );
  }
}
