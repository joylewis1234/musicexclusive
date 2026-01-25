import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Compass, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/fan/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/discovery", label: "Discover", icon: Compass },
  { path: "/fan/profile", label: "Profile", icon: User },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-all duration-200",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 transition-all duration-200",
                  isActive && "drop-shadow-[0_0_8px_rgba(0,255,255,0.6)]"
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-display uppercase tracking-wider transition-all duration-200",
                  isActive && "text-shadow-glow"
                )}
                style={isActive ? { textShadow: "0 0 10px rgba(0, 255, 255, 0.5)" } : undefined}
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

export { BottomNav };
