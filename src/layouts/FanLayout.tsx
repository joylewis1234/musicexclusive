import { Outlet } from "react-router-dom";
import { MiniPlayer } from "@/components/MiniPlayer";
import { BottomNav } from "@/components/BottomNav";
import { usePlayer } from "@/contexts/PlayerContext";

const FanLayout = () => {
  const { currentTrack } = usePlayer();

  // Calculate bottom padding: nav (64px) + mini-player when active (80px)
  const bottomPadding = currentTrack ? "pb-36" : "pb-16";

  return (
    <div className="min-h-screen bg-background">
      {/* Page content with bottom padding for nav + mini-player */}
      <div className={bottomPadding}>
        <Outlet />
      </div>
      
      {/* Mini-player sits above the nav */}
      <div className={currentTrack ? "fixed bottom-16 left-0 right-0 z-50" : ""}>
        <MiniPlayer />
      </div>
      
      {/* Bottom navigation */}
      <BottomNav />
    </div>
  );
};

export { FanLayout };
