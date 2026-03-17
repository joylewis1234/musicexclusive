import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SUPABASE_URL, SUPABASE_ANON_KEY, EDGE_FUNCTIONS_URL } from "@/config/supabase";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Home,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Loader2,
  ExternalLink,
  Music,
  Users,
  Calendar,
  MapPin,
  Mail,
  RefreshCw,
  AlertCircle,
  Trash2,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface EmailLog {
  id: string;
  email_type: string;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

interface ArtistApplication {
  id: string;
  artist_name: string;
  contact_email: string;
  status: string;
  created_at: string;
  country_city: string | null;
  genres: string;
  years_releasing: string;
  follower_count: number;
  primary_social_platform: string;
  social_profile_url: string;
  spotify_url: string | null;
  song_sample_url: string;
  hook_preview_url: string | null;
  owns_rights: boolean;
  not_released_publicly: boolean;
  auth_user_id: string | null;
}

const AdminArtistApplications = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [applications, setApplications] = useState<ArtistApplication[]>([]);
  const [emailLogs, setEmailLogs] = useState<Record<string, EmailLog | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<ArtistApplication | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [testCleanupMode, setTestCleanupMode] = useState(false);
  const [deleteConfirmApp, setDeleteConfirmApp] = useState<ArtistApplication | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Check for token in URL (for email link actions)
  const tokenParam = searchParams.get("token");
  const actionPath = window.location.pathname;

  useEffect(() => {
    // Environment debug logging
    const supabaseUrl = SUPABASE_URL || "";
    console.log("[Admin] Supabase env:", supabaseUrl.replace(/^(https?:\/\/[^.]+).*/, "$1.***"));

    // Handle token-based actions from email links
    if (tokenParam) {
      handleTokenAction(tokenParam);
    }
    fetchApplications();
  }, [tokenParam]);

  const handleTokenAction = async (token: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("handle-application-action", {
        body: {
          token,
          adminEmail: "email_link",
          baseUrl: window.location.origin,
        },
      });

      if (error) throw error;

      if (data.success) {
        if (data.action === "approved") {
          toast.success(`${data.artistName} has been approved!`, {
            description: "An approval email has been sent to the artist.",
          });
        } else {
          toast.info(`${data.artistName}'s application was denied.`, {
            description: "A notification email has been sent to the artist.",
          });
        }
        // Remove token from URL
        navigate("/admin/artist-applications", { replace: true });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Token action error:", error);
      toast.error("Action failed", {
        description: error instanceof Error ? error.message : "Invalid or expired token",
      });
      navigate("/admin/artist-applications", { replace: true });
    }
  };

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from("artist_applications")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApplications(data || []);
      
      // Fetch email logs for all applications
      if (data && data.length > 0) {
        const applicationIds = data.map(app => app.id);
        const { data: logs, error: logsError } = await supabase
          .from("email_logs")
          .select("*")
          .in("application_id", applicationIds)
          .eq("email_type", "artist_approved")
          .order("created_at", { ascending: false });
        
        if (!logsError && logs) {
          // Group by application_id, keeping only the most recent
          const logsMap: Record<string, EmailLog | null> = {};
          logs.forEach(log => {
            if (!logsMap[log.application_id]) {
              logsMap[log.application_id] = log as EmailLog;
            }
          });
          setEmailLogs(logsMap);
        }
      }
    } catch (error) {
      console.error("Error fetching applications:", error);
      toast.error("Failed to load applications");
    } finally {
      setIsLoading(false);
    }
  };

  const getEdgeFunctionUrl = (fnName: string) =>
    `${SUPABASE_URL}/functions/v1/${fnName}`;

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not logged in — please sign in again.");
    return {
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    };
  };

  const handleTestApproveFunction = async () => {
    try {
      const res = await fetch(getEdgeFunctionUrl("approve-artist"), { method: "GET" });
      const data = await res.json();
      console.log("[TEST] approve-artist health:", res.status, data);

      if (res.ok && data.ok) {
        toast.success(`Approve function is live (v${data.version || "3.0.0"}). Ready to approve artists.`, {
          duration: 5000,
        });
      } else {
        toast.error(`Approve function failed: ${res.status} — ${data.error || res.statusText}`, {
          duration: 8000,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Approve function unreachable: ${msg}`, { duration: 8000 });
      console.error("[TEST] approve-artist health failed:", err);
    }
  };

  const updateApplicationLocally = (id: string, newStatus: string) => {
    setApplications(prev =>
      prev.map(a => (a.id === id ? { ...a, status: newStatus } : a))
    );
    if (selectedApplication?.id === id) {
      setSelectedApplication(prev => prev ? { ...prev, status: newStatus } : prev);
    }
  };

  const handleApprove = async (application: ArtistApplication) => {
    setProcessingId(application.id);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(getEdgeFunctionUrl("approve-artist"), {
        method: "POST",
        headers,
        body: JSON.stringify({ applicationId: application.id }),
      });

      const data = await res.json();
      console.log("[APPROVE] Response:", res.status, data);

      if (!res.ok) {
        throw new Error(`${res.status}: ${data.error || res.statusText}`);
      }

      if (data.success) {
        // Optimistic local update — no refetch needed
        updateApplicationLocally(application.id, "approved_pending_setup");

        if (data.emailSent) {
          toast.success("Artist approved and email sent.", {
            description: `Approval email delivered to ${application.contact_email}`,
          });
        } else {
          console.error("[APPROVE] Email failed:", data.emailError);
          toast.warning("Artist approved. Email failed to send.", {
            description: "Use the Resend Approval Email button to retry.",
            duration: 8000,
          });
        }
        setIsDetailOpen(false);
      } else {
        throw new Error(data.error || "Unknown approval error");
      }
    } catch (error) {
      console.error("Approve error:", error);
      toast.error("Failed to approve application", {
        description: error instanceof Error ? error.message : "Unknown error",
        duration: 10000,
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleResendApprovalEmail = async (application: ArtistApplication) => {
    setResendingId(application.id);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(getEdgeFunctionUrl("approve-artist"), {
        method: "POST",
        headers,
        body: JSON.stringify({ applicationId: application.id, resend: true }),
      });

      const data = await res.json();
      console.log("[RESEND] Response:", res.status, data);

      if (!res.ok) {
        throw new Error(`${res.status}: ${data.error || res.statusText}`);
      }

      if (data.success && data.emailSent) {
        toast.success("Approval email resent!", {
          description: `Email sent to ${application.contact_email}`,
        });
        fetchApplications();
      } else {
        throw new Error(data.emailError || "Failed to send email");
      }
    } catch (error) {
      console.error("Resend error:", error);
      toast.error("Failed to resend email", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setResendingId(null);
    }
  };

  const handleDeny = async (application: ArtistApplication) => {
    setProcessingId(application.id);
    try {
      // Generate a deny token and call the action handler
      const { data: tokenData, error: tokenError } = await supabase
        .from("application_action_tokens")
        .insert({
          application_id: application.id,
          action_type: "deny",
          token: crypto.randomUUID(),
        })
        .select()
        .single();

      if (tokenError) throw tokenError;

      const { data, error } = await supabase.functions.invoke("handle-application-action", {
        body: {
          token: tokenData.token,
          adminEmail: "admin_dashboard",
          baseUrl: window.location.origin,
        },
      });

      if (error) throw error;

      if (data.success) {
        // Optimistic local update
        updateApplicationLocally(application.id, "rejected");

        if (data.emailSent === false) {
          console.error("[DENY] Email failed:", data.emailError);
          toast.warning("Artist denied. Email failed to send.", {
            description: "Use the Resend Denial Email button to retry.",
            duration: 8000,
          });
        } else {
          toast.success("Artist denied and email sent.", {
            description: `Notification sent to ${application.contact_email}`,
          });
        }
        setIsDetailOpen(false);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Deny error:", error);
      toast.error("Failed to deny application", {
        description: error instanceof Error ? error.message : "Unknown error",
        duration: 10000,
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleResendDenialEmail = async (application: ArtistApplication) => {
    setResendingId(application.id);
    try {
      // Create a new deny token to re-trigger the email
      const { data: tokenData, error: tokenError } = await supabase
        .from("application_action_tokens")
        .insert({
          application_id: application.id,
          action_type: "resend_denial",
          token: crypto.randomUUID(),
        })
        .select()
        .single();

      if (tokenError) throw tokenError;

      const { data, error } = await supabase.functions.invoke("handle-application-action", {
        body: {
          token: tokenData.token,
          adminEmail: "admin_dashboard",
          baseUrl: window.location.origin,
        },
      });

      if (error) throw error;

      if (data.success && data.emailSent !== false) {
        toast.success("Denial email resent!", {
          description: `Email sent to ${application.contact_email}`,
        });
      } else {
        throw new Error(data.emailError || "Failed to send email");
      }
    } catch (error) {
      console.error("Resend denial error:", error);
      toast.error("Failed to resend denial email", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setResendingId(null);
    }
  };

  const handleDeleteApplication = async (application: ArtistApplication) => {
    setDeletingId(application.id);
    setDeleteConfirmApp(null);
    try {
      const { data, error } = await supabase.functions.invoke("delete-test-application", {
        body: { applicationId: application.id },
      });

      if (error) throw error;

      if (data.success) {
        toast.success("Deleted. You can now re-test with the same email.", {
          description: `Removed: ${data.deleted?.join(", ")}`,
        });
        fetchApplications();
        setIsDetailOpen(false);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete application", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30">
            <Clock className="w-3 h-3 mr-1" /> Pending
          </Badge>
        );
      case "approved_pending_setup":
      case "approved":
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">
            <CheckCircle className="w-3 h-3 mr-1" /> Approved
          </Badge>
        );
      case "active":
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
            <CheckCircle className="w-3 h-3 mr-1" /> Active
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">
            <XCircle className="w-3 h-3 mr-1" /> Denied
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const viewDetails = (application: ArtistApplication) => {
    setSelectedApplication(application);
    setIsDetailOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="container max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate("/admin")}
            className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Back to Admin"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <span className="font-display text-sm font-semibold uppercase tracking-widest text-foreground">
            Artist Applications
          </span>

          <button
            onClick={() => navigate("/")}
            className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Go home"
          >
            <Home className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-12 px-4">
        <div className="container max-w-6xl mx-auto">
          <div className="mb-8">
            <SectionHeader title="Review Applications" align="left" />
            <p className="text-muted-foreground text-sm mt-2">
              Review and manage artist applications to Music Exclusive.
            </p>
          </div>

          {/* Debug & Test Controls */}
          <div className="flex flex-wrap items-center gap-3 mb-6 p-3 rounded-lg border border-border bg-card">
            <ShieldAlert className="w-5 h-5 text-muted-foreground" />
            <Label htmlFor="cleanup-mode" className="text-sm text-muted-foreground cursor-pointer select-none">
              Enable Test Cleanup Mode
            </Label>
            <Switch
              id="cleanup-mode"
              checked={testCleanupMode}
              onCheckedChange={setTestCleanupMode}
            />
            {testCleanupMode && (
              <span className="text-xs text-destructive font-medium">
                Delete buttons visible
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestApproveFunction}
              className="ml-auto"
            >
              <AlertCircle className="w-4 h-4 mr-1" />
              Test Approve Function
            </Button>
          </div>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <GlowCard className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">
                {applications.filter((a) => a.status === "pending").length}
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Pending</p>
            </GlowCard>
            <GlowCard className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-500">
                {applications.filter((a) => a.status === "approved_pending_setup" || a.status === "approved").length}
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Approved</p>
            </GlowCard>
            <GlowCard className="p-4 text-center">
              <p className="text-2xl font-bold text-green-500">
                {applications.filter((a) => a.status === "active").length}
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Active</p>
            </GlowCard>
            <GlowCard className="p-4 text-center">
              <p className="text-2xl font-bold text-red-500">
                {applications.filter((a) => a.status === "rejected").length}
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Denied</p>
            </GlowCard>
          </div>

          {/* Applications Table */}
          <GlowCard className="overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : applications.length === 0 ? (
              <div className="text-center py-12">
                <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No applications yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Artist</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>App ID</TableHead>
                    <TableHead>Auth User</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell className="font-medium">{app.artist_name}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{app.contact_email}</TableCell>
                      <TableCell>{getStatusBadge(app.status)}</TableCell>
                      <TableCell className="text-[10px] text-muted-foreground/60 font-mono max-w-[80px] truncate" title={app.id}>
                        {app.id.slice(0, 8)}…
                      </TableCell>
                      <TableCell className="text-[10px] font-mono max-w-[80px] truncate" title={app.auth_user_id || "not linked"}>
                        {app.auth_user_id ? (
                          <span className="text-green-500">{app.auth_user_id.slice(0, 8)}…</span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {format(new Date(app.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewDetails(app)}
                          >
                            <Eye className="w-4 h-4 mr-1" /> View
                          </Button>
                          {app.status === "pending" && (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleApprove(app)}
                                disabled={processingId === app.id}
                              >
                                {processingId === app.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle className="w-4 h-4 mr-1" /> Approve
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeny(app)}
                                disabled={processingId === app.id}
                              >
                                <XCircle className="w-4 h-4 mr-1" /> Deny
                              </Button>
                            </>
                          )}
                          {(app.status === "approved_pending_setup" || app.status === "approved") && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResendApprovalEmail(app)}
                              disabled={resendingId === app.id}
                            >
                              {resendingId === app.id ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-1" />
                              ) : (
                                <RefreshCw className="w-4 h-4 mr-1" />
                              )}
                              Resend Email
                            </Button>
                          )}
                          {app.status === "rejected" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResendDenialEmail(app)}
                              disabled={resendingId === app.id}
                            >
                              {resendingId === app.id ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-1" />
                              ) : (
                                <RefreshCw className="w-4 h-4 mr-1" />
                              )}
                              Resend Denial Email
                            </Button>
                          )}
                          {testCleanupMode && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteConfirmApp(app)}
                              disabled={deletingId === app.id}
                            >
                              {deletingId === app.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Trash2 className="w-4 h-4 mr-1" /> Hard Reset
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </GlowCard>
        </div>
      </main>

      {/* Application Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedApplication && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl flex items-center gap-2">
                  {selectedApplication.artist_name}
                  {getStatusBadge(selectedApplication.status)}
                </DialogTitle>
                <DialogDescription>
                  Submitted on {format(new Date(selectedApplication.created_at), "MMMM d, yyyy 'at' h:mm a")}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Contact Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Email</p>
                    <p className="text-sm">{selectedApplication.contact_email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Location</p>
                    <p className="text-sm flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {selectedApplication.country_city || "Not specified"}
                    </p>
                  </div>
                </div>

                {/* Music & Career */}
                <div className="border-t border-border pt-4">
                  <h4 className="text-xs text-primary uppercase tracking-wide mb-3">Music & Career</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Genre(s)</p>
                      <p className="text-sm">{selectedApplication.genres}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Experience</p>
                      <p className="text-sm flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {selectedApplication.years_releasing}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Fanbase */}
                <div className="border-t border-border pt-4">
                  <h4 className="text-xs text-primary uppercase tracking-wide mb-3">Fanbase</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Primary Platform</p>
                      <p className="text-sm capitalize">{selectedApplication.primary_social_platform}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Followers</p>
                      <p className="text-sm flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {selectedApplication.follower_count?.toLocaleString() || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Links */}
                <div className="border-t border-border pt-4">
                  <h4 className="text-xs text-primary uppercase tracking-wide mb-3">Links & Samples</h4>
                  <div className="space-y-2">
                    {selectedApplication.social_profile_url && (
                      <a
                        href={selectedApplication.social_profile_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Social Profile ({selectedApplication.primary_social_platform})
                      </a>
                    )}
                    {selectedApplication.spotify_url && (
                      <a
                        href={selectedApplication.spotify_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Music Link
                      </a>
                    )}
                    {selectedApplication.song_sample_url && (
                      <a
                        href={selectedApplication.song_sample_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <Music className="w-4 h-4" />
                        Song Sample
                      </a>
                    )}
                    {selectedApplication.hook_preview_url && (
                      <a
                        href={selectedApplication.hook_preview_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <Music className="w-4 h-4" />
                        Hook Preview
                      </a>
                    )}
                  </div>
                </div>

                {/* Rights Confirmation */}
                <div className="border-t border-border pt-4">
                  <h4 className="text-xs text-primary uppercase tracking-wide mb-3">Rights Confirmation</h4>
                  <div className="space-y-2">
                    <p className="text-sm flex items-center gap-2">
                      {selectedApplication.owns_rights ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      Owns/controls rights to submitted music
                    </p>
                    <p className="text-sm flex items-center gap-2">
                      {selectedApplication.not_released_publicly ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      Music not released publicly / has early release rights
                    </p>
                  </div>
                </div>

                {/* Email Debug Panel - Show for approved applications */}
                {(selectedApplication.status === "approved_pending_setup" || selectedApplication.status === "approved") && (
                  <div className="border-t border-border pt-4">
                    <h4 className="text-xs text-primary uppercase tracking-wide mb-3 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email Status
                    </h4>
                    {emailLogs[selectedApplication.id] ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          {emailLogs[selectedApplication.id]?.status === "sent" ? (
                            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                              <CheckCircle className="w-3 h-3 mr-1" /> Sent
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">
                              <AlertCircle className="w-3 h-3 mr-1" /> Failed
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {emailLogs[selectedApplication.id]?.sent_at 
                              ? format(new Date(emailLogs[selectedApplication.id]!.sent_at!), "MMM d, yyyy h:mm a")
                              : format(new Date(emailLogs[selectedApplication.id]!.created_at), "MMM d, yyyy h:mm a")}
                          </span>
                        </div>
                        {emailLogs[selectedApplication.id]?.error_message && (
                          <p className="text-sm text-red-400 bg-red-500/10 p-2 rounded">
                            Error: {emailLogs[selectedApplication.id]?.error_message}
                          </p>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResendApprovalEmail(selectedApplication)}
                          disabled={resendingId === selectedApplication.id}
                        >
                          {resendingId === selectedApplication.id ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <RefreshCw className="w-4 h-4 mr-2" />
                          )}
                          Resend Approval Email
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">No email log found</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResendApprovalEmail(selectedApplication)}
                          disabled={resendingId === selectedApplication.id}
                        >
                          {resendingId === selectedApplication.id ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <RefreshCw className="w-4 h-4 mr-2" />
                          )}
                          Send Approval Email
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                {selectedApplication.status === "pending" && (
                  <div className="border-t border-border pt-6 flex gap-3">
                    <Button
                      className="flex-1"
                      onClick={() => handleApprove(selectedApplication)}
                      disabled={processingId === selectedApplication.id}
                    >
                      {processingId === selectedApplication.id ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      Approve Artist
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleDeny(selectedApplication)}
                      disabled={processingId === selectedApplication.id}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Deny Application
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmApp} onOpenChange={(open) => !open && setDeleteConfirmApp(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hard Reset This Artist?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the application, artist profile, user role, <strong>and the auth account</strong> for <strong>{deleteConfirmApp?.contact_email}</strong>. The email can be re-used for a fresh signup afterwards. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirmApp && handleDeleteApplication(deleteConfirmApp)}
            >
              Hard Reset Artist
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminArtistApplications;
