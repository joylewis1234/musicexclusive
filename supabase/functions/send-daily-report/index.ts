import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DAILY-REPORT] ${step}${detailsStr}`);
};

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

async function generateReport(supabase: any, reportDate: string): Promise<ReportData> {
  const startOfDay = `${reportDate}T00:00:00.000Z`;
  const endOfDay = `${reportDate}T23:59:59.999Z`;

  logStep("Generating report", { reportDate, startOfDay, endOfDay });

  // Fetch stream data for the day
  const { data: streams, error: streamsError } = await supabase
    .from("stream_ledger")
    .select("*")
    .gte("created_at", startOfDay)
    .lte("created_at", endOfDay);

  if (streamsError) {
    logStep("Error fetching streams", { error: streamsError.message });
    throw streamsError;
  }

  // Calculate streaming metrics
  const totalStreams = streams?.length || 0;
  const totalCreditsUsed = streams?.reduce((sum: number, s: any) => sum + s.credits_spent, 0) || 0;
  const grossRevenue = streams?.reduce((sum: number, s: any) => sum + Number(s.amount_total), 0) || 0;
  const platformRevenue = streams?.reduce((sum: number, s: any) => sum + Number(s.amount_platform), 0) || 0;
  const artistEarnings = streams?.reduce((sum: number, s: any) => sum + Number(s.amount_artist), 0) || 0;
  const pendingStreams = streams?.filter((s: any) => s.payout_status === "pending").length || 0;
  const paidStreams = streams?.filter((s: any) => s.payout_status === "paid").length || 0;

  // Fetch new vault winners
  const { data: vaultWinners } = await supabase
    .from("vault_codes")
    .select("id")
    .eq("status", "won")
    .gte("used_at", startOfDay)
    .lte("used_at", endOfDay);

  // Fetch new artists
  const { data: newArtists } = await supabase
    .from("artist_profiles")
    .select("id")
    .gte("created_at", startOfDay)
    .lte("created_at", endOfDay);

  // Fetch new tracks
  const { data: newTracks } = await supabase
    .from("tracks")
    .select("id")
    .gte("created_at", startOfDay)
    .lte("created_at", endOfDay);

  // Calculate top artists
  const artistCounts = new Map<string, number>();
  streams?.forEach((s: any) => {
    artistCounts.set(s.artist_id, (artistCounts.get(s.artist_id) || 0) + 1);
  });

  const sortedArtists = Array.from(artistCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Get artist names
  const artistIds = sortedArtists.map(([id]) => id);
  const { data: artistProfilesData } = await supabase
    .from("public_artist_profiles")
    .select("user_id, artist_name")
    .in("user_id", artistIds);

  const artistProfiles = artistProfilesData as Array<{ user_id: string; artist_name: string }> | null;

  const topArtists = sortedArtists.map(([id, count]) => ({
    name: artistProfiles?.find((a) => a.user_id === id)?.artist_name || id.slice(0, 8) + "...",
    streams: count,
  }));

  // Calculate top tracks
  const trackCounts = new Map<string, number>();
  streams?.forEach((s: any) => {
    trackCounts.set(s.track_id, (trackCounts.get(s.track_id) || 0) + 1);
  });

  const sortedTracks = Array.from(trackCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const trackIds = sortedTracks.map(([id]) => id);
  const { data: tracksData } = await supabase
    .from("tracks")
    .select("id, title, artist_id")
    .in("id", trackIds);

  const tracks = tracksData as Array<{ id: string; title: string; artist_id: string }> | null;

  const topTracks = sortedTracks.map(([id, count]) => {
    const track = tracks?.find((t) => t.id === id);
    const artist = artistProfiles?.find((a) => a.user_id === track?.artist_id);
    return {
      title: track?.title || "Unknown",
      artist: artist?.artist_name || "Unknown",
      streams: count,
    };
  });

  // Calculate top fans
  const fanCounts = new Map<string, number>();
  streams?.forEach((s: any) => {
    fanCounts.set(s.fan_email, (fanCounts.get(s.fan_email) || 0) + 1);
  });

  const topFans = Array.from(fanCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([email, count]) => ({ email, streams: count }));

  return {
    reportDate,
    dateRange: { start: startOfDay, end: endOfDay },
    streaming: {
      totalStreams,
      totalCreditsUsed,
      grossRevenue,
      platformRevenue,
      artistEarnings,
      pendingStreams,
      paidStreams,
    },
    growth: {
      newVaultWinners: vaultWinners?.length || 0,
      newArtists: newArtists?.length || 0,
      newTracks: newTracks?.length || 0,
    },
    topArtists,
    topTracks,
    topFans,
  };
}

function generateEmailHtml(report: ReportData): string {
  const topArtistsHtml = report.topArtists.length > 0
    ? report.topArtists.map((a, i) => `<tr><td>${i + 1}.</td><td>${a.name}</td><td>${a.streams} streams</td></tr>`).join("")
    : "<tr><td colspan='3'>No streams today</td></tr>";

  const topTracksHtml = report.topTracks.length > 0
    ? report.topTracks.map((t, i) => `<tr><td>${i + 1}.</td><td>${t.title}</td><td>${t.artist}</td><td>${t.streams}</td></tr>`).join("")
    : "<tr><td colspan='4'>No streams today</td></tr>";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #ffffff; padding: 40px; }
        .container { max-width: 600px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #a855f7; margin: 0; }
        .header p { color: #888; }
        .card { background: #111; border: 1px solid #333; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
        .card h2 { color: #a855f7; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin-top: 0; }
        .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
        .stat { text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; color: #fff; }
        .stat-label { font-size: 12px; color: #888; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #333; }
        th { color: #888; font-size: 12px; text-transform: uppercase; }
        .highlight { color: #22c55e; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://www.themusicisexclusive.com/favicon.png" alt="Music Exclusive" width="56" height="56" style="display: block; margin: 0 auto 16px auto; border-radius: 12px;" />
          <h1>Music Exclusive™</h1>
          <p>Daily Company Report — ${report.reportDate}</p>
        </div>

        <div class="card">
          <h2>📊 Streaming Activity</h2>
          <div class="stats-grid">
            <div class="stat">
              <div class="stat-value">${report.streaming.totalStreams}</div>
              <div class="stat-label">Total Streams</div>
            </div>
            <div class="stat">
              <div class="stat-value">${report.streaming.totalCreditsUsed}</div>
              <div class="stat-label">Credits Used</div>
            </div>
            <div class="stat">
              <div class="stat-value highlight">$${report.streaming.grossRevenue.toFixed(2)}</div>
              <div class="stat-label">Gross Revenue</div>
            </div>
            <div class="stat">
              <div class="stat-value highlight">$${report.streaming.platformRevenue.toFixed(2)}</div>
              <div class="stat-label">Platform Revenue</div>
            </div>
            <div class="stat">
              <div class="stat-value">$${report.streaming.artistEarnings.toFixed(2)}</div>
              <div class="stat-label">Artist Earnings</div>
            </div>
            <div class="stat">
              <div class="stat-value">${report.streaming.pendingStreams} / ${report.streaming.paidStreams}</div>
              <div class="stat-label">Pending / Paid</div>
            </div>
          </div>
        </div>

        <div class="card">
          <h2>📈 Growth</h2>
          <div class="stats-grid">
            <div class="stat">
              <div class="stat-value">${report.growth.newVaultWinners}</div>
              <div class="stat-label">New Vault Winners</div>
            </div>
            <div class="stat">
              <div class="stat-value">${report.growth.newArtists}</div>
              <div class="stat-label">New Artists</div>
            </div>
            <div class="stat">
              <div class="stat-value">${report.growth.newTracks}</div>
              <div class="stat-label">New Tracks</div>
            </div>
          </div>
        </div>

        <div class="card">
          <h2>🎤 Top 5 Artists Today</h2>
          <table>
            <thead><tr><th>#</th><th>Artist</th><th>Streams</th></tr></thead>
            <tbody>${topArtistsHtml}</tbody>
          </table>
        </div>

        <div class="card">
          <h2>🎵 Top 5 Tracks Today</h2>
          <table>
            <thead><tr><th>#</th><th>Track</th><th>Artist</th><th>Streams</th></tr></thead>
            <tbody>${topTracksHtml}</tbody>
          </table>
        </div>

        <div class="footer">
          <p>This report was automatically generated by Music Exclusive.</p>
          <p>View full report: <a href="https://id-preview--09644822-430a-4a4e-a068-bdf812a2aedf.lovable.app/admin/reports/daily?date=${report.reportDate}" style="color: #a855f7;">Open Dashboard</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    logStep("ERROR: RESEND_API_KEY not configured");
    return new Response(
      JSON.stringify({ error: "Email service not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const resend = new Resend(resendApiKey);

  try {
    const body = await req.json().catch(() => ({}));
    
    // Default to yesterday if no date provided (for scheduled runs)
    const reportDate = body.date || new Date(Date.now() - 86400000).toISOString().split("T")[0];
    // Always send to company support email
    const recipientEmail = "support@musicexclusive.co";
    const sendEmail = body.sendEmail !== false;

    logStep("Processing request", { reportDate, recipientEmail, sendEmail });

    // Generate the report
    const report = await generateReport(supabaseAdmin, reportDate);

    logStep("Report generated", { 
      totalStreams: report.streaming.totalStreams,
      grossRevenue: report.streaming.grossRevenue 
    });

    // If sendEmail is true, send the email
    if (sendEmail) {
      // Create log entry
      const { data: logEntry, error: logError } = await supabaseAdmin
        .from("report_email_logs")
        .insert({
          report_date: reportDate,
          report_type: "daily",
          recipient_email: recipientEmail,
          status: "pending",
        })
        .select("id")
        .single();

      if (logError) {
        logStep("Error creating log entry", { error: logError.message });
      }

      try {
        const emailHtml = generateEmailHtml(report);

        // Try primary domain first
        let emailResult = await resend.emails.send({
          from: "Music Exclusive <noreply@themusicisexclusive.com>",
          reply_to: "support@musicexclusive.co",
          to: [recipientEmail],
          subject: `Music Exclusive — Daily Report (${reportDate})`,
          html: emailHtml,
        });


        // Check if email actually succeeded
        if (emailResult.error) {
          throw new Error(emailResult.error.message);
        }

        logStep("Email sent successfully", { emailId: emailResult.data?.id });

        // Update log entry
        if (logEntry?.id) {
          await supabaseAdmin
            .from("report_email_logs")
            .update({ 
              status: "sent", 
              sent_at: new Date().toISOString() 
            })
            .eq("id", logEntry.id);
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            report, 
            emailSent: true,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (emailError: any) {
        logStep("Email send failed", { error: emailError.message });

        // Update log entry with error
        if (logEntry?.id) {
          await supabaseAdmin
            .from("report_email_logs")
            .update({ 
              status: "failed", 
              error_message: emailError.message 
            })
            .eq("id", logEntry.id);
        }

        // Still return the report data even if email fails
        return new Response(
          JSON.stringify({ 
            success: true, 
            report, 
            emailSent: false,
            emailError: emailError.message 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Just return the report without sending email
    return new Response(
      JSON.stringify({ success: true, report, emailSent: false }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
