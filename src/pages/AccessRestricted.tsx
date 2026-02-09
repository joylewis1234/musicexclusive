import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/ui/GlowCard";
import { ShieldX, ArrowLeft } from "lucide-react";
import { useAuth, AppRole } from "@/contexts/AuthContext";

const AccessRestricted = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, signOut } = useAuth();
  
  const state = location.state as { userRole?: AppRole; requiredRole?: AppRole | "admin" } | null;
  const requiredRole = state?.requiredRole;

  const handleGoBack = () => {
    if (role === "fan") {
      navigate("/fan/profile");
    } else if (role === "artist") {
      navigate("/artist/profile");
    } else {
      navigate("/");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <GlowCard className="max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
          <ShieldX className="w-8 h-8 text-destructive" />
        </div>
        
        <h1 className="font-display text-2xl font-bold text-foreground mb-3">
          Access Restricted
        </h1>
        
        <p className="text-muted-foreground mb-6">
          {requiredRole === "admin"
            ? "This area is only accessible to platform administrators."
            : requiredRole === "artist" 
            ? "This area is only accessible to approved artists."
            : "This area is only accessible to fans with Vault access."}
        </p>

        {role && (
          <p className="text-sm text-muted-foreground mb-6">
            You're currently signed in as: <span className="text-primary font-semibold capitalize">{role}</span>
          </p>
        )}

        <div className="space-y-3">
          <Button 
            onClick={handleGoBack} 
            className="w-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go to Your Dashboard
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleSignOut}
            className="w-full"
          >
            Sign Out
          </Button>
        </div>
      </GlowCard>
    </div>
  );
};

export default AccessRestricted;
