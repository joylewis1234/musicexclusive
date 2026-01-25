import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import EnterVault from "./pages/EnterVault";
import SubmitVaultCode from "./pages/SubmitVaultCode";
import VaultStatus from "./pages/VaultStatus";
import Agreements from "./pages/Agreements";
import ChooseAccess from "./pages/ChooseAccess";
import FanDashboard from "./pages/FanDashboard";
import Discovery from "./pages/Discovery";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/vault/enter" element={<EnterVault />} />
          <Route path="/vault/submit" element={<SubmitVaultCode />} />
          <Route path="/vault/status" element={<VaultStatus />} />
          <Route path="/agreements/fan" element={<Agreements />} />
          <Route path="/onboarding/listen" element={<ChooseAccess />} />
          <Route path="/fan/dashboard" element={<FanDashboard />} />
          <Route path="/discovery" element={<Discovery />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
