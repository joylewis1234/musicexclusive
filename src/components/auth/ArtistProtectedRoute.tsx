import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { TimeoutSpinner } from "@/components/ui/TimeoutSpinner";

interface ArtistProtectedRouteProps {
  children: ReactNode;
}

type ArtistGateResult =
  | "has_profile"           // artist_profiles row exists → allow access
  | "app_approved_pending"  // application approved but no profile yet → setup
  | "app_pending"           // application still under review
  | "app_rejected"          // application rejected
  | "no_record"             // no profile and no application
  | null;                   // still loading

export const ArtistProtectedRoute = ({ children }: ArtistProtectedRouteProps) => {
  const { user, role, isLoading: authLoading } = useAuth();
  const location = useLocation();
  const [gateResult, setGateResult] = useState<ArtistGateResult>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    const checkArtistAccess = async () => {
      if (!user) {
        console.log("[ArtistProtectedRoute] No user, skipping check");
        setStatusLoading(false);
        return;
      }

      console.log("[ArtistProtectedRoute] Checking access for userId:", user.id, "role:", role);

      try {
        // Primary check: does this user have an artist_profiles row?
        const { data: profile, error: profileError } = await supabase
          .from("artist_profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error("[ArtistProtectedRoute] Profile check error:", profileError);
        }

        if (profile) {
          console.log("[ArtistProtectedRoute] ✅ Artist profile found:", profile.id);
          setGateResult("has_profile");
          setStatusLoading(false);
          return;
        }

        // Fallback: check artist_applications by email (case-insensitive)
        const normalizedEmail = (user.email ?? "").trim().toLowerCase();
        console.log("[ArtistProtectedRoute] No profile found, checking applications for:", normalizedEmail);

        const { data: applications, error: appError } = await supabase
          .from("artist_applications")
          .select("status")
          .ilike("contact_email", normalizedEmail)
          .order("created_at", { ascending: false })
          .limit(1);

        if (appError) {
          console.error("[ArtistProtectedRoute] Application check error:", appError);
          // If we can't check, don't block — let them through to dashboard
          setGateResult("has_profile");
          setStatusLoading(false);
          return;
        }

        const application = applications?.[0] ?? null;
        console.log("[ArtistProtectedRoute] Application lookup result:", application);

        if (!application) {
          setGateResult("no_record");
        } else {
          switch (application.status) {
            case "active":
            case "approved":
              setGateResult("has_profile");
              break;
            case "approved_pending_setup":
              setGateResult("app_approved_pending");
              break;
            case "pending":
              setGateResult("app_pending");
              break;
            case "rejected":
            case "not_approved":
              setGateResult("app_rejected");
              break;
            default:
              setGateResult("app_pending");
          }
        }
      } catch (err) {
        const anyErr = err as any;
        const message = String(anyErr?.message ?? anyErr ?? "").toLowerCase();
        const benign =
          String(anyErr?.name ?? "") === "AbortError" ||
          message.includes("signal is aborted") ||
          message.includes("cancelled") ||
          message.includes("canceled");

        if (!benign) {
          console.error("[ArtistProtectedRoute] Unexpected error:", err);
        }
        // On error, don't block — allow access
        setGateResult("has_profile");
      } finally {
        setStatusLoading(false);
      }
    };

    if (role === "artist") {
      // CRITICAL: Reset loading + gate before async check to prevent
      // the guard from passing through with stale gateResult=null
      setStatusLoading(true);
      setGateResult(null);
      checkArtistAccess();
    } else {
      setStatusLoading(false);
    }
  }, [user, role]);

  // Log current state for debugging
  console.log("[ArtistProtectedRoute] Guard state:", {
    userId: user?.id?.slice(0, 8) ?? null,
    role,
    authLoading,
    statusLoading,
    gateResult,
    path: location.pathname,
  });

  // Show loading while checking auth and status
  if (authLoading || statusLoading || (user && !role)) {
    return (
      <TimeoutSpinner
        page="ArtistProtectedRoute"
        loadingMessage="Verifying artist access…"
        errorMessage="Artist verification timed out. Please check your connection and try again."
      />
    );
  }

  // Not authenticated
  if (!user) {
    console.log("[ArtistProtectedRoute] ❌ Redirect: no authenticated user → /artist/login");
    return <Navigate to="/artist/login" state={{ from: location }} replace />;
  }

  // Authenticated but wrong role
  if (role !== "artist") {
    console.log("[ArtistProtectedRoute] ❌ Redirect: role is", role, "not artist → /access-restricted");
    return <Navigate to="/access-restricted" state={{ userRole: role, requiredRole: "artist" }} replace />;
  }

  // Artist role — route based on gate result
  switch (gateResult) {
    case "has_profile":
      console.log("[ArtistProtectedRoute] ✅ Access granted (has_profile)");
      return <>{children}</>;

    case "app_approved_pending":
      if (location.pathname === "/artist/setup-account") {
        return <>{children}</>;
      }
      console.log("[ArtistProtectedRoute] → Redirect: approved pending setup");
      return <Navigate to="/artist/setup-account" replace />;

    case "app_pending":
    case "app_rejected":
      console.log("[ArtistProtectedRoute] → Redirect: application", gateResult);
      return <Navigate to="/artist/application-status" replace />;

    case "no_record":
      console.log("[ArtistProtectedRoute] ✅ Access granted (no_record, letting dashboard handle)");
      return <>{children}</>;

    default:
      // gateResult is still null — should be caught by statusLoading guard above
      // but as safety net, show spinner instead of passing through
      console.log("[ArtistProtectedRoute] ⏳ gateResult still null, showing spinner as safety net");
      return (
        <TimeoutSpinner
          page="ArtistProtectedRoute"
          loadingMessage="Verifying artist access…"
          errorMessage="Artist verification timed out. Please check your connection and try again."
        />
      );
  }
};
