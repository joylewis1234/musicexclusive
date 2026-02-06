import React from "react";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/ui/GlowCard";
import { AlertCircle, RefreshCw, Trash2 } from "lucide-react";

interface UploadErrorBoundaryState {
  error: Error | null;
  componentStack?: string;
}

interface UploadErrorBoundaryProps {
  children: React.ReactNode;
  /** Called when user clicks "Reset this form" – parent should clear all state + draft */
  onResetForm?: () => void;
}

/**
 * A local error boundary scoped to the Upload Exclusive Track page.
 * Catches render-time exceptions from file handling / preview / compression
 * and shows a friendly inline recovery UI instead of crashing the whole app.
 */
export class UploadErrorBoundary extends React.Component<
  UploadErrorBoundaryProps,
  UploadErrorBoundaryState
> {
  state: UploadErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): Partial<UploadErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("[UploadErrorBoundary] Caught render error:", error, info);
    this.setState({ componentStack: info.componentStack });
  }

  /** Clear the boundary error so the children re-render normally */
  public clearError = () => {
    this.setState({ error: null, componentStack: undefined });
  };

  private handleDismiss = () => {
    this.clearError();
  };

  private handleResetForm = () => {
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
                We couldn't process that file. Please try a different image or audio file.
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
