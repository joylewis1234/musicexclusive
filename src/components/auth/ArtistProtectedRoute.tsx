import { ReactNode, useCallback, useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useArtistAccessCache } from "@/hooks/useArtistAccessCache";
import { TimeoutSpinner } from "@/components/ui/TimeoutSpinner";
import { SUPABASE_PROJECT_ID } from "@/config/supabase";
import { Loader2, AlertTriangle, RotateCcw } from "lucide-react";

interface ArtistProtectedRouteProps {
  children: ReactNode;
}

/**
 * Quick check: does the browser have a cached Supabase session in localStorage?
 * If yes, the user was previously logged in and we can skip the full-screen blocker.
 * This prevents Android/slow-mobile users from hitting the timeout spinner.
 */
function hasCachedSupabaseSession(): boolean {
  try {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    if (!projectId) return false;
    const key = `sb-${projectId}-auth-token`;
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    // Check that the cached session has an access token
    return !!(parsed?.access_token || parsed?.currentSession?.access_token);
  } catch {
    return false;
  }
}

/**
 * Artist route guard.
 *
 * - If a cached session exists (returning user), renders children immediately
 *   with a small inline banner while auth finishes resolving.
 * - Only shows full-screen spinner for genuinely new sessions (no cache).
 * - Once role=artist is known, children render with no overhead.
 * - Artist profile verification runs once per session, cached for 30 min.
 */
export const ArtistProtectedRoute = ({ children }: ArtistProtectedRouteProps) => {
  const { user, role, userRoles, isLoading: authLoading, refreshRole, setActiveRole } = useAuth();
  const location = useLocation();
  const { gateResult, isVerifying, verificationError, retryVerification } =
    useArtistAccessCache();

  // Memoize the cached session check (only runs once per mount)
  const cachedSession = useMemo(() => hasCachedSupabaseSession(), []);

  const handleRetry = useCallback(() => {
    refreshRole().catch(() => {
      window.location.reload();
    });
  }, [refreshRole]);

  // ── 1. Auth loading ──
  if (authLoading || (user && !role)) {
    // If there's a cached session, the user was logged in before.
    // Render the page immediately with a small banner instead of blocking.
    if (cachedSession) {
      return (
        <>
          <AuthResolvingBanner onRetry={handleRetry} />
          {children}
        </>
      );
    }

    // No cached session → first-time login or cleared data → must block
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

  // ── 3. Wrong role — but check if user has artist role and just needs switching ──
  if (role !== "artist") {
    // If the user has the artist role but it's not active (e.g., after OAuth redirect),
    // automatically switch to artist role instead of blocking access
    if (userRoles.includes("artist")) {
      console.log("[ArtistProtectedRoute] 🔄 User has artist role, switching active role to artist");
      setActiveRole("artist");
      // Return loading while role switches
      return (
        <TimeoutSpinner
          page="ArtistProtectedRoute"
          loadingMessage="Switching to artist mode…"
          errorMessage="Could not switch roles. Please try again."
          timeoutMs={5_000}
        />
      );
    }

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
/*  Inline auth-resolving banner (shown while auth loads with cache)    */
/* ------------------------------------------------------------------ */

function AuthResolvingBanner({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 bg-primary/5 border-b border-primary/20 text-xs">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Connecting to your account…</span>
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

/* ------------------------------------------------------------------ */
/*  Inline verification banner (non-blocking)                          */
/* ------------------------------------------------------------------ */

interface BannerProps {
  isVerifying: boolean;
  error: string | null;
  onRetry: () => void;
}

function ArtistVerificationBanner({ isVerifying, error, onRetry }: BannerProps) {
  if (!isVerifying && !error) return null;

  if (isVerifying && !error) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-b border-border text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Verifying artist access…</span>
      </div>
    );
  }

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
