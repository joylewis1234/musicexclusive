import React from "react";
import { ShieldX, RefreshCw, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

interface State {
  hasError: boolean;
  error: Error | null;
}

interface Props {
  children: React.ReactNode;
  onRetry?: () => void;
  onLogin?: () => void;
}

export class AuthErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("[AuthErrorBoundary] Auth flow error:", error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[200px] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
            <ShieldX className="w-6 h-6 text-amber-500" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Authentication Error
          </h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">
            {this.state.error?.message || "There was a problem verifying your session."}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={this.handleRetry}>
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Retry
            </Button>
            {this.props.onLogin && (
              <Button onClick={this.props.onLogin}>
                <LogIn className="w-4 h-4 mr-1.5" />
                Sign In
              </Button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
