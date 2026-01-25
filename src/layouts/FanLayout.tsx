import { Outlet } from "react-router-dom";
import { MiniPlayer } from "@/components/MiniPlayer";
import { usePlayer } from "@/contexts/PlayerContext";

const FanLayout = () => {
  const { currentTrack } = usePlayer();

  return (
    <div className="min-h-screen bg-background">
      {/* Page content with bottom padding when mini-player is visible */}
      <div className={currentTrack ? "pb-20" : ""}>
        <Outlet />
      </div>
      
      {/* Persistent mini-player */}
      <MiniPlayer />
    </div>
  );
};

export { FanLayout };
