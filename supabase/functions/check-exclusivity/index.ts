import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOGIN_URL = "https://www.musicexclusive.co/login";
const ARTIST_DASHBOARD_URL = "https://www.musicexclusive.co/artist/dashboard";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface TrackRow {
  id: string;
  title: string;
  artist_id: string;
  exclusivity_expires_at: string;
  exclusivity_decision: string | null;
  created_at: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const logStep = (step: string, details?: Record<string, unknown>) => {
    const detailStr = details ? ` | ${JSON.stringify(details)}` : "";
    console.log(`[exclusivity-check] ${step}${detailStr}`);
  };

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    
    // Find tracks that need warnings:
    // 1. No decision made yet (exclusivity_decision IS NULL)
    // 2. Status is not disabled
    // 3. exclusivity_expires_at within warning thresholds
    const { data: tracks, error: tracksErr } = await supabase
      .from("tracks")
      .select("id, title, artist_id, exclusivity_expires_at, exclusivity_decision, created_at")
      .is("exclusivity_decision", null)
      .not("status", "in", '("disabled","uploading")')
      .not("exclusivity_expires_at", "is", null);

    if (tracksErr) {
      logStep("Error fetching tracks", { error: tracksErr.message });
      return new Response(JSON.stringify({ error: tracksErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Found tracks to check", { count: tracks?.length || 0 });

    const emailsSent: string[] = [];

    for (const track of (tracks || []) as TrackRow[]) {
      const expiresAt = new Date(track.exclusivity_expires_at);
      const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Most urgent first: expired → 2d → 1w → 2w (8–14 days only; >14 → no email)
      let warningType: string | null = null;
      if (daysLeft <= 0) {
        warningType = "expired";
      } else if (daysLeft <= 2) {
        warningType = "two_days";
      } else if (daysLeft <= 7) {
        warningType = "one_week";
      } else if (daysLeft <= 14) {
        warningType = "two_weeks";
      }

      if (!warningType) continue;

      // "Expired" notice: send at most once per track (avoid daily emails after period ended with no decision)
      if (warningType === "expired") {
        const { data: everExpired } = await supabase
          .from("email_logs")
          .select("id")
          .eq("email_type", "exclusivity_expired")
          .eq("application_id", track.id)
          .limit(1)
          .maybeSingle();

        if (everExpired) {
          logStep("Already sent exclusivity_expired for track", { trackId: track.id });
          continue;
        }
      }

      // Check if we already sent this warning type for this track today
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const { data: existingLog } = await supabase
        .from("email_logs")
        .select("id")
        .eq("email_type", `exclusivity_${warningType}`)
        .eq("application_id", track.id)
        .gte("created_at", todayStart.toISOString())
        .limit(1)
        .maybeSingle();

      if (existingLog) {
        logStep("Already sent today", { trackId: track.id, warningType });
        continue;
      }

      // Get artist email from artist_profiles -> auth.users
      const { data: artistProfile } = await supabase
        .from("artist_profiles")
        .select("user_id, artist_name")
        .eq("id", track.artist_id)
        .maybeSingle();

      if (!artistProfile) {
        logStep("No artist profile found", { artistId: track.artist_id });
        continue;
      }

      const { data: userData } = await supabase.auth.admin.getUserById(artistProfile.user_id);
      const artistEmail = userData?.user?.email;

      if (!artistEmail) {
        logStep("No artist email found", { userId: artistProfile.user_id });
        continue;
      }

      // Compose email
      const artistName = artistProfile.artist_name || "Artist";
      const safeName = escapeHtml(artistName);
      const safeTitle = escapeHtml(track.title);
      let subject: string;
      let bodyText: string;

      switch (warningType) {
        case "two_weeks":
          subject = `📅 "${track.title}" — Exclusivity: 2 Weeks Remaining`;
          bodyText =
            `Your track "<strong>${safeTitle}</strong>" has between <strong>8 and 14 days</strong> left in its 3-week exclusive release window on Music Exclusive.`;
          break;
        case "one_week":
          subject = `⏳ "${track.title}" — Exclusivity Expiring in 1 Week`;
          bodyText =
            `Your track "<strong>${safeTitle}</strong>" has <strong>7 days or fewer</strong> remaining in its exclusive release window on Music Exclusive.`;
          break;
        case "two_days":
          subject = `⚠️ "${track.title}" — Exclusivity Expires in 2 Days`;
          bodyText =
            `Your track "<strong>${safeTitle}</strong>" has only <strong>2 days left</strong> in its exclusive release window on Music Exclusive.`;
          break;
        case "expired":
          subject = `🔔 "${track.title}" — Exclusivity Period Has Ended`;
          bodyText =
            `The 3-week exclusive release window for "<strong>${safeTitle}</strong>" has ended on Music Exclusive.`;
          break;
        default:
          continue;
      }

      const htmlBody = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background: linear-gradient(180deg, #12121a 0%, #0a0a0f 100%); color: #e8e8ef; padding: 36px 28px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.06);">
          <p style="font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #7c7c8f; margin: 0 0 12px 0;">Music Exclusive · Exclusivity</p>
          <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 16px 0; color: #ffffff; line-height: 1.3;">Hey ${safeName},</h1>
          <p style="font-size: 15px; line-height: 1.65; color: #b8b8c8; margin: 0 0 20px 0;">
            ${bodyText}
          </p>
          <p style="font-size: 15px; line-height: 1.65; color: #b8b8c8; margin: 0 0 8px 0;">
            You have two options:
          </p>
          <ul style="font-size: 14px; line-height: 1.85; color: #b8b8c8; padding-left: 20px; margin: 0 0 20px 0;">
            <li style="margin-bottom: 6px;"><strong style="color: #4ade80;">Keep on Platform</strong> — Continue earning royalties. You're free to release on other platforms.</li>
            <li><strong style="color: #f87171;">Remove from Platform</strong> — Track removed. You will no longer receive royalties.</li>
          </ul>
          <div style="background: rgba(168, 85, 247, 0.08); border-left: 3px solid #a855f7; padding: 12px 14px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
            <p style="font-size: 13px; line-height: 1.6; color: #a0a0b8; margin: 0;">
              If you don't take action, your track will remain on the platform and continue to earn royalties until you decide.
            </p>
          </div>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom: 10px;">
            <tr>
              <td>
                <a href="${LOGIN_URL}" style="display: inline-block; background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%); color: #ffffff !important; padding: 14px 28px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 14px;">
                  Sign in to Music Exclusive
                </a>
              </td>
            </tr>
          </table>
          <p style="font-size: 13px; color: #8b8b9c; margin: 0 0 20px 0;">
            After signing in, open your <a href="${ARTIST_DASHBOARD_URL}" style="color: #c4b5fd;">artist dashboard</a> to review this track.
          </p>
          <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 28px 0 20px 0;" />
          <p style="font-size: 12px; line-height: 1.6; color: #6b6b7a; margin: 0 0 8px 0;">
            Questions? Reply to this email or write <a href="mailto:support@musicexclusive.co" style="color: #a855f7;">support@musicexclusive.co</a> — we read every message.
          </p>
          <p style="font-size: 11px; color: #4a4a58; margin: 0;">
            — The Music Exclusive Team
          </p>
        </div>
      `;

      // Send email via Resend
      if (resendKey) {
        try {
          const resendResp = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Music Exclusive <support@musicexclusive.co>",
              reply_to: "support@musicexclusive.co",
              to: [artistEmail],
              subject,
              html: htmlBody,
            }),
          });

          const resendData = await resendResp.json();

          // Log the email
          await supabase.from("email_logs").insert({
            email_type: `exclusivity_${warningType}`,
            recipient_email: artistEmail,
            application_id: track.id,
            status: resendResp.ok ? "sent" : "failed",
            sent_at: resendResp.ok ? new Date().toISOString() : null,
            error_message: resendResp.ok ? null : JSON.stringify(resendData),
            resend_id: resendData?.id || null,
          });

          if (resendResp.ok) {
            emailsSent.push(`${track.title} (${warningType})`);
            logStep("Email sent", { trackId: track.id, warningType, to: artistEmail });
          } else {
            logStep("Email failed", { trackId: track.id, error: resendData });
          }
        } catch (emailErr) {
          logStep("Email send error", { trackId: track.id, error: String(emailErr) });
          await supabase.from("email_logs").insert({
            email_type: `exclusivity_${warningType}`,
            recipient_email: artistEmail,
            application_id: track.id,
            status: "failed",
            error_message: String(emailErr),
          });
        }
      } else {
        logStep("RESEND_API_KEY not set, skipping email", { trackId: track.id });
      }
    }

    return new Response(
      JSON.stringify({ success: true, emailsSent }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    logStep("Unhandled error", { error: String(err) });
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
