import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

// TEMPORARY DEV BYPASS - Set to true to skip auth checks for testing
const DEV_BYPASS = false;

interface ArtistProtectedRouteProps {
  children: ReactNode;
}

type ArtistStatus = "pending" | "approved_pending_setup" | "active" | "rejected" | null;

export const ArtistProtectedRoute = ({ children }: ArtistProtectedRouteProps) => {
  // All hooks MUST be called unconditionally before any early returns
  const { user, role, isLoading: authLoading } = useAuth();
  const location = useLocation();
  const [artistStatus, setArtistStatus] = useState<ArtistStatus>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    // Skip fetch if DEV_BYPASS is on
    if (DEV_BYPASS) {
      setStatusLoading(false);
      return;
    }

    const fetchArtistStatus = async () => {
      if (!user) {
        setStatusLoading(false);
        return;
      }

      try {
        // Check artist_applications by email (case-insensitive)
        const { data: applications, error } = await supabase
          .from("artist_applications")
          .select("status")
          .ilike("contact_email", user.email ?? "")
          .order("created_at", { ascending: false })
          .limit(1);

        if (error) {
          console.error("[ArtistProtectedRoute] Status fetch error:", error);
          setArtistStatus(null);
          return;
        }
        const application = applications?.[0] ?? null;
        setArtistStatus(application ? (application.status as ArtistStatus) : null);
      } catch (err) {
        const anyErr = err as any;
        const name = String(anyErr?.name ?? "");
        const message = String(anyErr?.message ?? anyErr ?? "").toLowerCase();
        const benign =
          name === "AbortError" ||
          message.includes("signal is aborted") ||
          message.includes("cancelled") ||
          message.includes("canceled");

        if (!benign) {
          console.error("[ArtistProtectedRoute] Unexpected status error:", err);
        }
        setArtistStatus(null);
      } finally {
        setStatusLoading(false);
      }
    };

    if (role === "artist") {
      fetchArtistStatus();
    } else {
      setStatusLoading(false);
    }
  }, [user, role]);

  // DEV BYPASS: Skip all auth checks for testing
  if (DEV_BYPASS) {
    return <>{children}</>;
  }

  // Show loading while checking auth and status
  // Note: role can be temporarily null right after sign-in while we fetch it.
  if (authLoading || statusLoading || (user && !role)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated - redirect to artist login
  if (!user) {
    return <Navigate to="/artist/login" state={{ from: location }} replace />;
  }

  // Authenticated but wrong role - show access restricted
  if (role !== "artist") {
    return <Navigate to="/access-restricted" state={{ userRole: role, requiredRole: "artist" }} replace />;
  }

  // Artist role but check status
  if (artistStatus !== "active") {
    // Approved but not yet set up
    if (artistStatus === "approved_pending_setup") {
      // Allow access to setup page
      if (location.pathname === "/artist/setup-account") {
        return <>{children}</>;
      }
      return <Navigate to="/artist/setup-account" replace />;
    }

    // Pending or rejected - go to application status
    if (artistStatus === "pending" || artistStatus === "rejected") {
      return <Navigate to="/artist/application-status" replace />;
    }

    // No application found - redirect to apply
    if (!artistStatus) {
      return <Navigate to="/artist/apply" replace />;
    }
  }

  // Artist with active status - allow access
  return <>{children}</>;
};
