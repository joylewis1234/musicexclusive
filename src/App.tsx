import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PlayerProvider } from "@/contexts/PlayerContext";
import { FanLayout } from "@/layouts/FanLayout";
import Index from "./pages/Index";
import EnterVault from "./pages/EnterVault";
import SubmitVaultCode from "./pages/SubmitVaultCode";
import VaultStatus from "./pages/VaultStatus";
import Agreements from "./pages/Agreements";
import ChooseAccess from "./pages/ChooseAccess";
import AccessChoice from "./pages/AccessChoice";
import Subscribe from "./pages/Subscribe";
import LoadCredits from "./pages/LoadCredits";
import Payment from "./pages/Payment";
import FanDashboard from "./pages/FanDashboard";
import FanProfile from "./pages/FanProfile";
import FanInbox from "./pages/FanInbox";
import Discovery from "./pages/Discovery";
import ArtistProfile from "./pages/ArtistProfile";
import ArtistUpload from "./pages/ArtistUpload";
import MusicPlayer from "./pages/MusicPlayer";
import ArtistApply from "./pages/ArtistApply";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <PlayerProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/vault/enter" element={<EnterVault />} />
            <Route path="/vault/submit" element={<SubmitVaultCode />} />
            <Route path="/vault/status" element={<VaultStatus />} />
            <Route path="/agreements/fan" element={<Agreements />} />
            <Route path="/onboarding/listen" element={<ChooseAccess />} />
            <Route path="/fan/access-choice" element={<AccessChoice />} />
            <Route path="/subscribe" element={<Subscribe />} />
            <Route path="/load-credits" element={<LoadCredits />} />
            <Route path="/fan/payment" element={<Payment />} />
            <Route path="/artist/apply" element={<ArtistApply />} />
            
            {/* Fan routes with persistent mini-player */}
            <Route element={<FanLayout />}>
              <Route path="/fan/dashboard" element={<FanDashboard />} />
              <Route path="/fan/profile" element={<FanProfile />} />
              <Route path="/fan/inbox" element={<FanInbox />} />
              <Route path="/discovery" element={<Discovery />} />
              <Route path="/artist/:artistId" element={<ArtistProfile />} />
              <Route path="/artist/upload" element={<ArtistUpload />} />
            </Route>
            
            {/* Full player (no mini-player) */}
            <Route path="/player/:trackId" element={<MusicPlayer />} />
            <Route path="/player" element={<MusicPlayer />} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </PlayerProvider>
  </QueryClientProvider>
);

export default App;
