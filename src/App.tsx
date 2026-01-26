import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PlayerProvider } from "@/contexts/PlayerContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { FanLayout } from "@/layouts/FanLayout";

// Public pages
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
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";

// Auth pages
import FanAuth from "./pages/auth/FanAuth";
import ArtistAuth from "./pages/auth/ArtistAuth";
import ArtistLogin from "./pages/auth/ArtistLogin";
import AccessRestricted from "./pages/AccessRestricted";

// Fan pages (protected)
import FanDashboard from "./pages/FanDashboard";
import FanProfile from "./pages/FanProfile";
import FanInbox from "./pages/FanInbox";
import Discovery from "./pages/Discovery";
import ArtistProfile from "./pages/ArtistProfile";
import MusicPlayer from "./pages/MusicPlayer";

// Artist pages
import ArtistApply from "./pages/ArtistApply";
import ArtistApplicationForm from "./pages/ArtistApplicationForm";
import ArtistApplicationStatus from "./pages/ArtistApplicationStatus";
import ArtistProfilePage from "./pages/ArtistProfilePage";
import ArtistUpload from "./pages/ArtistUpload";
import ArtistDashboard from "./pages/artist/ArtistDashboard";
import ArtistSetupAccount from "./pages/artist/ArtistSetupAccount";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
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
              <Route path="/subscribe" element={<Subscribe />} />
              <Route path="/load-credits" element={<LoadCredits />} />
              
              {/* Login selector page */}
              <Route path="/login" element={<Login />} />
              {/* Auth routes */}
              <Route path="/auth/fan" element={<FanAuth />} />
              <Route path="/auth/artist" element={<ArtistAuth />} />
              <Route path="/artist/login" element={<ArtistLogin />} />
              <Route path="/access-restricted" element={<AccessRestricted />} />
              
              {/* Fan routes with persistent mini-player (protected) */}
              <Route element={
                <ProtectedRoute allowedRole="fan">
                  <FanLayout />
                </ProtectedRoute>
              }>
                <Route path="/fan/dashboard" element={<FanDashboard />} />
                <Route path="/fan/profile" element={<FanProfile />} />
                <Route path="/fan/inbox" element={<FanInbox />} />
                <Route path="/fan/access-choice" element={<AccessChoice />} />
                <Route path="/fan/payment" element={<Payment />} />
                <Route path="/discovery" element={<Discovery />} />
                <Route path="/artist/:artistId" element={<ArtistProfile />} />
              </Route>
              
              {/* Full player for fans (protected) */}
              <Route path="/player/:trackId" element={
                <ProtectedRoute allowedRole="fan">
                  <MusicPlayer />
                </ProtectedRoute>
              } />
              <Route path="/player" element={
                <ProtectedRoute allowedRole="fan">
                  <MusicPlayer />
                </ProtectedRoute>
              } />
              
              <Route path="/artist/apply" element={<ArtistApply />} />
              <Route path="/artist/application-form" element={<ArtistApplicationForm />} />
              <Route path="/artist/application-status" element={<ArtistApplicationStatus />} />
              <Route path="/artist/setup-account" element={<ArtistSetupAccount />} />
              
              {/* Artist protected routes */}
              <Route path="/artist/dashboard" element={
                <ProtectedRoute allowedRole="artist">
                  <ArtistDashboard />
                </ProtectedRoute>
              } />
              <Route path="/artist/profile" element={
                <ProtectedRoute allowedRole="artist">
                  <ArtistProfilePage />
                </ProtectedRoute>
              } />
              <Route path="/artist/upload" element={
                <ProtectedRoute allowedRole="artist">
                  <ArtistUpload />
                </ProtectedRoute>
              } />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </PlayerProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
