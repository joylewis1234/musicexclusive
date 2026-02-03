import { Toaster } from "@/components/ui/toaster";
import AdminTestTools from "./pages/admin/AdminTestTools";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PlayerProvider } from "@/contexts/PlayerContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ArtistProtectedRoute } from "@/components/auth/ArtistProtectedRoute";
import { FanLayout } from "@/layouts/FanLayout";
import { ArtistLayout } from "@/layouts/ArtistLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ScrollToTop } from "@/components/ScrollToTop";

// Public pages
import Index from "./pages/Index";
import ArtistBenefits from "./pages/ArtistBenefits";
import EnterVault from "./pages/EnterVault";
import SubmitVaultCode from "./pages/SubmitVaultCode";
import VaultStatus from "./pages/VaultStatus";
import VaultWinCongrats from "./pages/VaultWinCongrats";
import Agreements from "./pages/Agreements";
import ChooseAccess from "./pages/ChooseAccess";
import Subscribe from "./pages/Subscribe";
import LoadCredits from "./pages/LoadCredits";
import Payment from "./pages/Payment";
import CheckoutReturn from "./pages/CheckoutReturn";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Terms from "./pages/Terms";
import ArtistAgreement from "./pages/ArtistAgreement";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import CopyrightDmca from "./pages/CopyrightDmca";
import RefundPolicy from "./pages/RefundPolicy";
import FanAgreementStep from "./pages/FanAgreementStep";

// Auth pages
import FanAuth from "./pages/auth/FanAuth";
import ArtistAuth from "./pages/auth/ArtistAuth";
import ArtistLogin from "./pages/auth/ArtistLogin";
import AdminLogin from "./pages/auth/AdminLogin";
import AccessRestricted from "./pages/AccessRestricted";

// Fan pages (protected)
import FanDashboard from "./pages/FanDashboard";
import FanProfile from "./pages/FanProfile";
import FanInbox from "./pages/FanInbox";
import Discovery from "./pages/Discovery";
import MusicPlayer from "./pages/MusicPlayer";
import AddCredits from "./pages/AddCredits";

