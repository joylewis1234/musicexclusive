import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

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
  apple_music_url: string | null;
  song_sample_url: string;
  hook_preview_url: string | null;
  owns_rights: boolean;
  not_released_publicly: boolean;
}

const AdminArtistApplications = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [applications, setApplications] = useState<ArtistApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<ArtistApplication | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Check for token in URL (for email link actions)
  const tokenParam = searchParams.get("token");
  const actionPath = window.location.pathname;

  useEffect(() => {
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
    } catch (error) {
      console.error("Error fetching applications:", error);
      toast.error("Failed to load applications");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (application: ArtistApplication) => {
    setProcessingId(application.id);
    try {
      const { data, error } = await supabase.functions.invoke("approve-artist", {
        body: {
          applicationId: application.id,
          baseUrl: window.location.origin,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`${application.artist_name} approved!`, {
          description: data.emailSent 
            ? "Approval email sent to artist." 
            : `Setup link: ${data.setupLink}`,
        });
        fetchApplications();
        setIsDetailOpen(false);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Approve error:", error);
      toast.error("Failed to approve application");
    } finally {
      setProcessingId(null);
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
        toast.info(`${application.artist_name}'s application denied.`, {
          description: "Notification email sent to artist.",
        });
        fetchApplications();
        setIsDetailOpen(false);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Deny error:", error);
      toast.error("Failed to deny application");
    } finally {
      setProcessingId(null);
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
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell className="font-medium">{app.artist_name}</TableCell>
                      <TableCell className="text-muted-foreground">{app.contact_email}</TableCell>
                      <TableCell>{getStatusBadge(app.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
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
                        Spotify Profile
                      </a>
                    )}
                    {selectedApplication.apple_music_url && (
                      <a
                        href={selectedApplication.apple_music_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Apple Music Profile
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
    </div>
  );
};

export default AdminArtistApplications;
