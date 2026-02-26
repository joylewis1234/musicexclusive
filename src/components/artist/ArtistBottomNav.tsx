import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, User, DollarSign, Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/artist/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/artist/invites", label: "Invites", icon: Send },
  { path: "/artist/marketing-studio", label: "Studio", icon: Sparkles },
  { path: "/artist/profile/edit", label: "Profile", icon: User },
  { path: "/artist/earnings", label: "Earnings", icon: DollarSign },
];

const ArtistBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-40 safe-area-bottom"
      style={{
        background: 'linear-gradient(to top, hsl(0 0% 0%), hsla(0 0% 0% / 0.95))',
        borderTop: '1px solid hsla(280, 80%, 50%, 0.15)',
      }}
    >
      {/* Subtle top glow line */}
      <div 
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, hsla(280, 80%, 50%, 0.4), hsla(45, 90%, 55%, 0.3), hsla(280, 80%, 50%, 0.4), transparent)',
        }}
      />
      
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          // Add data-tutorial attribute for the tutorial system
          const tutorialAttr = item.path === "/artist/profile/edit" 
            ? "profile-tab" 
            : item.path === "/artist/earnings" 
            ? "earnings-tab" 
            : undefined;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              data-tutorial={tutorialAttr}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-all duration-200",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground/80"
              )}
            >
              {/* Active indicator - glowing dot */}
              {isActive && (
                <div 
                  className="absolute -top-1 w-1 h-1 rounded-full"
                  style={{
                    background: 'hsl(280, 80%, 70%)',
                    boxShadow: '0 0 8px hsla(280, 80%, 50%, 0.8), 0 0 16px hsla(280, 80%, 50%, 0.4)',
                  }}
                />
              )}
              
              <div className="relative">
                <Icon
                  className={cn(
                    "w-5 h-5 transition-all duration-200",
                  )}
                  style={isActive ? {
                    filter: 'drop-shadow(0 0 6px hsla(280, 80%, 50%, 0.6))',
                    color: 'hsl(280, 80%, 70%)',
                  } : undefined}
                />
              </div>
              <span
                className={cn(
                  "text-[9px] font-display uppercase tracking-wider transition-all duration-200",
                )}
                style={isActive ? { 
                  color: 'hsl(280, 80%, 70%)',
                  textShadow: '0 0 8px hsla(280, 80%, 50%, 0.5)' 
                } : undefined}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export { ArtistBottomNav };
