import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Home,
  LogOut,
  Shield,
  ArrowLeft,
  CalendarIcon,
  Download,
  Mail,
  Loader2,
  Music,
  Users,
  DollarSign,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const DAILY_REPORT_TOOLTIP = "Daily business snapshot: revenue, streams, platform share, artist share, and top performers.";

interface ReportData {
  reportDate: string;
  dateRange: { start: string; end: string };
  streaming: {
    totalStreams: number;
    totalCreditsUsed: number;
    grossRevenue: number;
    platformRevenue: number;
    artistEarnings: number;
    pendingStreams: number;
    paidStreams: number;
  };
  growth: {
    newVaultWinners: number;
    newArtists: number;
    newTracks: number;
  };
  topArtists: Array<{ name: string; streams: number }>;
  topTracks: Array<{ title: string; artist: string; streams: number }>;
  topFans: Array<{ email: string; streams: number }>;
}

interface EmailLog {
  id: string;
  report_date: string;
  status: string;
  sent_at: string | null;
  error_message: string | null;
}

const AdminDailyReport = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const dateParam = searchParams.get("date");
    return dateParam ? new Date(dateParam) : new Date();
  });
  const [report, setReport] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [lastEmailLog, setLastEmailLog] = useState<EmailLog | null>(null);

  const formattedDate = format(selectedDate, "yyyy-MM-dd");

  useEffect(() => {
    fetchReport();
    fetchLastEmailLog();
  }, [formattedDate]);

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-daily-report", {
        body: { date: formattedDate, sendEmail: false },
      });

      if (error) throw error;
      setReport(data.report);
    } catch (error) {
      console.error("Error fetching report:", error);
      toast.error(error instanceof Error ? error.message : "Failed to load report");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLastEmailLog = async () => {
    const { data } = await supabase
      .from("report_email_logs")
      .select("*")
      .eq("report_date", formattedDate)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setLastEmailLog(data);
  };

  const handleSendEmail = async () => {
    setIsSendingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-daily-report", {
        body: { date: formattedDate, sendEmail: true },
      });

      if (error) throw error;

      if (data.emailSent) {
        toast.success("Report email sent successfully!");
        fetchLastEmailLog();
      } else {
        toast.error("Failed to send email: " + (data.emailError || "Unknown error"));
      }
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast.error(error?.message || "Failed to send email");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setSearchParams({ date: format(date, "yyyy-MM-dd") });
    }
  };

  const exportCSV = () => {
    if (!report) return;

    const lines = [
      "Music Exclusive Daily Report",
      `Date: ${report.reportDate}`,
      "",
      "STREAMING ACTIVITY",
      `Total Streams,${report.streaming.totalStreams}`,
      `Credits Used,${report.streaming.totalCreditsUsed}`,
      `Gross Revenue,$${report.streaming.grossRevenue.toFixed(2)}`,
      `Platform Revenue,$${report.streaming.platformRevenue.toFixed(2)}`,
      `Artist Earnings,$${report.streaming.artistEarnings.toFixed(2)}`,
      `Pending Streams,${report.streaming.pendingStreams}`,
      `Paid Streams,${report.streaming.paidStreams}`,
      "",
      "GROWTH",
      `New Vault Winners,${report.growth.newVaultWinners}`,
      `New Artists,${report.growth.newArtists}`,
      `New Tracks,${report.growth.newTracks}`,
      "",
      "TOP ARTISTS",
      "Rank,Artist,Streams",
      ...report.topArtists.map((a, i) => `${i + 1},${a.name},${a.streams}`),
      "",
      "TOP TRACKS",
      "Rank,Track,Artist,Streams",
      ...report.topTracks.map((t, i) => `${i + 1},${t.title},${t.artist},${t.streams}`),
      "",
      "TOP FANS (INTERNAL)",
      "Rank,Email,Streams",
      ...report.topFans.map((f, i) => `${i + 1},${f.email},${f.streams}`),
    ];

    const csvContent = lines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `daily-report-${report.reportDate}.csv`;
    a.click();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getEmailStatusIcon = () => {
    if (!lastEmailLog) return <Clock className="w-4 h-4 text-muted-foreground" />;
    switch (lastEmailLog.status) {
      case "sent":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="container max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-display text-sm font-semibold uppercase tracking-widest text-foreground">
              Daily Company Report
            </span>
            <InfoTooltip message={DAILY_REPORT_TOOLTIP} />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/admin/reports")}
              className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Go to reports"
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
        <div className="container max-w-6xl mx-auto space-y-6">
          {/* Date Picker + Actions */}
          <GlowCard className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[240px] justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(selectedDate, "MMMM d, yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      disabled={(date) => date > new Date()}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>

                {/* Email Status Indicator */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {getEmailStatusIcon()}
                  <span>
                    {lastEmailLog?.sent_at
                      ? `Last sent: ${format(new Date(lastEmailLog.sent_at), "MMM d, HH:mm")}`
                      : "Not sent today"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={exportCSV} disabled={!report}>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <Button onClick={handleSendEmail} disabled={isSendingEmail || !report}>
                  {isSendingEmail ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4 mr-2" />
                  )}
                  Email This Report
                </Button>
              </div>
            </div>
          </GlowCard>

          {isLoading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
              <Skeleton className="h-64" />
            </div>
          ) : report ? (
            <>
              {/* Streaming Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <GlowCard className="p-4 text-center">
                  <Music className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{report.streaming.totalStreams}</p>
                  <p className="text-xs text-muted-foreground">Total Streams</p>
                </GlowCard>
                <GlowCard className="p-4 text-center">
                  <DollarSign className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{report.streaming.totalCreditsUsed}</p>
                  <p className="text-xs text-muted-foreground">Credits Used</p>
                </GlowCard>
                <GlowCard className="p-4 text-center">
                  <DollarSign className="w-6 h-6 mx-auto mb-2 text-green-500" />
                  <p className="text-2xl font-bold">${report.streaming.grossRevenue.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Gross Revenue</p>
                </GlowCard>
                <GlowCard className="p-4 text-center">
                  <DollarSign className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                  <p className="text-2xl font-bold">${report.streaming.platformRevenue.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Platform Revenue</p>
                </GlowCard>
                <GlowCard className="p-4 text-center">
                  <DollarSign className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
                  <p className="text-2xl font-bold">${report.streaming.artistEarnings.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Artist Earnings</p>
                </GlowCard>
                <GlowCard className="p-4 text-center">
                  <Users className="w-6 h-6 mx-auto mb-2 text-green-500" />
                  <p className="text-2xl font-bold">{report.growth.newVaultWinners}</p>
                  <p className="text-xs text-muted-foreground">New Vault Winners</p>
                </GlowCard>
                <GlowCard className="p-4 text-center">
                  <TrendingUp className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{report.growth.newArtists}</p>
                  <p className="text-xs text-muted-foreground">New Artists</p>
                </GlowCard>
                <GlowCard className="p-4 text-center">
                  <Music className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{report.growth.newTracks}</p>
                  <p className="text-xs text-muted-foreground">New Tracks</p>
                </GlowCard>
              </div>

              {/* Payout Status */}
              <GlowCard className="p-6">
                <SectionHeader title="Payout Status" align="left" />
                <div className="flex gap-8 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span className="text-sm">Pending: {report.streaming.pendingStreams}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-sm">Paid: {report.streaming.paidStreams}</span>
                  </div>
                </div>
              </GlowCard>

              {/* Top Artists */}
              <GlowCard className="p-6">
                <SectionHeader title="Top 5 Artists Today" align="left" />
                <div className="rounded-lg border border-border/50 overflow-hidden mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Artist</TableHead>
                        <TableHead className="text-right">Streams</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.topArtists.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                            No streams today
                          </TableCell>
                        </TableRow>
                      ) : (
                        report.topArtists.map((artist, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-bold text-primary">{i + 1}</TableCell>
                            <TableCell className="font-medium">{artist.name}</TableCell>
                            <TableCell className="text-right">{artist.streams}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </GlowCard>

              {/* Top Tracks */}
              <GlowCard className="p-6">
                <SectionHeader title="Top 5 Tracks Today" align="left" />
                <div className="rounded-lg border border-border/50 overflow-hidden mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Track</TableHead>
                        <TableHead>Artist</TableHead>
                        <TableHead className="text-right">Streams</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.topTracks.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No streams today
                          </TableCell>
                        </TableRow>
                      ) : (
                        report.topTracks.map((track, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-bold text-primary">{i + 1}</TableCell>
                            <TableCell className="font-medium">{track.title}</TableCell>
                            <TableCell className="text-muted-foreground">{track.artist}</TableCell>
                            <TableCell className="text-right">{track.streams}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </GlowCard>

              {/* Top Fans (Internal Only) */}
              <GlowCard className="p-6">
                <SectionHeader title="Top 10 Fans Today (Internal)" align="left" />
                <p className="text-xs text-muted-foreground mb-4">
                  ⚠️ This data is confidential and for internal use only
                </p>
                <div className="rounded-lg border border-border/50 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="text-right">Streams</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.topFans.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                            No streams today
                          </TableCell>
                        </TableRow>
                      ) : (
                        report.topFans.map((fan, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-bold text-primary">{i + 1}</TableCell>
                            <TableCell className="font-mono text-sm">{fan.email}</TableCell>
                            <TableCell className="text-right">{fan.streams}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </GlowCard>
            </>
          ) : (
            <GlowCard className="p-12 text-center">
              <p className="text-muted-foreground">Failed to load report data</p>
              <Button onClick={fetchReport} className="mt-4">
                Retry
              </Button>
            </GlowCard>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDailyReport;