// Artist pages
import ArtistApply from "./pages/ArtistApply";
import ArtistApplicationForm from "./pages/ArtistApplicationForm";
import ArtistApplicationStatus from "./pages/ArtistApplicationStatus";
import ArtistProfilePage from "./pages/ArtistProfilePage";
import ArtistUpload from "./pages/ArtistUpload";
import ArtistDashboard from "./pages/artist/ArtistDashboard";
import ArtistEarnings from "./pages/artist/ArtistEarnings";
import ArtistSetupAccount from "./pages/artist/ArtistSetupAccount";
import ArtistAgreementAccept from "./pages/artist/ArtistAgreementAccept";
import EditArtistProfile from "./pages/artist/EditArtistProfile";
import MarketingStudio from "./pages/artist/MarketingStudio";
import { ArtistProfilePreviewWrapper } from "./components/artist/ArtistProfilePreviewWrapper";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminReports from "./pages/admin/AdminReports";
import AdminFanStreamDetail from "./pages/admin/AdminFanStreamDetail";
import AdminFanDetail from "./pages/admin/AdminFanDetail";
import AdminDailyReport from "./pages/admin/AdminDailyReport";
import AdminPayouts from "./pages/admin/AdminPayouts";
import AdminArtistApplications from "./pages/admin/AdminArtistApplications";
import ArtistApplicationAction from "./pages/admin/ArtistApplicationAction";
import { AdminProtectedRoute } from "@/components/auth/AdminProtectedRoute";
// Testing pages (temporary)
import TestTools from "./pages/testing/TestTools";
import TestPayouts from "./pages/testing/TestPayouts";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <PlayerProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <ErrorBoundary>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Index />} />
                <Route path="/artist-benefits" element={<ArtistBenefits />} />
                <Route path="/vault/enter" element={<EnterVault />} />
                <Route path="/vault/submit" element={<SubmitVaultCode />} />
                <Route path="/vault/status" element={<VaultStatus />} />
                <Route path="/vault/congrats" element={<VaultWinCongrats />} />
                <Route path="/agreements/fan" element={<Agreements />} />
                <Route path="/fan/agreements" element={<FanAgreementStep />} />
                <Route path="/onboarding/listen" element={<ChooseAccess />} />
                <Route path="/subscribe" element={<Subscribe />} />
                <Route path="/load-credits" element={<LoadCredits />} />
                <Route path="/checkout/return" element={<CheckoutReturn />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/dmca" element={<CopyrightDmca />} />
                <Route path="/refunds" element={<RefundPolicy />} />
                <Route path="/artist-agreement" element={<ArtistAgreement />} />
                
                {/* Login selector page */}
                <Route path="/login" element={<Login />} />
                {/* Auth routes */}
                <Route path="/auth/fan" element={<FanAuth />} />
                <Route path="/auth/artist" element={<ArtistAuth />} />
                <Route path="/artist/login" element={<ArtistLogin />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
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
                  <Route path="/fan/payment" element={<Payment />} />
                  <Route path="/fan/add-credits" element={<AddCredits />} />
                  <Route path="/discovery" element={<Discovery />} />
                  {/* Fan access to artist profiles */}
                  <Route path="/artist/:artistId" element={<ArtistProfilePage />} />
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
                
                {/* Artist protected routes with bottom nav */}
                <Route element={
                  <ArtistProtectedRoute>
                    <ArtistLayout />
                  </ArtistProtectedRoute>
                }>
                  <Route path="/artist/dashboard" element={<ArtistDashboard />} />
                  <Route path="/artist/profile/edit" element={<EditArtistProfile />} />
                  <Route path="/artist/earnings" element={<ArtistEarnings />} />
                  <Route path="/artist/marketing" element={<MarketingStudio />} />
                </Route>
                
                {/* Artist routes without bottom nav */}
                <Route path="/artist/profile" element={
                  <ArtistProtectedRoute>
                    <ArtistProfilePreviewWrapper />
                  </ArtistProtectedRoute>
                } />
                <Route path="/artist/view/:artistId" element={
                  <ArtistProtectedRoute>
                    <ArtistProfilePage />
                  </ArtistProtectedRoute>
                } />
                <Route path="/artist/upload" element={
                  <ArtistProtectedRoute>
                    <ArtistUpload />
                  </ArtistProtectedRoute>
                } />
                <Route path="/artist/setup-account" element={
                  <ArtistProtectedRoute>
                    <ArtistSetupAccount />
                  </ArtistProtectedRoute>
                } />
                <Route path="/artist/agreement-accept" element={
                  <ArtistProtectedRoute>
                    <ArtistAgreementAccept />
                  </ArtistProtectedRoute>
                } />
                
{/* Admin routes */}
                <Route path="/admin" element={
                  <AdminProtectedRoute>
                    <AdminDashboard />
                  </AdminProtectedRoute>
                } />
                <Route path="/admin/reports" element={
                  <AdminProtectedRoute>
                    <AdminReports />
                  </AdminProtectedRoute>
                } />
                <Route path="/admin/fans" element={
                  <AdminProtectedRoute>
                    <AdminFanStreamDetail />
                  </AdminProtectedRoute>
                } />
                <Route path="/admin/fans/:fanId" element={
                  <AdminProtectedRoute>
                    <AdminFanDetail />
                  </AdminProtectedRoute>
                } />
                <Route path="/admin/reports/daily" element={
                  <AdminProtectedRoute>
                    <AdminDailyReport />
                  </AdminProtectedRoute>
                } />
                <Route path="/admin/payouts" element={
                  <AdminProtectedRoute>
                    <AdminPayouts />
                  </AdminProtectedRoute>
                } />
                <Route path="/admin/test-tools" element={
                  <AdminProtectedRoute>
                    <AdminTestTools />
                  </AdminProtectedRoute>
                } />
                <Route path="/admin/artist-applications" element={
                  <AdminProtectedRoute>
                    <AdminArtistApplications />
                  </AdminProtectedRoute>
                } />
                {/* Token-based actions from email links */}
                <Route path="/admin/artist-applications/approve" element={<ArtistApplicationAction />} />
                <Route path="/admin/artist-applications/deny" element={<ArtistApplicationAction />} />
                
                {/* Testing routes (temporary - no auth required) */}
                <Route path="/testing/tools" element={<TestTools />} />
                <Route path="/testing/payouts" element={<TestPayouts />} />
                
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </PlayerProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
