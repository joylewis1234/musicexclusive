import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransactionLedger } from "@/components/admin/TransactionLedger";
import { PayoutBatches } from "@/components/admin/PayoutBatches";
import { ArtistEarningsStatements } from "@/components/admin/ArtistEarningsStatements";
import { FanStreamReport } from "@/components/admin/FanStreamReport";
import { Home, LogOut, Shield, Receipt, DollarSign, FileText, Users, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const AdminReports = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { signOut } = useAuth();
  
  // Read tab from URL, default to "ledger"
  const tabFromUrl = searchParams.get("tab") || "ledger";
  const validTabs = ["ledger", "payouts", "statements", "fans", "weekly"];
  const [activeTab, setActiveTab] = useState(validTabs.includes(tabFromUrl) ? tabFromUrl : "ledger");

  useEffect(() => {
    // Update URL when tab changes
    if (activeTab !== "ledger") {
      setSearchParams({ tab: activeTab });
    } else {
      setSearchParams({});
    }
  }, [activeTab, setSearchParams]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="container max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-display text-sm font-semibold uppercase tracking-widest text-foreground">
              Admin Reports
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/admin")}
              className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Back to Admin"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate("/")}
              className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Go home"
            >
              <Home className="w-5 h-5" />
            </button>
            <button
              onClick={handleSignOut}
              className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-12 px-4">
        <div className="container max-w-6xl mx-auto">
          <GlowCard className="p-6 mb-6">
            <SectionHeader title="Financial Reports" align="center" />
            <p className="text-center text-muted-foreground text-sm mt-2">
              View transaction history, payout batches, artist earnings, and fan activity
            </p>
          </GlowCard>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 bg-background/50 border border-border/50 p-1">
              <TabsTrigger value="ledger" className="flex items-center gap-2 data-[state=active]:bg-primary/20">
                <Receipt className="w-4 h-4" />
                <span className="hidden sm:inline">Ledger</span>
              </TabsTrigger>
              <TabsTrigger value="payouts" className="flex items-center gap-2 data-[state=active]:bg-primary/20">
                <DollarSign className="w-4 h-4" />
                <span className="hidden sm:inline">Payouts</span>
              </TabsTrigger>
              <TabsTrigger value="statements" className="flex items-center gap-2 data-[state=active]:bg-primary/20">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Statements</span>
              </TabsTrigger>
              <TabsTrigger value="fans" className="flex items-center gap-2 data-[state=active]:bg-primary/20">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Fan Activity</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ledger">
              <TransactionLedger />
            </TabsContent>

            <TabsContent value="payouts">
              <PayoutBatches />
            </TabsContent>

            <TabsContent value="statements">
              <ArtistEarningsStatements />
            </TabsContent>

            <TabsContent value="fans">
              <FanStreamReport />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default AdminReports;
