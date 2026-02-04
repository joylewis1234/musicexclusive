import React from "react";
import { Music, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface State {
  hasError: boolean;
  error: Error | null;
}

interface Props {
  children: React.ReactNode;
  onRetry?: () => void;
  emptyMessage?: string;
}

export class TrackListErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("[TrackListErrorBoundary] Track list error:", error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl bg-muted/20 p-6 text-center border border-border/30">
          <Music className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">
            Couldn't load tracks
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            {this.state.error?.message || "Something went wrong loading the track list"}
          </p>
          <Button size="sm" variant="outline" onClick={this.handleRetry}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
