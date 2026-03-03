import { Outlet } from "react-router-dom";
import { MiniPlayer } from "@/components/MiniPlayer";
import { BottomNav } from "@/components/BottomNav";
const FanLayout = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Page content – always reserve space for nav (64px) + mini-player (80px) */}
      <div className="pb-36">
        <Outlet />
      </div>
      
      {/* Mini-player sits above the nav – always fixed to prevent layout bounce */}
      <div className="fixed bottom-16 left-0 right-0 z-50">
        <MiniPlayer />
      </div>
      
      {/* Bottom navigation – always fixed */}
      <BottomNav />
    </div>
  );
};

export { FanLayout };
