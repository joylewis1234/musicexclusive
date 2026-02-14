import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { TimeoutSpinner } from "@/components/ui/TimeoutSpinner";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRole: AppRole;
}

export const ProtectedRoute = ({ children, allowedRole }: ProtectedRouteProps) => {
  const { user, role, userRoles, isLoading, setActiveRole } = useAuth();
  const location = useLocation();

  // If a user just signed in, role can be temporarily null while we fetch it.
  // Treat that state as loading to avoid incorrect redirects.
  if (isLoading || (user && !role)) {
    return (
      <TimeoutSpinner
        page={`ProtectedRoute(${allowedRole})`}
        loadingMessage="Verifying access…"
        errorMessage="Verification timed out. Please check your connection and try again."
      />
    );
  }

  // Not authenticated - redirect to login
  if (!user) {
    const loginPath = allowedRole === "artist" ? "/auth/artist" : "/auth/fan";
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // Authenticated but wrong active role — auto-switch if user has the required role
  if (role !== allowedRole) {
    if (userRoles.includes(allowedRole)) {
      console.log(`[ProtectedRoute] 🔄 Switching active role to ${allowedRole}`);
      setActiveRole(allowedRole);
      return (
        <TimeoutSpinner
          page={`ProtectedRoute(${allowedRole})`}
          loadingMessage="Switching roles…"
          errorMessage="Could not switch roles. Please try again."
          timeoutMs={5_000}
        />
      );
    }
    return <Navigate to="/access-restricted" state={{ userRole: role, requiredRole: allowedRole }} replace />;
  }

  return <>{children}</>;
};
