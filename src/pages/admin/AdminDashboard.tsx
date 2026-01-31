import { useNavigate } from "react-router-dom";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { 
  Shield, 
  Users, 
  Receipt, 
  DollarSign, 
  FileText, 
  Home, 
  LogOut,
  BarChart3,
  Wrench
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const adminLinks = [
    {
      title: "Fan Activity Reports",
      description: "View fan stream history, membership status, and engagement",
      icon: Users,
      path: "/admin/fans",
      color: "text-blue-400",
    },
    {
      title: "Stream Ledger / Transactions",
      description: "Full transaction history with filters and CSV export",
      icon: Receipt,
      path: "/admin/reports",
      color: "text-green-400",
    },
    {
      title: "Artist Payouts",
      description: "Weekly payout batches and Stripe transfer tracking",
      icon: DollarSign,
      path: "/admin/reports?tab=payouts",
      color: "text-yellow-400",
    },
    {
      title: "Weekly Transparency Reports",
      description: "Artist earnings statements and period summaries",
      icon: FileText,
      path: "/admin/reports?tab=statements",
      color: "text-purple-400",
    },
    {
      title: "Daily Company Report",
      description: "Daily revenue, growth metrics, and top performers",
      icon: BarChart3,
      path: "/admin/reports/daily",
      color: "text-pink-400",
    },
    {
      title: "Test Tools",
      description: "Create test accounts, simulate streams, debug tools",
      icon: Wrench,
      path: "/admin/test-tools",
      color: "text-orange-400",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="container max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-display text-sm font-semibold uppercase tracking-widest text-foreground">
              Admin Dashboard
            </span>
          </div>

          <div className="flex items-center gap-2">
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
        <div className="container max-w-4xl mx-auto">
          <GlowCard className="p-6 mb-8">
            <SectionHeader title="Music Exclusive Admin" align="center" />
            <p className="text-center text-muted-foreground text-sm mt-2">
              Manage fans, artists, payouts, and platform analytics
            </p>
            {user?.email && (
              <p className="text-center text-xs text-primary/70 mt-2">
                Signed in as: {user.email}
              </p>
            )}
          </GlowCard>

          <div className="grid gap-4 md:grid-cols-2">
            {adminLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className="group text-left"
              >
                <GlowCard className="p-5 h-full transition-all duration-200 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg bg-muted/50 ${link.color}`}>
                      <link.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {link.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {link.description}
                      </p>
                    </div>
                  </div>
                </GlowCard>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
