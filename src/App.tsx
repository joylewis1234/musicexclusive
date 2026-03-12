import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PlayerProvider } from "@/contexts/PlayerContext";
import { AudioPlayerProvider } from "@/contexts/AudioPlayerContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ArtistProtectedRoute } from "@/components/auth/ArtistProtectedRoute";
import { FanLayout } from "@/layouts/FanLayout";
import { ArtistLayout } from "@/layouts/ArtistLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PaymentErrorBoundary } from "@/components/error-boundaries/PaymentErrorBoundary";
import { ScrollToTop } from "@/components/ScrollToTop";
import { AdminProtectedRoute } from "@/components/auth/AdminProtectedRoute";

// Founding Superfan pages

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

// Lazy-load route pages to split large bundles.
const Index = React.lazy(() => import("./pages/Index"));
const ArtistBenefits = React.lazy(() => import("./pages/ArtistBenefits"));
const EnterVault = React.lazy(() => import("./pages/EnterVault"));
const SubmitVaultCode = React.lazy(() => import("./pages/SubmitVaultCode"));
const VaultStatus = React.lazy(() => import("./pages/VaultStatus"));
const VaultWinCongrats = React.lazy(() => import("./pages/VaultWinCongrats"));
const Agreements = React.lazy(() => import("./pages/Agreements"));
const ChooseAccess = React.lazy(() => import("./pages/ChooseAccess"));
const Subscribe = React.lazy(() => import("./pages/Subscribe"));
const LoadCredits = React.lazy(() => import("./pages/LoadCredits"));
const Payment = React.lazy(() => import("./pages/Payment"));
const CheckoutReturn = React.lazy(() => import("./pages/CheckoutReturn"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const Login = React.lazy(() => import("./pages/Login"));
const ForgotPassword = React.lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = React.lazy(() => import("./pages/ResetPassword"));
const Terms = React.lazy(() => import("./pages/Terms"));
const ArtistAgreement = React.lazy(() => import("./pages/ArtistAgreement"));
const PrivacyPolicy = React.lazy(() => import("./pages/PrivacyPolicy"));
const CopyrightDmca = React.lazy(() => import("./pages/CopyrightDmca"));
const RefundPolicy = React.lazy(() => import("./pages/RefundPolicy"));
const FanAgreementStep = React.lazy(() => import("./pages/FanAgreementStep"));
const PatentNotice = React.lazy(() => import("./pages/PatentNotice"));
const InviteLanding = React.lazy(() => import("./pages/InviteLanding"));
const TestSounds = React.lazy(() => import("./pages/TestSounds"));
const PreviewDiscovery = React.lazy(() => import("./pages/PreviewDiscovery"));
const FoundingSuperfan = React.lazy(() => import("./pages/FoundingSuperfan"));
const FoundingSuperfanConfirmed = React.lazy(
  () => import("./pages/FoundingSuperfanConfirmed")
);
const ArtistWaitlist = React.lazy(() => import("./pages/ArtistWaitlist"));
const ArtistWaitlistForm = React.lazy(() => import("./pages/ArtistWaitlistForm"));
const ArtistWaitlistSubmitted = React.lazy(
  () => import("./pages/ArtistWaitlistSubmitted")
);
const ChartsPage = React.lazy(() => import("./pages/ChartsPage"));

const FanAuth = React.lazy(() => import("./pages/auth/FanAuth"));
const ArtistAuth = React.lazy(() => import("./pages/auth/ArtistAuth"));
const ArtistLogin = React.lazy(() => import("./pages/auth/ArtistLogin"));
const AdminLogin = React.lazy(() => import("./pages/auth/AdminLogin"));
const AccessRestricted = React.lazy(() => import("./pages/AccessRestricted"));

// Fan pages (protected)
// FanDashboard removed – /fan/profile is now the fan landing page
const FanProfile = React.lazy(() => import("./pages/FanProfile"));
const FanInbox = React.lazy(() => import("./pages/FanInbox"));
const Discovery = React.lazy(() => import("./pages/Discovery"));
const MusicPlayer = React.lazy(() => import("./pages/MusicPlayer"));
const AddCredits = React.lazy(() => import("./pages/AddCredits"));
const ArtistProfilePage = React.lazy(() => import("./pages/ArtistProfilePage"));

// Artist pages
const ArtistApply = React.lazy(() => import("./pages/ArtistApply"));
const ArtistApplicationForm = React.lazy(
  () => import("./pages/ArtistApplicationForm")
);
const ArtistApplicationStatus = React.lazy(
  () => import("./pages/ArtistApplicationStatus")
);
const ArtistApplicationSubmitted = React.lazy(
  () => import("./pages/ArtistApplicationSubmitted")
);
const ArtistUpload = React.lazy(() => import("./pages/ArtistUpload"));
const ArtistDashboard = React.lazy(() => import("./pages/artist/ArtistDashboard"));
const ArtistEarnings = React.lazy(() => import("./pages/artist/ArtistEarnings"));
const ArtistInvites = React.lazy(() => import("./pages/artist/ArtistInvites"));
const ArtistSetupAccount = React.lazy(
  () => import("./pages/artist/ArtistSetupAccount")
);
const ArtistPendingActivation = React.lazy(
  () => import("./pages/artist/ArtistPendingActivation")
);
const ArtistAgreementAccept = React.lazy(
  () => import("./pages/artist/ArtistAgreementAccept")
);
const EditArtistProfile = React.lazy(
  () => import("./pages/artist/EditArtistProfile")
);
const MarketingStudio = React.lazy(() => import("./pages/artist/MarketingStudio"));

// Admin pages
const AdminDashboard = React.lazy(() => import("./pages/admin/AdminDashboard"));
const AdminReports = React.lazy(() => import("./pages/admin/AdminReports"));
const AdminFanStreamDetail = React.lazy(
  () => import("./pages/admin/AdminFanStreamDetail")
);
const AdminFanDetail = React.lazy(() => import("./pages/admin/AdminFanDetail"));
const AdminDailyReport = React.lazy(
  () => import("./pages/admin/AdminDailyReport")
);
const AdminPayouts = React.lazy(() => import("./pages/admin/AdminPayouts"));
const AdminArtistApplications = React.lazy(
  () => import("./pages/admin/AdminArtistApplications")
);
const ArtistApplicationAction = React.lazy(
  () => import("./pages/admin/ArtistApplicationAction")
);
const AdminInvitations = React.lazy(
  () => import("./pages/admin/AdminInvitations")
);
const AdminHealthCheck = React.lazy(
  () => import("./pages/admin/AdminHealthCheck")
);
const AdminTestTools = React.lazy(() => import("./pages/admin/AdminTestTools"));
const AdminWaitlist = React.lazy(() => import("./pages/admin/AdminWaitlist"));
const AdminFanWaitlist = React.lazy(() => import("./pages/admin/AdminFanWaitlist"));
const AdminCashBonusTracker = React.lazy(() => import("./pages/admin/AdminCashBonusTracker"));
const AdminExclusiveCharts = React.lazy(() => import("./pages/admin/AdminExclusiveCharts"));

const App = () => {
  // Global safety net for unhandled promise rejections (prevents white screen)
  React.useEffect(() => {
    const handler = (e: PromiseRejectionEvent) => {
      console.error("[App] Unhandled rejection:", e.reason);
      e.preventDefault();
    };
    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AudioPlayerProvider>
          <PlayerProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <ScrollToTop />
                <ErrorBoundary>
                  <React.Suspense fallback={
                    <div className="min-h-screen bg-background flex items-center justify-center">
                      <div className="text-center space-y-3">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-sm text-muted-foreground">Loading…</p>
                      </div>
                    </div>
                  }>
                    <Routes>
                {/* Public routes */}
                <Route path="/" element={<Index />} />
                <Route path="/charts" element={<ChartsPage />} />
                <Route path="/artist-benefits" element={<ArtistBenefits />} />
                <Route path="/vault/enter" element={<EnterVault />} />
                <Route path="/vault/submit" element={<SubmitVaultCode />} />
                <Route path="/vault/status" element={<VaultStatus />} />
                <Route path="/vault/congrats" element={<VaultWinCongrats />} />
                <Route path="/agreements/fan" element={<Agreements />} />
                <Route path="/fan/agreements" element={<FanAgreementStep />} />
                <Route path="/onboarding/listen" element={<ChooseAccess />} />
                <Route path="/subscribe" element={<PaymentErrorBoundary onBack={() => window.history.back()}><Subscribe /></PaymentErrorBoundary>} />
                <Route path="/load-credits" element={<LoadCredits />} />
                <Route path="/checkout/return" element={<CheckoutReturn />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/dmca" element={<CopyrightDmca />} />
                <Route path="/refunds" element={<RefundPolicy />} />
                <Route path="/patent-notice" element={<PatentNotice />} />
                <Route path="/invite" element={<InviteLanding />} />
                <Route path="/artist-agreement" element={<ArtistAgreement />} />
                <Route path="/test-sounds" element={<TestSounds />} />
                <Route path="/preview" element={<PreviewDiscovery />} />
                <Route path="/founding-superfan" element={<FoundingSuperfan />} />
                <Route path="/founding-superfan/confirmed" element={<FoundingSuperfanConfirmed />} />
                <Route path="/artist-waitlist" element={<ArtistWaitlist />} />
                <Route path="/artist-waitlist/apply" element={<ArtistWaitlistForm />} />
                <Route path="/artist-waitlist/submitted" element={<ArtistWaitlistSubmitted />} />
                
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
                  <Route path="/fan/dashboard" element={<Navigate to="/fan/profile" replace />} />
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
                <Route path="/artist/application-submitted" element={<ArtistApplicationSubmitted />} />
                {/* Public: artists who were approved but don't have an account yet */}
                <Route path="/artist/setup-account" element={<ArtistSetupAccount />} />
                <Route path="/artist/signup" element={<ArtistSetupAccount />} />
                <Route path="/artist/pending" element={<ArtistPendingActivation />} />
                
                {/* Artist protected routes with bottom nav */}
                <Route element={
                  <ArtistProtectedRoute>
                    <ArtistLayout />
                  </ArtistProtectedRoute>
                }>
                  <Route path="/artist/dashboard" element={<ArtistDashboard />} />
                  <Route path="/artist/invites" element={<ArtistInvites />} />
                  <Route path="/artist/profile/edit" element={<EditArtistProfile />} />
                  <Route path="/artist/earnings" element={<ArtistEarnings />} />
                  <Route path="/artist/marketing-studio" element={<MarketingStudio />} />
                </Route>
                
                {/* Artist routes without bottom nav */}
                <Route path="/artist/upload" element={
                  <ArtistProtectedRoute>
                    <ArtistUpload />
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
                <Route path="/admin/invitations" element={
                  <AdminProtectedRoute>
                    <AdminInvitations />
                  </AdminProtectedRoute>
                } />
                <Route path="/health-check" element={
                  <AdminProtectedRoute>
                    <AdminHealthCheck />
                  </AdminProtectedRoute>
                } />
                <Route path="/admin/waitlist" element={
                  <AdminProtectedRoute>
                    <AdminWaitlist />
                  </AdminProtectedRoute>
                } />
                <Route path="/admin/fan-waitlist" element={
                  <AdminProtectedRoute>
                    <AdminFanWaitlist />
                  </AdminProtectedRoute>
                } />
                <Route path="/admin/bonus-tracker/cash-bonus" element={
                  <AdminProtectedRoute>
                    <AdminCashBonusTracker />
                  </AdminProtectedRoute>
                } />
                <Route path="/admin/bonus-tracker/exclusive-charts" element={
                  <AdminProtectedRoute>
                    <AdminExclusiveCharts />
                  </AdminProtectedRoute>
                } />
                {/* Token-based actions from email links */}
                <Route path="/admin/artist-applications/approve" element={<ArtistApplicationAction />} />
                <Route path="/admin/artist-applications/deny" element={<ArtistApplicationAction />} />
                
                
                
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
                    </Routes>
                  </React.Suspense>
                </ErrorBoundary>
              </BrowserRouter>
            </TooltipProvider>
          </PlayerProvider>
        </AudioPlayerProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
