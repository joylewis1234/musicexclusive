import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { TimeoutSpinner } from "@/components/ui/TimeoutSpinner";

interface AdminProtectedRouteProps {
  children: ReactNode;
}

/**
 * Route guard that requires the user to be both authenticated
 * AND verified as admin via useIsAdmin (role + allowlist).
 */
export function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();

  if (authLoading || adminLoading) {
    return (
      <TimeoutSpinner
        page="AdminProtectedRoute"
        loadingMessage="Verifying admin access…"
        errorMessage="Admin verification timed out. Please check your connection and try again."
      />
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/access-restricted" state={{ requiredRole: "admin" }} replace />;
  }

  return <>{children}</>;
}
