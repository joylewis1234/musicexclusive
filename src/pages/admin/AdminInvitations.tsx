import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Shield,
  Home,
  LogOut,
  ArrowLeft,
  Mail,
  MessageSquare,
  Copy,
  Download,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  UserPlus,
} from "lucide-react";

type Platform = "email" | "dm";
type InvitationStatus = "generated" | "sent" | "applied" | "approved" | "denied";

interface Invitation {
  id: string;
  created_at: string;
  artist_name: string;
  artist_email: string | null;
  artist_social_handle: string | null;
  platform: Platform;
  status: InvitationStatus;
  notes: string | null;
  apply_link: string;
}

const APPLY_LINK = "/artist-benefits";

// Generate plain text version of email (for copying/downloading and as email fallback)
const generateEmailText = (artistName: string, applyLink: string): string => {
  return `Subject: Top-Tier Artist Alert 🚨 Your Exclusive Invite to Music Exclusive

Hi ${artistName},

You've been spotted as a top-tier artist, and we are officially inviting you to Music Exclusive.

Music Exclusive is a music streaming platform like Spotify or Apple Music, but music is released here first.

Music Exclusive
Built for Artists. Made for Superfans.
Music. Released here first.

How you get paid:
Fans stream using credits.
1 credit = $0.20 per stream
Each stream is split 50/50
$0.10 paid to you (artist)
$0.10 paid to Music Exclusive (platform)

Weekly payouts happen every Monday.
You also get full transparency reporting inside your dashboard.

═══════════════════════════════════════════
  EARNINGS POTENTIAL EXAMPLE
═══════════════════════════════════════════
  👥 200 fans
  🎧 50 streams each
  🔥 10,000 streams/week
  💰 $1,000+ in one week
═══════════════════════════════════════════

Real earning potential example:
If you convert 200 fans from your social media following and they stream your music 50 times each in one week, that's:
200 fans × 50 streams = 10,000 streams/week
10,000 streams × $0.10 per stream = $1,000/week+

There is no other streaming platform where artists can realistically earn that kind of money in a single week from true fans streaming their music.

Apply here: ${applyLink}

We've already heard your music and you're great.
Now apply to enter the platform and release your music where superfans listen first.

Music Exclusive Team
support@musicexclusive.co`;
};

