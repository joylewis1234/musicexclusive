import { useNavigate } from "react-router-dom";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { 
  Shield, 
  Users, 
  Receipt, 
  DollarSign, 
  FileText, 
  Home, 
  LogOut,
  BarChart3,
  Wrench,
  UserPlus,
  Mail,
  Trophy,
  Crown
} from "lucide-react";
  Users, 
  Receipt, 
  DollarSign, 
  FileText, 
  Home, 
  LogOut,
  BarChart3,
  Wrench,
  UserPlus,
  Mail,
  Trophy
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const TOOLTIP_MESSAGES = {
  fanActivity: "See each fan's stream history, membership status, and spending. Tap a fan to view detailed streams.",
  streamLedger: "Source-of-truth log of every stream and the money split. All payouts and reports should match this ledger.",
  artistPayouts: "Weekly payout batches grouped by artist and week. Mark payouts as Paid after sending funds.",
  weeklyTransparency: "Artist-facing weekly statements showing streams, totals, and top tracks. Must match payout batches.",
  dailyCompanyReport: "Daily business snapshot: revenue, streams, platform share, artist share, and top performers.",
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const adminLinks = [
    {
      title: "Artist Waitlist",
      description: "Review and manage Founding Artist waitlist applications",
      icon: UserPlus,
      path: "/admin/waitlist",
      color: "text-amber-400",
      tooltip: "View waitlist applications. Approve to send onboarding email or reject.",
    },
    {
      title: "Artist Applications",
      description: "Review, approve, or deny new artist applications",
      icon: UserPlus,
      path: "/admin/artist-applications",
      color: "text-cyan-400",
      tooltip: "Review pending artist applications. Approve to send setup email, or deny to notify rejection.",
    },
    {
      title: "Artist Invitations",
      description: "Generate invitation messages and track outreach",
      icon: Mail,
      path: "/admin/invitations",
      color: "text-emerald-400",
      tooltip: "Create personalized invitations for artists. Track sent invitations and their conversion status.",
    },
    {
      title: "Fan Activity Reports",
      description: "View fan stream history, membership status, and engagement",
      icon: Users,
      path: "/admin/fans",
      color: "text-blue-400",
      tooltip: TOOLTIP_MESSAGES.fanActivity,
    },
    {
      title: "Stream Ledger / Transactions",
      description: "Full transaction history with filters and CSV export",
      icon: Receipt,
      path: "/admin/reports",
      color: "text-green-400",
      tooltip: TOOLTIP_MESSAGES.streamLedger,
    },
    {
      title: "Artist Payouts",
      description: "Weekly payout batches, Mark as Paid, and Stripe tracking",
      icon: DollarSign,
      path: "/admin/payouts",
      color: "text-yellow-400",
      tooltip: TOOLTIP_MESSAGES.artistPayouts,
    },
    {
      title: "Weekly Transparency Reports",
      description: "Artist earnings statements and period summaries",
      icon: FileText,
      path: "/admin/reports?tab=statements",
      color: "text-purple-400",
      tooltip: TOOLTIP_MESSAGES.weeklyTransparency,
    },
    {
      title: "Daily Company Report",
      description: "Daily revenue, growth metrics, and top performers",
      icon: BarChart3,
      path: "/admin/reports/daily",
      color: "text-pink-400",
      tooltip: TOOLTIP_MESSAGES.dailyCompanyReport,
    },
    {
      title: "Fan Waitlist",
      description: "View Founding Superfan signups and lifetime access reservations",
      icon: Users,
      path: "/admin/fan-waitlist",
      color: "text-rose-400",
      tooltip: "View all Founding Superfan signups. These fans have reserved lifetime access before launch.",
    },
    {
      title: "Cash Bonus Tracker",
      description: "Track and approve artist streaming milestone bonuses",
      icon: Trophy,
      path: "/admin/bonus-tracker/cash-bonus",
      color: "text-amber-300",
      tooltip: "Monitor artist progress toward Cash Bonus milestones (1k, 2.5k, 5k, 10k streams). Approve payouts or disqualify.",
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
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
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
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {link.title}
                        </h3>
                        {link.tooltip && (
                          <InfoTooltip message={link.tooltip} />
                        )}
                      </div>
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
