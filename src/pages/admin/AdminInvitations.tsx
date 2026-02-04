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
import { format, startOfWeek, endOfWeek } from "date-fns";
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
  Eye,
  Loader2,
} from "lucide-react";

type InviteMode = "email" | "dm";
type InvitationStatus = "generated" | "sent" | "applied" | "approved" | "denied";

interface Invitation {
  id: string;
  created_at: string;
  artist_name: string;
  artist_email: string | null;
  artist_social_handle: string | null;
  platform: InviteMode;
  status: InvitationStatus;
  notes: string | null;
  apply_link: string;
}

interface InviteLog {
  id: string;
  created_at: string;
  invite_type: "email" | "dm";
  artist_name: string;
  artist_email: string | null;
  artist_social_handle: string | null;
  status: "pending" | "sent" | "failed";
  error_message: string | null;
  sent_at: string | null;
}

const BENEFITS_LINK = "/artist/benefits";

// Generate plain text version of email
const generateEmailText = (artistName: string, applyLink: string): string => {
  return `Hi ${artistName},

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

// Generate full HTML email
const generateEmailHtml = (artistName: string, applyLink: string): string => {
  // Using unique timestamp to prevent email clients from collapsing as quoted text
  const uniqueId = Date.now().toString(36);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <title>Your Exclusive Invite to Music Exclusive</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0; padding:0; background-color:#0a0a0a; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale;">
  <!-- Preheader text (hidden but prevents quoted text detection) -->
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all;" aria-hidden="true">
    ${artistName}, you've been personally invited to join Music Exclusive - where artists earn $0.10 per stream with weekly payouts.
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>
  
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
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr><td style="padding:4px 0; font-size:14px; color:#a1a1aa;">Fans stream using credits.</td></tr>
                <tr><td style="padding:4px 0; font-size:14px; color:#a1a1aa;">1 credit = $0.20 per stream</td></tr>
                <tr><td style="padding:4px 0; font-size:14px; color:#a1a1aa;">Each stream is split 50/50</td></tr>
                <tr><td style="padding:4px 0; font-size:14px; color:#22c55e; font-weight:600;">$0.10 paid to you (artist)</td></tr>
                <tr><td style="padding:4px 0; font-size:14px; color:#a1a1aa;">$0.10 paid to Music Exclusive (platform)</td></tr>
              </table>
              <p style="margin:20px 0; font-size:14px; color:#a1a1aa; line-height:1.6;">
                Weekly payouts happen every Monday.<br>
                You also get full transparency reporting inside your dashboard.
              </p>

              <!-- Earnings Potential Graphic - Exciting Version -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:30px 0;">
                <tr>
                  <td align="center">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:linear-gradient(135deg, #0f0a1e 0%, #1a0a2e 50%, #0a1628 100%); border:2px solid transparent; border-image:linear-gradient(135deg, #a855f7, #ec4899, #f59e0b) 1; border-radius:20px; overflow:hidden;">
                      <!-- Header with glow effect -->
                      <tr>
                        <td style="padding:24px 20px 16px 20px; background:linear-gradient(180deg, rgba(168,85,247,0.15) 0%, transparent 100%);">
                          <div style="text-align:center;">
                            <div style="font-size:12px; font-weight:600; letter-spacing:2px; color:#f59e0b; text-transform:uppercase; margin-bottom:8px;">
                              YOUR WEEKLY POTENTIAL
                            </div>
                            <div style="font-size:22px; font-weight:800; color:#ffffff; letter-spacing:-0.5px;">
                              What Your Week Could Look Like
                            </div>
                          </div>
                        </td>
                      </tr>

                      <!-- Flow Steps -->
                      <tr>
                        <td style="padding:0 16px 24px 16px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                            <!-- Row 1: Fans + Arrow + Streams -->
                            <tr>
                              <td style="padding:8px; width:40%;">
                                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:linear-gradient(145deg, #1e1040, #150a28); border:2px solid #a855f7; border-radius:16px; box-shadow:0 0 20px rgba(168,85,247,0.3);">
                                  <tr>
                                    <td style="padding:20px 12px; text-align:center;">
                                      <div style="font-size:36px; margin-bottom:8px;">👥</div>
                                      <div style="font-size:32px; font-weight:900; color:#ffffff; text-shadow:0 0 10px rgba(168,85,247,0.5);">200</div>
                                      <div style="font-size:13px; color:#c084fc; font-weight:600; text-transform:uppercase; letter-spacing:1px; margin-top:4px;">True Fans</div>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                              <td style="padding:8px; width:20%; text-align:center;">
                                <div style="font-size:24px; color:#ec4899;">×</div>
                              </td>
                              <td style="padding:8px; width:40%;">
                                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:linear-gradient(145deg, #1e1040, #150a28); border:2px solid #ec4899; border-radius:16px; box-shadow:0 0 20px rgba(236,72,153,0.3);">
                                  <tr>
                                    <td style="padding:20px 12px; text-align:center;">
                                      <div style="font-size:36px; margin-bottom:8px;">🎧</div>
                                      <div style="font-size:32px; font-weight:900; color:#ffffff; text-shadow:0 0 10px rgba(236,72,153,0.5);">50</div>
                                      <div style="font-size:13px; color:#f472b6; font-weight:600; text-transform:uppercase; letter-spacing:1px; margin-top:4px;">Streams Each</div>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>

                            <!-- Arrow Down -->
                            <tr>
                              <td colspan="3" style="text-align:center; padding:12px 0;">
                                <div style="font-size:28px; color:#f59e0b;">↓</div>
                              </td>
                            </tr>

                            <!-- Row 2: Total Streams -->
                            <tr>
                              <td colspan="3" style="padding:8px;">
                                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:linear-gradient(145deg, #1a2040, #0f1628); border:2px solid #06b6d4; border-radius:16px; box-shadow:0 0 25px rgba(6,182,212,0.3);">
                                  <tr>
                                    <td style="padding:20px; text-align:center;">
                                      <div style="font-size:36px; margin-bottom:8px;">🔥</div>
                                      <div style="font-size:38px; font-weight:900; color:#ffffff; text-shadow:0 0 15px rgba(6,182,212,0.5);">10,000</div>
                                      <div style="font-size:14px; color:#67e8f9; font-weight:600; text-transform:uppercase; letter-spacing:1px; margin-top:4px;">Streams Per Week</div>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>

                            <!-- Arrow Down -->
                            <tr>
                              <td colspan="3" style="text-align:center; padding:12px 0;">
                                <div style="font-size:28px; color:#22c55e;">↓</div>
                              </td>
                            </tr>

                            <!-- Row 3: Money - The Big Payoff -->
                            <tr>
                              <td colspan="3" style="padding:8px;">
                                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:linear-gradient(145deg, #1a3020, #0a2010); border:3px solid #22c55e; border-radius:20px; box-shadow:0 0 30px rgba(34,197,94,0.4), inset 0 0 20px rgba(34,197,94,0.1);">
                                  <tr>
                                    <td style="padding:28px 20px; text-align:center;">
                                      <div style="font-size:44px; margin-bottom:10px;">💰</div>
                                      <div style="font-size:48px; font-weight:900; color:#22c55e; text-shadow:0 0 20px rgba(34,197,94,0.6); letter-spacing:-2px;">$1,000+</div>
                                      <div style="font-size:16px; color:#86efac; font-weight:700; text-transform:uppercase; letter-spacing:2px; margin-top:8px;">In Just One Week</div>
                                      <div style="font-size:12px; color:#a1a1aa; margin-top:10px; font-style:italic;">Paid directly to you every Monday</div>
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
                <strong style="color:#ffffff;">Real earning potential example:</strong>
              </p>
              <p style="margin:0 0 10px 0; font-size:14px; color:#a1a1aa; line-height:1.6;">
                If you convert 200 fans from your social media following and they stream your music 50 times each in one week, that's:
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr><td style="padding:4px 0; font-size:14px; color:#a1a1aa;">200 fans × 50 streams = 10,000 streams/week</td></tr>
                <tr><td style="padding:4px 0; font-size:14px; color:#a1a1aa;">10,000 streams × $0.10 per stream = <strong style="color:#22c55e;">$1,000/week+</strong></td></tr>
              </table>

              <p style="margin:20px 0; font-size:14px; color:#a1a1aa; line-height:1.6;">
                There is no other streaming platform where artists can realistically earn that kind of money in a single week from true fans streaming their music.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:30px 0;">
                <tr>
                  <td align="center">
                    <a href="${applyLink}" style="display:inline-block; background:linear-gradient(135deg, #8b5cf6, #a855f7); color:#ffffff; font-weight:bold; text-decoration:none; padding:16px 40px; border-radius:50px; font-size:16px; letter-spacing:0.05em;">
                      APPLY NOW
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:20px 0 0 0; font-size:14px; color:#a1a1aa; line-height:1.6;">
                We've already heard your music and you're great.
              </p>
              <p style="margin:8px 0 0 0; font-size:14px; color:#a1a1aa; line-height:1.6;">
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

          <!-- Anti-quote spacer -->
          <tr>
            <td style="padding:20px 0; font-size:1px; line-height:1px; color:#0a0a0a;" aria-hidden="true">
              &nbsp;
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
  <!-- Unique identifier to prevent quote detection: ${uniqueId} -->
</body>
</html>`;
};

