import { ReactNode, useCallback } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useArtistAccessCache } from "@/hooks/useArtistAccessCache";
import { TimeoutSpinner } from "@/components/ui/TimeoutSpinner";
import { Loader2, AlertTriangle, RotateCcw } from "lucide-react";

interface ArtistProtectedRouteProps {
  children: ReactNode;
}

/**
 * Artist route guard.
 *
 * - Blocks ONLY while auth is initially loading (user + role not yet resolved).
 * - Once role=artist is known, renders children immediately.
 * - Artist profile verification runs once per session and is cached for 30 min.
 * - Verification is shown as a small inline banner, never full-screen.
 * - Upload actions, re-renders, file selection, etc. never re-trigger verification.
 */
export const ArtistProtectedRoute = ({ children }: ArtistProtectedRouteProps) => {
  const { user, role, isLoading: authLoading, refreshRole } = useAuth();
  const location = useLocation();
  const { gateResult, isVerifying, verificationError, retryVerification } =
    useArtistAccessCache();

  const handleRetry = useCallback(() => {
    // Try refreshing the role first, then fall back to reload
    refreshRole().catch(() => {
      window.location.reload();
    });
  }, [refreshRole]);

  // ── 1. Auth loading (fast — initial session + role resolution) ──
  // 30s timeout for slow mobile connections (was 15s — too aggressive for Android)
  if (authLoading || (user && !role)) {
    return (
      <TimeoutSpinner
        page="ArtistProtectedRoute"
        loadingMessage="Connecting to your account…"
        errorMessage="Session timed out. Tap Retry — if it keeps failing, close and reopen the app."
        timeoutMs={30_000}
        onRetry={handleRetry}
      />
    );
  }

  // ── 2. Not authenticated ──
  if (!user) {
    console.log("[ArtistProtectedRoute] ❌ Redirect: no authenticated user → /artist/login");
    return <Navigate to="/artist/login" state={{ from: location }} replace />;
  }

  // ── 3. Wrong role ──
  if (role !== "artist") {
    console.log("[ArtistProtectedRoute] ❌ Redirect: role is", role, "→ /access-restricted");
    return (
      <Navigate
        to="/access-restricted"
        state={{ userRole: role, requiredRole: "artist" }}
        replace
      />
    );
  }

  // ── 4. Artist role confirmed — handle gate result NON-BLOCKINGLY ──
  // If we have a definitive gate result that requires redirect, do it.
  if (gateResult === "app_approved_pending") {
    if (location.pathname !== "/artist/setup-account") {
      return <Navigate to="/artist/setup-account" replace />;
    }
  }

  if (gateResult === "app_pending" || gateResult === "app_rejected") {
    return <Navigate to="/artist/application-status" replace />;
  }

  // ── 5. Render children IMMEDIATELY with optional inline indicator ──
  return (
    <>
      {/* Inline verification indicator — never blocks the page */}
      <ArtistVerificationBanner
        isVerifying={isVerifying}
        error={verificationError}
        onRetry={retryVerification}
      />
      {children}
    </>
  );
};

/* ------------------------------------------------------------------ */
/*  Inline verification banner (non-blocking)                          */
/* ------------------------------------------------------------------ */

interface BannerProps {
  isVerifying: boolean;
  error: string | null;
  onRetry: () => void;
}

function ArtistVerificationBanner({ isVerifying, error, onRetry }: BannerProps) {
  // Nothing to show — verification cached or completed successfully
  if (!isVerifying && !error) return null;

  // Verifying in background — tiny inline indicator
  if (isVerifying && !error) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-b border-border text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Verifying artist access…</span>
      </div>
    );
  }

  // Verification error — inline warning with retry
  if (error) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-2 bg-destructive/10 border-b border-destructive/20 text-xs">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span>{error}</span>
        </div>
        <button
          onClick={onRetry}
          className="flex items-center gap-1 text-primary hover:underline whitespace-nowrap"
        >
          <RotateCcw className="h-3 w-3" />
          Retry
        </button>
      </div>
    );
  }

  return null;
}
