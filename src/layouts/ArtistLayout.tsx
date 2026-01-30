import { Outlet } from "react-router-dom";
import { ArtistBottomNav } from "@/components/artist/ArtistBottomNav";

export const ArtistLayout = () => {
  return (
    <div className="min-h-screen bg-background">
      <Outlet />
      <ArtistBottomNav />
    </div>
  );
};
