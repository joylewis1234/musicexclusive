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

console.log("[App] Module loaded v11");

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

type LazyComponentModule = { default: React.ComponentType<any> };

const CHUNK_LOAD_TIMEOUT_MS = 30000;
const CHUNK_RETRY_DELAY_MS = 1500;

const ChunkLoadErrorFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center px-6">
    <div className="max-w-sm text-center space-y-3">
      <h2 className="text-lg font-semibold text-foreground">Failed to load page</h2>
      <p className="text-sm text-muted-foreground">A required file could not be loaded in time.</p>
      <button
        onClick={() => window.location.reload()}
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Reload
      </button>
    </div>
  </div>
);

const loadChunkWithTimeout = (factory: () => Promise<LazyComponentModule>) =>
  Promise.race<LazyComponentModule>([
    factory(),
    new Promise<LazyComponentModule>((_, reject) => {
      setTimeout(() => reject(new Error("Route chunk load timed out")), CHUNK_LOAD_TIMEOUT_MS);
    }),
  ]);

// Lazy loader with retry + timeout fallback to prevent Suspense from hanging forever
function lazyWithRetry(factory: () => Promise<LazyComponentModule>) {
  return React.lazy(async () => {
    try {
      return await loadChunkWithTimeout(factory);
    } catch (firstError) {
      console.warn("[LazyLoad] Chunk failed/timed out, retrying in 1.5s…", firstError);
      await new Promise((resolve) => setTimeout(resolve, CHUNK_RETRY_DELAY_MS));

      try {
        return await loadChunkWithTimeout(factory);
      } catch (retryErr) {
        console.error("[LazyLoad] Chunk failed after retry:", retryErr);
        return { default: ChunkLoadErrorFallback };
      }
    }
  });
}

// Eager-load the homepage to guarantee first paint
import Index from "./pages/Index";

