import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface ArtistProtectedRouteProps {
  children: ReactNode;
}

type ArtistStatus = "pending" | "approved_pending_setup" | "active" | "rejected" | null;

export const ArtistProtectedRoute = ({ children }: ArtistProtectedRouteProps) => {
  const { user, role, isLoading: authLoading } = useAuth();
  const location = useLocation();
  const [artistStatus, setArtistStatus] = useState<ArtistStatus>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    const fetchArtistStatus = async () => {
      if (!user) {
        setStatusLoading(false);
        return;
      }

      // Get user's email to find their application
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle();

      // Check artist_applications by email
      const { data: application } = await supabase
        .from("artist_applications")
        .select("status, contact_email")
        .eq("contact_email", user.email)
        .maybeSingle();

      if (application) {
        setArtistStatus(application.status as ArtistStatus);
      } else {
        setArtistStatus(null);
      }
      setStatusLoading(false);
    };

    if (role === "artist") {
      fetchArtistStatus();
    } else {
      setStatusLoading(false);
    }
  }, [user, role]);

  // Show loading while checking auth and status
  if (authLoading || statusLoading) {
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
