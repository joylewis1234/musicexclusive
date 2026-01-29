import { useState } from "react";
import { ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { maskUserId } from "@/utils/authHelpers";

export interface DiagnosticsState {
  hasSession: boolean | null;
  userId: string | null;
  artistRowFound: boolean | null;
  tracksFetchedCount: number | null;
  lastError: string | null;
}

type Props = {
  state: DiagnosticsState;
};

/**
 * Collapsible diagnostics panel for Browser Mode debugging.
 * Only renders if we detect we're in a headless/remote browser context.
 */
export const BrowserDiagnosticsPanel = ({ state }: Props) => {
  const [isOpen, setIsOpen] = useState(true);

  // Only show in Browser Mode (remote browser automation)
  // Check for common browser automation indicators
  const isBrowserMode =
    typeof navigator !== "undefined" &&
    (navigator.webdriver === true ||
      /HeadlessChrome|Playwright|Puppeteer/i.test(navigator.userAgent) ||
      window.location.hostname.includes("preview") ||
      import.meta.env.DEV);

  if (!isBrowserMode) return null;

  const hasError = !!state.lastError;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-[9999] border-t text-xs font-mono ${
        hasError
          ? "bg-red-950/95 border-red-500/50"
          : "bg-background/95 border-border/50"
      } backdrop-blur-sm`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-muted/20"
      >
        <span className="flex items-center gap-2">
          {hasError && <AlertCircle className="w-3 h-3 text-red-400" />}
          <span className={hasError ? "text-red-300" : "text-muted-foreground"}>
            Diagnostics
          </span>
        </span>
        {isOpen ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronUp className="w-3 h-3" />
        )}
      </button>

      {isOpen && (
        <div className="px-3 pb-2 pt-1 space-y-1">
          <Row label="hasSession" value={formatBool(state.hasSession)} />
          <Row label="userId" value={maskUserId(state.userId)} />
          <Row label="artistRowFound" value={formatBool(state.artistRowFound)} />
          <Row
            label="tracksFetched"
            value={state.tracksFetchedCount?.toString() ?? "(pending)"}
          />
          {state.lastError && (
            <div className="mt-1 p-2 rounded bg-red-900/50 border border-red-500/30">
              <span className="text-red-300">Error: </span>
              <span className="text-red-200 break-words">{state.lastError}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center gap-2">
    <span className="text-muted-foreground w-28">{label}:</span>
    <span className="text-foreground">{value}</span>
  </div>
);

const formatBool = (val: boolean | null): string => {
  if (val === null) return "(pending)";
  return val ? "true" : "false";
};
