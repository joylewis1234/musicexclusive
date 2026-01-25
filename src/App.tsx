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
          <Route path="/enter-vault" element={<EnterVault />} />
          <Route path="/submit-vault-code" element={<SubmitVaultCode />} />
          <Route path="/vault-status" element={<VaultStatus />} />
          <Route path="/agreements" element={<Agreements />} />
          <Route path="/choose-access" element={<ChooseAccess />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
