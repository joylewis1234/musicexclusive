import { useNavigate, useLocation } from "react-router-dom";
import { Compass, Inbox, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnreadInboxCount } from "@/hooks/useUnreadInboxCount";

const navItems = [
  { path: "/discovery", label: "Discover", icon: Compass },
  { path: "/fan/inbox", label: "Inbox", icon: Inbox, showBadge: true },
  { path: "/fan/profile", label: "Profile", icon: User },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const unreadCount = useUnreadInboxCount();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border safe-area-bottom" style={{ transform: 'translate3d(0,0,0)', willChange: 'transform' }}>
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          const showBadge = item.showBadge && unreadCount > 0;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-all duration-200 relative",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    "w-5 h-5 transition-all duration-200",
                    isActive && "drop-shadow-[0_0_8px_rgba(0,255,255,0.6)]"
                  )}
                />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-bold bg-accent text-accent-foreground rounded-full">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
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
