import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRole: AppRole;
}

export const ProtectedRoute = ({ children, allowedRole }: ProtectedRouteProps) => {
  const { user, role, isLoading } = useAuth();
  const location = useLocation();

  // If a user just signed in, role can be temporarily null while we fetch it.
  // Treat that state as loading to avoid incorrect redirects.
  if (isLoading || (user && !role)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!user) {
    const loginPath = allowedRole === "artist" ? "/auth/artist" : "/auth/fan";
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // Authenticated but wrong role - show access restricted
  if (role !== allowedRole) {
    return <Navigate to="/access-restricted" state={{ userRole: role, requiredRole: allowedRole }} replace />;
  }

  return <>{children}</>;
};
