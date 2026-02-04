import React from "react";
import { CreditCard, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface State {
  hasError: boolean;
  error: Error | null;
}

interface Props {
  children: React.ReactNode;
  onRetry?: () => void;
  onBack?: () => void;
}

export class PaymentErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("[PaymentErrorBoundary] Payment flow error:", error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[300px] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <CreditCard className="w-6 h-6 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Payment Error
          </h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">
            {this.state.error?.message || "Something went wrong with the payment process. Your card was not charged."}
          </p>
          <div className="flex gap-3">
            {this.props.onBack && (
              <Button variant="outline" onClick={this.props.onBack}>
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Go Back
              </Button>
            )}
            <Button onClick={this.handleRetry}>
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