// Generate full HTML email (for sending as HTML)
const generateEmailHtml = (artistName: string, applyLink: string): string => {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Exclusive Invite to Music Exclusive</title>
</head>
<body style="margin:0; padding:0; background-color:#0a0a0a; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0a0a0a;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:100%; max-width:600px;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom:30px;">
              <h1 style="margin:0; font-size:24px; font-weight:bold; color:#ffffff; letter-spacing:0.1em; text-transform:uppercase;">
                MUSIC EXCLUSIVE™
              </h1>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td style="background:linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(20, 20, 20, 1) 50%, rgba(0, 212, 255, 0.1) 100%); border-radius:16px; border:1px solid rgba(139, 92, 246, 0.3); padding:40px 30px;">
              
              <!-- Greeting -->
              <p style="margin:0 0 20px 0; font-size:18px; color:#ffffff; line-height:1.6;">
                Hi ${artistName},
              </p>
              
              <p style="margin:0 0 20px 0; font-size:16px; color:#a1a1aa; line-height:1.6;">
                You've been spotted as a <strong style="color:#a855f7;">top-tier artist</strong>, and we are officially inviting you to Music Exclusive.
              </p>

              <p style="margin:0 0 20px 0; font-size:16px; color:#a1a1aa; line-height:1.6;">
                Music Exclusive is a music streaming platform like Spotify or Apple Music, but music is released here first.
              </p>

              <!-- Brand Block -->
              <div style="text-align:center; margin:30px 0; padding:20px; background:rgba(139, 92, 246, 0.1); border-radius:12px; border:1px solid rgba(139, 92, 246, 0.2);">
                <p style="margin:0; font-size:20px; font-weight:bold; color:#ffffff;">Music Exclusive</p>
                <p style="margin:8px 0 0 0; font-size:14px; color:#a855f7;">Built for Artists. Made for Superfans.</p>
                <p style="margin:4px 0 0 0; font-size:12px; color:#a1a1aa; font-style:italic;">Music. Released here first.</p>
              </div>

              <!-- How you get paid -->
              <h2 style="margin:30px 0 15px 0; font-size:18px; font-weight:bold; color:#ffffff;">How you get paid:</h2>
              <p style="margin:0 0 10px 0; font-size:14px; color:#a1a1aa; line-height:1.8;">
                Fans stream using credits.<br>
                1 credit = $0.20 per stream<br>
                Each stream is split 50/50<br>
                <span style="color:#22c55e;">$0.10 paid to you (artist)</span><br>
                $0.10 paid to Music Exclusive (platform)
              </p>
              <p style="margin:20px 0; font-size:14px; color:#a1a1aa; line-height:1.6;">
                Weekly payouts happen every Monday.<br>
                You also get full transparency reporting inside your dashboard.
              </p>

              <!-- Earnings Potential Graphic -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:24px 0;">
                <tr>
                  <td align="center">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0b0b14; border:1px solid #a855f7; border-radius:14px;">
                      <tr>
                        <td style="padding:16px 16px 10px 16px; font-family:Arial, sans-serif; color:#ffffff;">
                          <div style="font-size:16px; font-weight:700; letter-spacing:0.2px;">
                            Earnings Potential Example
                          </div>
                          <div style="font-size:13px; line-height:18px; color:#cfcfe6; margin-top:6px;">
                            A simple way to picture what your week can look like on Music Exclusive
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 16px 16px 16px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                              <td style="padding:8px; width:25%;">
                                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#101022; border:1px solid rgba(168,85,247,0.45); border-radius:12px;">
                                  <tr>
                                    <td style="padding:12px; font-family:Arial, sans-serif; color:#ffffff; text-align:center;">
                                      <div style="font-size:20px; font-weight:800;">👥 200</div>
                                      <div style="font-size:12px; color:#cfcfe6; margin-top:4px;">fans</div>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                              <td style="padding:8px; width:25%;">
                                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#101022; border:1px solid rgba(168,85,247,0.45); border-radius:12px;">
                                  <tr>
                                    <td style="padding:12px; font-family:Arial, sans-serif; color:#ffffff; text-align:center;">
                                      <div style="font-size:20px; font-weight:800;">🎧 50</div>
                                      <div style="font-size:12px; color:#cfcfe6; margin-top:4px;">streams each</div>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                              <td style="padding:8px; width:25%;">
                                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#101022; border:1px solid rgba(168,85,247,0.45); border-radius:12px;">
                                  <tr>
                                    <td style="padding:12px; font-family:Arial, sans-serif; color:#ffffff; text-align:center;">
                                      <div style="font-size:20px; font-weight:800;">🔥 10,000</div>
                                      <div style="font-size:12px; color:#cfcfe6; margin-top:4px;">streams/week</div>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                              <td style="padding:8px; width:25%;">
                                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#101022; border:1px solid rgba(168,85,247,0.45); border-radius:12px;">
                                  <tr>
                                    <td style="padding:12px; font-family:Arial, sans-serif; color:#ffffff; text-align:center;">
                                      <div style="font-size:20px; font-weight:800;">💰 $1,000+</div>
                                      <div style="font-size:12px; color:#cfcfe6; margin-top:4px;">in one week</div>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Real earning potential -->
              <p style="margin:20px 0; font-size:14px; color:#a1a1aa; line-height:1.6;">
                <strong style="color:#ffffff;">Real earning potential example:</strong><br>
                If you convert 200 fans from your social media following and they stream your music 50 times each in one week, that's:<br>
                200 fans × 50 streams = 10,000 streams/week<br>
                10,000 streams × $0.10 per stream = <strong style="color:#22c55e;">$1,000/week+</strong>
              </p>

              <p style="margin:20px 0; font-size:14px; color:#a1a1aa; line-height:1.6;">
                There is no other streaming platform where artists can realistically earn that kind of money in a single week from true fans streaming their music.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:30px 0;">
                <tr>
                  <td align="center">
                    <a href="${applyLink}" style="display:inline-block; background:linear-gradient(135deg, #8b5cf6, #a855f7); color:#ffffff; font-weight:bold; text-decoration:none; padding:16px 40px; border-radius:50px; font-size:16px; letter-spacing:0.05em;">
                      APPLY NOW →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:20px 0 0 0; font-size:14px; color:#a1a1aa; line-height:1.6;">
                We've already heard your music and you're great.<br>
                Now apply to enter the platform and release your music where superfans listen first.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:30px;">
              <p style="margin:0; font-size:14px; color:#a1a1aa; font-weight:bold;">
                Music Exclusive Team
              </p>
              <p style="margin:8px 0 0 0; font-size:12px; color:#52525b;">
                support@musicexclusive.co
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

const generateDMMessage = (artistName: string, applyLink: string): string => {
  return `Hey ${artistName} 🚨🎶
Top-tier artist alert. You've been personally invited to Music Exclusive.

Music Exclusive is a streaming platform like Spotify or Apple Music, but music is released here first.

Here's the part that makes artists move fast:
If you bring 200 fans and they stream your music 50 times in one week, that's:
10,000 streams/week
That can equal $1,000+ in one week on Music Exclusive.

Apply here: ${applyLink}

We've already heard your music and you're great. Now apply to enter the platform.`;
};

const StatusBadge = ({ status }: { status: InvitationStatus }) => {
  const config = {
    generated: { color: "text-blue-400 bg-blue-400/10 border-blue-400/30", icon: Clock, label: "Generated" },
    sent: { color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30", icon: Send, label: "Sent" },
    applied: { color: "text-purple-400 bg-purple-400/10 border-purple-400/30", icon: UserPlus, label: "Applied" },
    approved: { color: "text-green-400 bg-green-400/10 border-green-400/30", icon: CheckCircle, label: "Approved" },
    denied: { color: "text-red-400 bg-red-400/10 border-red-400/30", icon: XCircle, label: "Denied" },
  };

  const { color, icon: Icon, label } = config[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full border ${color}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
};

const AdminInvitations = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const queryClient = useQueryClient();

  const [artistName, setArtistName] = useState("");
  const [artistEmail, setArtistEmail] = useState("");
  const [artistSocialHandle, setArtistSocialHandle] = useState("");
  const [notes, setNotes] = useState("");
  const [platform, setPlatform] = useState<Platform>("email");
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [generatedHtml, setGeneratedHtml] = useState("");
  const [currentInvitationId, setCurrentInvitationId] = useState<string | null>(null);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ["artist-invitations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artist_invitations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Invitation[];
    },
  });

  const createInvitationMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      if (!artistName.trim()) throw new Error("Artist name is required");

      const fullApplyLink = `${window.location.origin}${APPLY_LINK}`;

      const { data, error } = await supabase
        .from("artist_invitations")
        .insert({
          created_by_admin_id: user.id,
          artist_name: artistName.trim(),
          artist_email: artistEmail.trim() || null,
          artist_social_handle: artistSocialHandle.trim() || null,
          platform,
          notes: notes.trim() || null,
          apply_link: fullApplyLink,
          status: "generated",
        })
        .select()
        .single();

      if (error) throw error;
      return data as Invitation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["artist-invitations"] });

      if (platform === "email") {
        setGeneratedMessage(generateEmailText(data.artist_name, data.apply_link));
        setGeneratedHtml(generateEmailHtml(data.artist_name, data.apply_link));
      } else {
        setGeneratedMessage(generateDMMessage(data.artist_name, data.apply_link));
        setGeneratedHtml("");
      }

      setCurrentInvitationId(data.id);
      toast.success("Invitation generated successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: InvitationStatus }) => {
      const { error } = await supabase
        .from("artist_invitations")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artist-invitations"] });
      toast.success("Status updated!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleGenerate = () => {
    createInvitationMutation.mutate();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedMessage);
      toast.success("Copied to clipboard!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([generatedMessage], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invitation-${artistName.replace(/\s+/g, "-").toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Downloaded!");
  };

  const handleCopyInvitation = async (invitation: Invitation) => {
    const message = invitation.platform === "email"
      ? generateEmailText(invitation.artist_name, invitation.apply_link)
      : generateDMMessage(invitation.artist_name, invitation.apply_link);

    try {
      await navigator.clipboard.writeText(message);
      toast.success("Copied to clipboard!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(generatedHtml);
      toast.success("HTML copied to clipboard!");
    } catch {
      toast.error("Failed to copy HTML");
    }
  };

  const handleDownloadHtml = () => {
    const blob = new Blob([generatedHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invitation-${artistName.replace(/\s+/g, "-").toLowerCase()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("HTML downloaded!");
  };

  const handleReset = () => {
    setArtistName("");
    setArtistEmail("");
    setArtistSocialHandle("");
    setNotes("");
    setGeneratedMessage("");
    setGeneratedHtml("");
    setCurrentInvitationId(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="container max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/admin")}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-display text-sm font-semibold uppercase tracking-widest text-foreground">
              Artist Invitations
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
        <div className="container max-w-4xl mx-auto space-y-6">
          {/* Form Section */}
          <GlowCard className="p-6">
            <SectionHeader title="Generate Artist Invitation" align="left" />
            <p className="text-muted-foreground text-sm mb-6">
              Create personalized invitation messages to recruit artists to Music Exclusive.
            </p>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="artistName">Artist Name *</Label>
                  <Input
                    id="artistName"
                    value={artistName}
                    onChange={(e) => setArtistName(e.target.value)}
                    placeholder="Enter artist name"
                    disabled={createInvitationMutation.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="artistEmail">Artist Email (optional)</Label>
                  <Input
                    id="artistEmail"
                    type="email"
                    value={artistEmail}
                    onChange={(e) => setArtistEmail(e.target.value)}
                    placeholder="artist@email.com"
                    disabled={createInvitationMutation.isPending}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="artistSocial">Social Handle (optional)</Label>
                  <Input
                    id="artistSocial"
                    value={artistSocialHandle}
                    onChange={(e) => setArtistSocialHandle(e.target.value)}
                    placeholder="@username"
                    disabled={createInvitationMutation.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={platform === "email" ? "default" : "outline"}
                      className={`flex-1 ${platform === "email" ? "bg-primary" : ""}`}
                      onClick={() => setPlatform("email")}
                      disabled={createInvitationMutation.isPending}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Email
                    </Button>
                    <Button
                      type="button"
                      variant={platform === "dm" ? "default" : "outline"}
                      className={`flex-1 ${platform === "dm" ? "bg-primary" : ""}`}
                      onClick={() => setPlatform("dm")}
                      disabled={createInvitationMutation.isPending}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Text/DM
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add internal notes about this artist..."
                  rows={2}
                  disabled={createInvitationMutation.isPending}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleGenerate}
                  disabled={!artistName.trim() || createInvitationMutation.isPending}
                  className="bg-gradient-to-r from-primary to-purple-600 hover:opacity-90"
                >
                  {createInvitationMutation.isPending ? "Generating..." : "Generate Invitation"}
                </Button>
                {generatedMessage && (
                  <Button variant="outline" onClick={handleReset}>
                    Clear & Start New
                  </Button>
                )}
              </div>
            </div>
          </GlowCard>

          {/* Generated Message Output */}
          {generatedMessage && (
            <GlowCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <SectionHeader
                  title={platform === "email" ? "Email Invitation" : "Text/DM Invitation"}
                  align="left"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(`${window.location.origin}/artist/benefits`);
                      toast.success("Apply link copied!");
                    } catch {
                      toast.error("Failed to copy");
                    }
                  }}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Apply Link
                </Button>
              </div>

              {/* HTML Version for Email */}
              {platform === "email" && generatedHtml && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-semibold text-primary">HTML Version (for sending)</Label>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleCopyHtml}>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy HTML
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleDownloadHtml}>
                        <Download className="w-4 h-4 mr-2" />
                        Download .html
                      </Button>
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg border border-primary/30 overflow-hidden">
                    <div className="p-3 bg-primary/10 border-b border-primary/20 text-xs text-muted-foreground">
                      Preview (how it will look in email clients)
                    </div>
                    <div 
                      className="p-4 max-h-96 overflow-y-auto"
                      dangerouslySetInnerHTML={{ __html: generatedHtml }}
                    />
                  </div>
                </div>
              )}

              {/* Plain Text Version */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold">
                    {platform === "email" ? "Plain Text Version (fallback)" : "Message"}
                  </Label>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopy}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Text
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownload}>
                      <Download className="w-4 h-4 mr-2" />
                      Download .txt
                    </Button>
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
                  <pre className="whitespace-pre-wrap text-sm text-foreground font-mono leading-relaxed">
                    {generatedMessage}
                  </pre>
                </div>
              </div>

              {currentInvitationId && (
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateStatusMutation.mutate({ id: currentInvitationId, status: "sent" })}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Mark as Sent
                  </Button>
                </div>
              )}
            </GlowCard>
          )}

          {/* Invitations Table */}
          <GlowCard className="p-6">
            <SectionHeader title="Invitation Tracking" align="left" />
            <p className="text-muted-foreground text-sm mb-6">
              Track all artist invitations and their status.
            </p>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : invitations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No invitations yet. Generate your first one above!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">Date</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">Artist</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium hidden md:table-cell">Contact</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">Platform</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">Status</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invitations.map((inv) => (
                      <tr key={inv.id} className="border-b border-border/30 hover:bg-muted/20">
                        <td className="py-3 px-2 text-muted-foreground">
                          {format(new Date(inv.created_at), "MMM d")}
                        </td>
                        <td className="py-3 px-2 font-medium">{inv.artist_name}</td>
                        <td className="py-3 px-2 text-muted-foreground hidden md:table-cell">
                          {inv.artist_email || inv.artist_social_handle || "-"}
                        </td>
                        <td className="py-3 px-2">
                          <span className="inline-flex items-center gap-1 text-xs">
                            {inv.platform === "email" ? (
                              <><Mail className="w-3 h-3" /> Email</>
                            ) : (
                              <><MessageSquare className="w-3 h-3" /> DM</>
                            )}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <StatusBadge status={inv.status} />
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex flex-wrap gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => handleCopyInvitation(inv)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            {inv.status === "generated" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-yellow-400 hover:text-yellow-300"
                                onClick={() => updateStatusMutation.mutate({ id: inv.id, status: "sent" })}
                              >
                                <Send className="w-3 h-3" />
                              </Button>
                            )}
                            {(inv.status === "sent" || inv.status === "generated") && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-purple-400 hover:text-purple-300"
                                onClick={() => updateStatusMutation.mutate({ id: inv.id, status: "applied" })}
                              >
                                <UserPlus className="w-3 h-3" />
                              </Button>
                            )}
                            {inv.status === "applied" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-green-400 hover:text-green-300"
                                  onClick={() => updateStatusMutation.mutate({ id: inv.id, status: "approved" })}
                                >
                                  <CheckCircle className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-red-400 hover:text-red-300"
                                  onClick={() => updateStatusMutation.mutate({ id: inv.id, status: "denied" })}
                                >
                                  <XCircle className="w-3 h-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlowCard>
        </div>
      </main>
    </div>
  );
};

export default AdminInvitations;