// Lazy-load secondary route pages with retry
const ArtistBenefits = lazyWithRetry(() => import("./pages/ArtistBenefits"));
const EnterVault = lazyWithRetry(() => import("./pages/EnterVault"));
const SubmitVaultCode = lazyWithRetry(() => import("./pages/SubmitVaultCode"));
const VaultStatus = lazyWithRetry(() => import("./pages/VaultStatus"));
const VaultWinCongrats = lazyWithRetry(() => import("./pages/VaultWinCongrats"));
const ChooseAccess = lazyWithRetry(() => import("./pages/ChooseAccess"));
const Subscribe = lazyWithRetry(() => import("./pages/Subscribe"));
const CheckoutReturn = lazyWithRetry(() => import("./pages/CheckoutReturn"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const Login = lazyWithRetry(() => import("./pages/Login"));
const AuthConfirm = lazyWithRetry(() => import("./pages/AuthConfirm"));
const ForgotPassword = lazyWithRetry(() => import("./pages/ForgotPassword"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const Terms = lazyWithRetry(() => import("./pages/Terms"));
const ArtistAgreement = lazyWithRetry(() => import("./pages/ArtistAgreement"));
const PrivacyPolicy = lazyWithRetry(() => import("./pages/PrivacyPolicy"));
const CopyrightDmca = lazyWithRetry(() => import("./pages/CopyrightDmca"));
const RefundPolicy = lazyWithRetry(() => import("./pages/RefundPolicy"));
const FanAgreementStep = lazyWithRetry(() => import("./pages/FanAgreementStep"));
const PatentNotice = lazyWithRetry(() => import("./pages/PatentNotice"));
const InviteLanding = lazyWithRetry(() => import("./pages/InviteLanding"));
const TestSounds = lazyWithRetry(() => import("./pages/TestSounds"));
const PreviewDiscovery = lazyWithRetry(() => import("./pages/PreviewDiscovery"));
const FoundingSuperfan = lazyWithRetry(() => import("./pages/FoundingSuperfan"));
const FoundingSuperfanConfirmed = lazyWithRetry(() => import("./pages/FoundingSuperfanConfirmed"));
const ArtistWaitlist = lazyWithRetry(() => import("./pages/ArtistWaitlist"));
const ArtistWaitlistForm = lazyWithRetry(() => import("./pages/ArtistWaitlistForm"));
const ArtistWaitlistSubmitted = lazyWithRetry(() => import("./pages/ArtistWaitlistSubmitted"));
const ChartsPage = lazyWithRetry(() => import("./pages/ChartsPage"));

const FanAuth = lazyWithRetry(() => import("./pages/auth/FanAuth"));
const ArtistAuth = lazyWithRetry(() => import("./pages/auth/ArtistAuth"));
const ArtistLogin = lazyWithRetry(() => import("./pages/auth/ArtistLogin"));
const AdminLogin = lazyWithRetry(() => import("./pages/auth/AdminLogin"));
const AccessRestricted = lazyWithRetry(() => import("./pages/AccessRestricted"));

const FanProfile = lazyWithRetry(() => import("./pages/FanProfile"));
const FanInbox = lazyWithRetry(() => import("./pages/FanInbox"));
const Discovery = lazyWithRetry(() => import("./pages/Discovery"));
const MusicPlayer = lazyWithRetry(() => import("./pages/MusicPlayer"));
const AddCredits = lazyWithRetry(() => import("./pages/AddCredits"));
const ArtistProfilePage = lazyWithRetry(() => import("./pages/ArtistProfilePage"));

const ArtistApply = lazyWithRetry(() => import("./pages/ArtistApply"));
const ArtistApplicationForm = lazyWithRetry(() => import("./pages/ArtistApplicationForm"));
const ArtistApplicationStatus = lazyWithRetry(() => import("./pages/ArtistApplicationStatus"));
const ArtistApplicationSubmitted = lazyWithRetry(() => import("./pages/ArtistApplicationSubmitted"));
const ArtistUpload = lazyWithRetry(() => import("./pages/ArtistUpload"));
const ArtistDashboard = lazyWithRetry(() => import("./pages/artist/ArtistDashboard"));
const ArtistEarnings = lazyWithRetry(() => import("./pages/artist/ArtistEarnings"));
const ArtistInvites = lazyWithRetry(() => import("./pages/artist/ArtistInvites"));
const ArtistSetupAccount = lazyWithRetry(() => import("./pages/artist/ArtistSetupAccount"));
const ArtistPendingActivation = lazyWithRetry(() => import("./pages/artist/ArtistPendingActivation"));
const ArtistAgreementAccept = lazyWithRetry(() => import("./pages/artist/ArtistAgreementAccept"));
const EditArtistProfile = lazyWithRetry(() => import("./pages/artist/EditArtistProfile"));
const MarketingStudio = lazyWithRetry(() => import("./pages/artist/MarketingStudio"));

const AdminDashboard = lazyWithRetry(() => import("./pages/admin/AdminDashboard"));
const AdminReports = lazyWithRetry(() => import("./pages/admin/AdminReports"));
const AdminFanStreamDetail = lazyWithRetry(() => import("./pages/admin/AdminFanStreamDetail"));
const AdminFanDetail = lazyWithRetry(() => import("./pages/admin/AdminFanDetail"));
const AdminDailyReport = lazyWithRetry(() => import("./pages/admin/AdminDailyReport"));
const AdminPayouts = lazyWithRetry(() => import("./pages/admin/AdminPayouts"));
const AdminArtistApplications = lazyWithRetry(() => import("./pages/admin/AdminArtistApplications"));
const ArtistApplicationAction = lazyWithRetry(() => import("./pages/admin/ArtistApplicationAction"));
const AdminInvitations = lazyWithRetry(() => import("./pages/admin/AdminInvitations"));
const AdminHealthCheck = lazyWithRetry(() => import("./pages/admin/AdminHealthCheck"));
const AdminTestTools = lazyWithRetry(() => import("./pages/admin/AdminTestTools"));
const AdminWaitlist = lazyWithRetry(() => import("./pages/admin/AdminWaitlist"));
const AdminFanWaitlist = lazyWithRetry(() => import("./pages/admin/AdminFanWaitlist"));
const AdminCashBonusTracker = lazyWithRetry(() => import("./pages/admin/AdminCashBonusTracker"));
const AdminExclusiveCharts = lazyWithRetry(() => import("./pages/admin/AdminExclusiveCharts"));

const App = () => {
  React.useEffect(() => {
    console.log("[App] Mounted successfully");
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
                <Route path="/agreements/fan" element={<Navigate to="/fan/agreements" replace />} />
                <Route path="/fan/agreements" element={<FanAgreementStep />} />
                <Route path="/onboarding/listen" element={<ChooseAccess />} />
                <Route path="/subscribe" element={<PaymentErrorBoundary onBack={() => window.history.back()}><Subscribe /></PaymentErrorBoundary>} />
                <Route path="/load-credits" element={<Navigate to="/fan/add-credits" replace />} />
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
                <Route path="/auth/confirm" element={<AuthConfirm />} />
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
                  <Route path="/fan/payment" element={<Navigate to="/fan/add-credits" replace />} />
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
