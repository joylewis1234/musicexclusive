import { useEffect, useState } from "react";
import { Loader2, AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useErrorLogger } from "@/hooks/useErrorLogger";

interface TimeoutSpinnerProps {
  /** Page/component identifier for logging */
  page?: string;
  /** Timeout in ms before showing error (default 10 000) */
  timeoutMs?: number;
  /** Custom message shown while loading */
  loadingMessage?: string;
  /** Custom error message shown on timeout */
  errorMessage?: string;
  /** Optional retry callback */
  onRetry?: () => void;
}

/**
 * A loading spinner that automatically times out after 10 seconds,
 * shows a friendly error message with a Retry button, and logs
 * the timeout to app_error_logs.
 */
export function TimeoutSpinner({
  page = "unknown",
  timeoutMs = 10_000,
  loadingMessage = "Loading…",
  errorMessage = "This is taking longer than expected. Please try again.",
  onRetry,
}: TimeoutSpinnerProps) {
  const [timedOut, setTimedOut] = useState(false);
  const { logError } = useErrorLogger();

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimedOut(true);
      logError(page, `Spinner timeout after ${timeoutMs}ms`);
    }, timeoutMs);

    return () => clearTimeout(timer);
  }, [timeoutMs, page, logError]);

  if (timedOut) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center max-w-md space-y-5">
          <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Something went wrong
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {errorMessage}
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              if (onRetry) {
                setTimedOut(false);
                onRetry();
              } else {
                window.location.reload();
              }
            }}
            className="gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{loadingMessage}</p>
    </div>
  );
}
