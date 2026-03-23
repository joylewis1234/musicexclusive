import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ARTIST_DASHBOARD_URL = "https://www.musicexclusive.co/login";

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

      // Determine which warning stage this track is at
      let warningType: string | null = null;
      if (daysLeft <= 0) {
        warningType = "expired";
      } else if (daysLeft <= 2) {
        warningType = "two_days";
      } else if (daysLeft <= 7) {
        warningType = "one_week";
      }

      if (!warningType) continue;

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
      let subject: string;
      let bodyText: string;

      switch (warningType) {
        case "one_week":
          subject = `⏳ "${track.title}" — Exclusivity Expiring in 1 Week`;
          bodyText = `Your track "<strong>${track.title}</strong>" has <strong>7 days</strong> remaining in its exclusive release window on Music Exclusive.`;
          break;
        case "two_days":
          subject = `⚠️ "${track.title}" — Exclusivity Expires in 2 Days`;
          bodyText = `Your track "<strong>${track.title}</strong>" has only <strong>2 days left</strong> in its exclusive release window on Music Exclusive.`;
          break;
        case "expired":
          subject = `🔔 "${track.title}" — Exclusivity Period Has Ended`;
          bodyText = `The 3-week exclusive release window for "<strong>${track.title}</strong>" has ended on Music Exclusive.`;
          break;
        default:
          continue;
      }

      const htmlBody = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; background: #0a0a0f; color: #e2e2e8; padding: 32px 24px; border-radius: 16px;">
          <h1 style="font-size: 20px; margin-bottom: 8px; color: #ffffff;">Hey ${artistName},</h1>
          <p style="font-size: 15px; line-height: 1.6; color: #a0a0b0; margin-bottom: 16px;">
            ${bodyText}
          </p>
          <p style="font-size: 15px; line-height: 1.6; color: #a0a0b0; margin-bottom: 8px;">
            You have two options:
          </p>
          <ul style="font-size: 14px; line-height: 1.8; color: #a0a0b0; padding-left: 20px; margin-bottom: 16px;">
            <li><strong style="color: #4ade80;">Keep on Platform</strong> — Continue earning royalties. You're free to release on other platforms.</li>
            <li><strong style="color: #f87171;">Remove from Platform</strong> — Track removed. You will no longer receive royalties.</li>
          </ul>
          <p style="font-size: 13px; color: #707080; margin-bottom: 24px;">
            If you don't take action, your track will remain on the platform and continue to earn royalties until you decide.
          </p>
          <a href="${ARTIST_DASHBOARD_URL}" style="display: inline-block; background: hsl(280, 80%, 50%); color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Go to My Dashboard
          </a>
          <p style="font-size: 12px; color: #505060; margin-top: 32px;">
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
              from: "Music Exclusive <noreply@musicexclusive.co>",
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