// Generate DM text
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

const LogStatusBadge = ({ status }: { status: "pending" | "sent" | "failed" }) => {
  const config = {
    pending: { color: "text-yellow-400 bg-yellow-400/10", icon: Clock },
    sent: { color: "text-green-400 bg-green-400/10", icon: CheckCircle },
    failed: { color: "text-red-400 bg-red-400/10", icon: XCircle },
  };

  const { color, icon: Icon } = config[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${color}`}>
      <Icon className="w-3 h-3" />
      {status}
    </span>
  );
};

const AdminInvitations = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const queryClient = useQueryClient();

  // Form state
  const [mode, setMode] = useState<InviteMode>("email");
  const [artistName, setArtistName] = useState("");
  const [artistEmail, setArtistEmail] = useState("");
  const [artistSocialHandle, setArtistSocialHandle] = useState("");
  const [notes, setNotes] = useState("");
  
  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [generatedDMText, setGeneratedDMText] = useState("");

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const fullApplyLink = typeof window !== "undefined" 
    ? `${window.location.origin}${BENEFITS_LINK}` 
    : BENEFITS_LINK;

  // Queries
  const { data: invitations = [], isLoading: loadingInvitations } = useQuery({
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

  const { data: inviteLogs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ["invitation-email-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitation_email_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as InviteLog[];
    },
  });

  // Calculate weekly stats
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const sentThisWeek = inviteLogs.filter(log => {
    const logDate = new Date(log.created_at);
    return log.status === "sent" && logDate >= weekStart && logDate <= weekEnd;
  }).length;

  // Mutations
  const sendEmailMutation = useMutation({
    mutationFn: async ({ isTest = false }: { isTest?: boolean }) => {
      if (!artistEmail && !isTest) throw new Error("Artist email is required");
      
      const htmlBody = generateEmailHtml(artistName || "there", fullApplyLink);
      const textBody = generateEmailText(artistName || "there", fullApplyLink);

      const { data, error } = await supabase.functions.invoke("send-artist-invite", {
        body: {
          artistName: artistName || "there",
          artistEmail: isTest ? "support@musicexclusive.co" : artistEmail,
          htmlBody,
          textBody,
          isTest,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data, { isTest }) => {
      queryClient.invalidateQueries({ queryKey: ["invitation-email-logs"] });
      
      if (isTest) {
        toast.success("Test email sent to support@musicexclusive.co!");
      } else {
        toast.success(`Email sent to ${artistEmail}!`);
        // Also record in artist_invitations for tracking
        recordInvitation("email");
        handleReset();
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to send email: ${error.message}`);
    },
  });

  const recordInvitation = async (platform: InviteMode) => {
    if (!user?.id) return;
    
    await supabase.from("artist_invitations").insert({
      created_by_admin_id: user.id,
      artist_name: artistName.trim() || "Unknown",
      artist_email: artistEmail.trim() || null,
      artist_social_handle: artistSocialHandle.trim() || null,
      platform,
      notes: notes.trim() || null,
      apply_link: fullApplyLink,
      status: "sent",
    });
    
    queryClient.invalidateQueries({ queryKey: ["artist-invitations"] });
  };

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

  const handleGenerateDM = () => {
    const dmText = generateDMMessage(artistName || "there", fullApplyLink);
    setGeneratedDMText(dmText);
    
    // Record the DM generation
    if (user?.id) {
      supabase.from("artist_invitations").insert({
        created_by_admin_id: user.id,
        artist_name: artistName.trim() || "Unknown",
        artist_email: null,
        artist_social_handle: artistSocialHandle.trim() || null,
        platform: "dm",
        notes: notes.trim() || null,
        apply_link: fullApplyLink,
        status: "generated",
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["artist-invitations"] });
      });
    }
    
    toast.success("DM generated! Copy it below.");
  };

  const handleCopyDM = async () => {
    try {
      await navigator.clipboard.writeText(generatedDMText);
      toast.success("DM copied to clipboard!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleDownloadDM = () => {
    const blob = new Blob([generatedDMText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invitation-${(artistName || "artist").replace(/\s+/g, "-").toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Downloaded!");
  };

  const handleReset = () => {
    setArtistName("");
    setArtistEmail("");
    setArtistSocialHandle("");
    setNotes("");
    setGeneratedDMText("");
    setShowPreview(false);
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
          {/* Weekly Stats */}
          <GlowCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Invites Sent This Week</p>
                <p className="text-3xl font-bold text-primary">{sentThisWeek}</p>
              </div>
              <Mail className="w-10 h-10 text-primary/50" />
            </div>
          </GlowCard>

          {/* Mode Toggle & Form */}
          <GlowCard className="p-6">
            <SectionHeader title="Generate Artist Invitation" align="left" />
            
            {/* Mode Toggle */}
            <div className="flex gap-2 mb-6">
              <Button
                type="button"
                variant={mode === "email" ? "default" : "outline"}
                className={`flex-1 ${mode === "email" ? "bg-primary" : ""}`}
                onClick={() => { setMode("email"); setGeneratedDMText(""); }}
              >
                <Mail className="w-4 h-4 mr-2" />
                Email Invite
              </Button>
              <Button
                type="button"
                variant={mode === "dm" ? "default" : "outline"}
                className={`flex-1 ${mode === "dm" ? "bg-primary" : ""}`}
                onClick={() => { setMode("dm"); setShowPreview(false); }}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                DM Text Invite
              </Button>
            </div>

            <div className="space-y-4">
              {mode === "email" ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="artistName">Artist Name (optional)</Label>
                      <Input
                        id="artistName"
                        value={artistName}
                        onChange={(e) => setArtistName(e.target.value)}
                        placeholder="Enter artist name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="artistEmail">Artist Email *</Label>
                      <Input
                        id="artistEmail"
                        type="email"
                        value={artistEmail}
                        onChange={(e) => setArtistEmail(e.target.value)}
                        placeholder="artist@email.com"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Internal notes about this artist..."
                      rows={2}
                    />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={() => setShowPreview(!showPreview)}
                      variant="outline"
                      className="gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      {showPreview ? "Hide Preview" : "Preview Email"}
                    </Button>
                    <Button
                      onClick={() => sendEmailMutation.mutate({ isTest: true })}
                      variant="outline"
                      disabled={sendEmailMutation.isPending}
                      className="gap-2"
                    >
                      {sendEmailMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Send Test to Support
                    </Button>
                    <Button
                      onClick={() => sendEmailMutation.mutate({ isTest: false })}
                      disabled={!artistEmail || sendEmailMutation.isPending}
                      className="bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 gap-2"
                    >
                      {sendEmailMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Send Email
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="artistNameDM">Artist Name (optional)</Label>
                      <Input
                        id="artistNameDM"
                        value={artistName}
                        onChange={(e) => setArtistName(e.target.value)}
                        placeholder="Enter artist name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="artistSocial">Social Handle (optional)</Label>
                      <Input
                        id="artistSocial"
                        value={artistSocialHandle}
                        onChange={(e) => setArtistSocialHandle(e.target.value)}
                        placeholder="@username"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notesDM">Notes (optional)</Label>
                    <Textarea
                      id="notesDM"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Internal notes about this artist..."
                      rows={2}
                    />
                  </div>
                  <Button
                    onClick={handleGenerateDM}
                    className="bg-gradient-to-r from-primary to-purple-600 hover:opacity-90"
                  >
                    Generate DM
                  </Button>
                </>
              )}
            </div>
          </GlowCard>

          {/* Email Preview Panel */}
          {mode === "email" && showPreview && (
            <GlowCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <SectionHeader title="Email Preview" align="left" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(fullApplyLink);
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
              <div className="bg-muted/50 rounded-lg border border-primary/30 overflow-hidden">
                <div className="p-3 bg-primary/10 border-b border-primary/20 text-xs text-muted-foreground flex items-center justify-between">
                  <span>Preview (how it will look in email clients)</span>
                  <span className="text-primary font-medium">Subject: You've been spotted as a top tier artist. You're invited.</span>
                </div>
                <div 
                  className="p-4 max-h-[600px] overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: generateEmailHtml(artistName || "there", fullApplyLink) }}
                />
              </div>
            </GlowCard>
          )}

          {/* DM Output */}
          {mode === "dm" && generatedDMText && (
            <GlowCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <SectionHeader title="Text/DM Message" align="left" />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopyDM}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownloadDM}>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
                <pre className="whitespace-pre-wrap text-sm text-foreground font-mono leading-relaxed">
                  {generatedDMText}
                </pre>
              </div>
              <div className="mt-4">
                <Button variant="outline" onClick={handleReset}>
                  Clear & Start New
                </Button>
              </div>
            </GlowCard>
          )}

          {/* Recent Email Logs */}
          <GlowCard className="p-6">
            <SectionHeader title="Recent Email Sends" align="left" />
            {loadingLogs ? (
              <div className="text-center py-4 text-muted-foreground">Loading...</div>
            ) : inviteLogs.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">No emails sent yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-2 px-2 text-muted-foreground font-medium">Date</th>
                      <th className="text-left py-2 px-2 text-muted-foreground font-medium">Artist</th>
                      <th className="text-left py-2 px-2 text-muted-foreground font-medium">Email</th>
                      <th className="text-left py-2 px-2 text-muted-foreground font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inviteLogs.slice(0, 10).map((log) => (
                      <tr key={log.id} className="border-b border-border/30">
                        <td className="py-2 px-2 text-muted-foreground">
                          {format(new Date(log.created_at), "MMM d, HH:mm")}
                        </td>
                        <td className="py-2 px-2">{log.artist_name}</td>
                        <td className="py-2 px-2 text-muted-foreground">{log.artist_email || "-"}</td>
                        <td className="py-2 px-2">
                          <LogStatusBadge status={log.status} />
                          {log.error_message && (
                            <span className="ml-2 text-xs text-red-400">{log.error_message}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlowCard>

          {/* Invitations Tracking Table */}
          <GlowCard className="p-6">
            <SectionHeader title="Invitation Tracking" align="left" />
            <p className="text-muted-foreground text-sm mb-4">
              Track all artist invitations and their lifecycle status.
            </p>

            {loadingInvitations ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : invitations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No invitations yet. Send your first one above!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">Date</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">Artist</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium hidden md:table-cell">Contact</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">Type</th>
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
