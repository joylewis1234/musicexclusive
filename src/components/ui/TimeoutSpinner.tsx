import { useEffect, useState, useRef } from "react";
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
 * A loading spinner that automatically times out,
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
  const [elapsed, setElapsed] = useState(0);
  const { logError } = useErrorLogger();
  const startRef = useRef(Date.now());

  useEffect(() => {
    startRef.current = Date.now();

    const timer = setTimeout(() => {
      setTimedOut(true);
      logError(page, `Spinner timeout after ${timeoutMs}ms`);
    }, timeoutMs);

    // Update elapsed time every second for user feedback
    const tick = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(tick);
    };
  }, [timeoutMs, page, logError]);

  if (timedOut) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center max-w-md space-y-5">
          <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Connection issue
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {errorMessage}
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              setTimedOut(false);
              setElapsed(0);
              startRef.current = Date.now();
              if (onRetry) {
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
      {elapsed >= 5 && (
        <p className="text-xs text-muted-foreground/60">
          Still connecting… ({elapsed}s)
        </p>
      )}
    </div>
  );
}
