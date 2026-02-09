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

// ── Timezone helpers ─────────────────────────────────────────────────────

/** Return "YYYY-MM-DD" for yesterday in America/Los_Angeles */
function getYesterdayLA(): string {
  const now = new Date();
  const laStr = now.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" }); // "YYYY-MM-DD"
  const laDate = new Date(laStr + "T00:00:00");
  laDate.setDate(laDate.getDate() - 1);
  return laDate.toISOString().split("T")[0];
}

/** Convert a YYYY-MM-DD date in America/Los_Angeles to a UTC ISO string for that midnight */
function laMidnightToUTC(dateStr: string): string {
  // Build a formatter that tells us the UTC offset for this LA date
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
    timeZoneName: "longOffset",
  });

  // Parse offset from a known date in that zone
  const probe = new Date(`${dateStr}T12:00:00Z`); // noon UTC as a probe
  const parts = formatter.formatToParts(probe);
  const tzPart = parts.find(p => p.type === "timeZoneName")?.value || "";
  // tzPart is like "GMT-08:00" or "GMT-07:00"
  const match = tzPart.match(/GMT([+-]\d{2}):(\d{2})/);

  let offsetMinutes = 0;
  if (match) {
    const sign = match[1].startsWith("-") ? -1 : 1;
    offsetMinutes = sign * (parseInt(match[1].replace(/[+-]/, "")) * 60 + parseInt(match[2]));
  }

  // midnight LA = midnight - offset => UTC
  // If LA is GMT-8, midnight LA = 08:00 UTC
  const midnightUTC = new Date(`${dateStr}T00:00:00Z`);
  midnightUTC.setMinutes(midnightUTC.getMinutes() - offsetMinutes);
  return midnightUTC.toISOString();
}

// ── Types ────────────────────────────────────────────────────────────────

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

// ── Report Generator ─────────────────────────────────────────────────────

async function generateReport(supabase: any, reportDate: string): Promise<ReportData> {
  const startUTC = laMidnightToUTC(reportDate);

  const nextDay = new Date(reportDate + "T00:00:00");
  nextDay.setDate(nextDay.getDate() + 1);
  const nextDayStr = nextDay.toISOString().split("T")[0];
  const endUTC = laMidnightToUTC(nextDayStr);

  logStep("Generating report", { reportDate, startUTC, endUTC, timezone: "America/Los_Angeles" });
  logStep("Query logic", {
    streams: `stream_ledger WHERE created_at >= '${startUTC}' AND created_at < '${endUTC}'`,
    topArtists: "GROUP BY artist_id → JOIN artist_profiles ON id::text = artist_id",
    topTracks: "GROUP BY track_id → JOIN tracks ON id = track_id → JOIN artist_profiles ON id::text = tracks.artist_id",
  });

  // ── Stream data ──────────────────────────────────────────────────────
  const { data: streams, error: streamsError } = await supabase
    .from("stream_ledger")
    .select("*")
    .gte("created_at", startUTC)
    .lt("created_at", endUTC);

  if (streamsError) {
    logStep("Error fetching streams", { error: streamsError.message });
    throw streamsError;
  }

  const totalStreams = streams?.length || 0;
  const totalCreditsUsed = streams?.reduce((sum: number, s: any) => sum + s.credits_spent, 0) || 0;
  const grossRevenue = streams?.reduce((sum: number, s: any) => sum + Number(s.amount_total), 0) || 0;
  const platformRevenue = streams?.reduce((sum: number, s: any) => sum + Number(s.amount_platform), 0) || 0;
  const artistEarnings = streams?.reduce((sum: number, s: any) => sum + Number(s.amount_artist), 0) || 0;
  const pendingStreams = streams?.filter((s: any) => s.payout_status === "pending").length || 0;
  const paidStreams = streams?.filter((s: any) => s.payout_status === "paid").length || 0;

  // ── Growth metrics ───────────────────────────────────────────────────
  const { data: vaultWinners } = await supabase
    .from("vault_codes")
    .select("id")
    .eq("status", "won")
    .gte("used_at", startUTC)
    .lt("used_at", endUTC);

  const { data: newArtists } = await supabase
    .from("artist_profiles")
    .select("id")
    .gte("created_at", startUTC)
    .lt("created_at", endUTC);

  const { data: newTracks } = await supabase
    .from("tracks")
    .select("id")
    .gte("created_at", startUTC)
    .lt("created_at", endUTC);

  // ── Top 5 Artists ────────────────────────────────────────────────────
  // stream_ledger.artist_id is text, stores artist_profiles.id (UUID as text)
  const artistCounts = new Map<string, number>();
  streams?.forEach((s: any) => {
    artistCounts.set(s.artist_id, (artistCounts.get(s.artist_id) || 0) + 1);
  });

  const sortedArtistEntries = Array.from(artistCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const artistIds = sortedArtistEntries.map(([id]) => id);
  let artistNameMap = new Map<string, string>();

  if (artistIds.length > 0) {
    // Join directly to artist_profiles (not the view) for guaranteed id match
    const { data: profiles, error: profilesError } = await supabase
      .from("artist_profiles")
      .select("id, artist_name")
      .in("id", artistIds);

    if (profilesError) {
      logStep("Error fetching artist profiles", { error: profilesError.message });
    } else if (profiles) {
      for (const p of profiles) {
        artistNameMap.set(p.id, p.artist_name);
      }
    }
  }

  const topArtists = sortedArtistEntries.map(([id, count]) => ({
    name: artistNameMap.get(id) || `Unknown (${id.slice(0, 8)})`,
    streams: count,
  }));

  logStep("Top Artists resolved", { topArtists });

  // ── Top 5 Tracks ────────────────────────────────────────────────────
  const trackCounts = new Map<string, number>();
  streams?.forEach((s: any) => {
    trackCounts.set(s.track_id, (trackCounts.get(s.track_id) || 0) + 1);
  });

  const sortedTrackEntries = Array.from(trackCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const trackIds = sortedTrackEntries.map(([id]) => id);
  let trackInfoMap = new Map<string, { title: string; artistId: string }>();

  if (trackIds.length > 0) {
    const { data: tracks, error: tracksError } = await supabase
      .from("tracks")
      .select("id, title, artist_id")
      .in("id", trackIds);

    if (tracksError) {
      logStep("Error fetching tracks", { error: tracksError.message });
    } else if (tracks) {
      // Collect any artist_ids we haven't fetched yet
      const missingArtistIds = new Set<string>();
      for (const t of tracks) {
        trackInfoMap.set(t.id, { title: t.title, artistId: t.artist_id });
        if (!artistNameMap.has(t.artist_id)) {
          missingArtistIds.add(t.artist_id);
        }
      }
      // Fetch any missing artist names
      if (missingArtistIds.size > 0) {
        const { data: extraProfiles } = await supabase
          .from("artist_profiles")
          .select("id, artist_name")
          .in("id", Array.from(missingArtistIds));
        if (extraProfiles) {
          for (const p of extraProfiles) {
            artistNameMap.set(p.id, p.artist_name);
          }
        }
      }
    }
  }

  const topTracks = sortedTrackEntries.map(([id, count]) => {
    const info = trackInfoMap.get(id);
    return {
      title: info?.title || "Unknown",
      artist: info ? (artistNameMap.get(info.artistId) || "Unknown") : "Unknown",
      streams: count,
    };
  });

  logStep("Top Tracks resolved", { topTracks });

  // ── Top 10 Fans ─────────────────────────────────────────────────────
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
    dateRange: { start: startUTC, end: endUTC },
    streaming: { totalStreams, totalCreditsUsed, grossRevenue, platformRevenue, artistEarnings, pendingStreams, paidStreams },
    growth: { newVaultWinners: vaultWinners?.length || 0, newArtists: newArtists?.length || 0, newTracks: newTracks?.length || 0 },
    topArtists,
    topTracks,
    topFans,
  };
}

// ── Email HTML ────────────────────────────────────────────────────────────

function generateEmailHtml(report: ReportData): string {
  const topArtistsList = report.topArtists.length > 0
    ? `<ol style="margin:0;padding-left:20px;">${report.topArtists.map(a =>
        `<li style="padding:6px 0;border-bottom:1px solid #333;">${escapeHtml(a.name)} — <strong>${a.streams}</strong> stream${a.streams !== 1 ? 's' : ''}</li>`
      ).join("")}</ol>`
    : `<p style="color:#888;">No streams today</p>`;

  const topTracksList = report.topTracks.length > 0
    ? `<ol style="margin:0;padding-left:20px;">${report.topTracks.map(t =>
        `<li style="padding:6px 0;border-bottom:1px solid #333;"><strong>${escapeHtml(t.title)}</strong> by ${escapeHtml(t.artist)} — ${t.streams} stream${t.streams !== 1 ? 's' : ''}</li>`
      ).join("")}</ol>`
    : `<p style="color:#888;">No streams today</p>`;

  const topFansList = report.topFans.length > 0
    ? `<ol style="margin:0;padding-left:20px;">${report.topFans.map(f =>
        `<li style="padding:4px 0;">${escapeHtml(f.email)} — ${f.streams} stream${f.streams !== 1 ? 's' : ''}</li>`
      ).join("")}</ol>`
    : `<p style="color:#888;">No streams today</p>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Daily Report - ${escapeHtml(report.reportDate)}</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #fff; margin: 0; padding: 40px 20px; }
.container { max-width: 600px; margin: 0 auto; }
.header { text-align: center; margin-bottom: 30px; }
.header h1 { color: #a855f7; margin: 0 0 8px 0; font-size: 28px; }
.header p { color: #888; margin: 0; font-size: 14px; }
.card { background: #111; border: 1px solid #333; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
.card h2 { color: #a855f7; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 16px 0; }
.stats-grid { display: flex; flex-wrap: wrap; gap: 15px; }
.stat { flex: 1 1 45%; text-align: center; min-width: 120px; }
.stat-value { font-size: 24px; font-weight: bold; color: #fff; }
.stat-label { font-size: 12px; color: #888; margin-top: 4px; }
.highlight { color: #22c55e; }
ol { color: #ddd; }
ol li { font-size: 14px; }
.footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
.footer a { color: #a855f7; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>Music Exclusive&#8482;</h1>
    <p>Daily Company Report &mdash; ${escapeHtml(report.reportDate)} (Pacific Time)</p>
  </div>

  <div class="card">
    <h2>&#128202; Streaming Activity</h2>
    <div class="stats-grid">
      <div class="stat"><div class="stat-value">${report.streaming.totalStreams}</div><div class="stat-label">Total Streams</div></div>
      <div class="stat"><div class="stat-value">${report.streaming.totalCreditsUsed}</div><div class="stat-label">Credits Used</div></div>
      <div class="stat"><div class="stat-value highlight">$${report.streaming.grossRevenue.toFixed(2)}</div><div class="stat-label">Gross Revenue</div></div>
      <div class="stat"><div class="stat-value highlight">$${report.streaming.platformRevenue.toFixed(2)}</div><div class="stat-label">Platform Revenue</div></div>
      <div class="stat"><div class="stat-value">$${report.streaming.artistEarnings.toFixed(2)}</div><div class="stat-label">Artist Earnings</div></div>
      <div class="stat"><div class="stat-value">${report.streaming.pendingStreams} / ${report.streaming.paidStreams}</div><div class="stat-label">Pending / Paid</div></div>
    </div>
  </div>

  <div class="card">
    <h2>&#128200; Growth</h2>
    <div class="stats-grid">
      <div class="stat"><div class="stat-value">${report.growth.newVaultWinners}</div><div class="stat-label">New Vault Winners</div></div>
      <div class="stat"><div class="stat-value">${report.growth.newArtists}</div><div class="stat-label">New Artists</div></div>
      <div class="stat"><div class="stat-value">${report.growth.newTracks}</div><div class="stat-label">New Tracks</div></div>
    </div>
  </div>

  <div class="card">
    <h2>&#127908; Top 5 Artists</h2>
    ${topArtistsList}
  </div>

  <div class="card">
    <h2>&#127925; Top 5 Tracks</h2>
    ${topTracksList}
  </div>

  <div class="card">
    <h2>&#128101; Top 10 Fans</h2>
    ${topFansList}
  </div>

  <div class="footer">
    <p>This report was automatically generated by Music Exclusive.</p>
    <p><a href="https://musicexclusive.lovable.app/admin/reports/daily?date=${report.reportDate}">Open Dashboard</a></p>
  </div>
</div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Main Handler ─────────────────────────────────────────────────────────

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

    // Default to yesterday in America/Los_Angeles
    const reportDate = body.date || getYesterdayLA();
    const recipientEmail = "support@musicexclusive.co";
    const sendEmail = body.sendEmail !== false;

    logStep("Processing request", { reportDate, recipientEmail, sendEmail });

    // ── Idempotency check ────────────────────────────────────────────
    if (sendEmail) {
      const { data: existing } = await supabaseAdmin
        .from("report_email_logs")
        .select("id")
        .eq("report_date", reportDate)
        .eq("report_type", "daily")
        .eq("status", "sent")
        .limit(1);

      if (existing && existing.length > 0) {
        logStep("SKIPPED — report already sent for this date", { reportDate });
        return new Response(
          JSON.stringify({ success: true, skipped: true, reason: "already_sent", reportDate }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ── Generate report ──────────────────────────────────────────────
    const report = await generateReport(supabaseAdmin, reportDate);

    logStep("Report generated", {
      totalStreams: report.streaming.totalStreams,
      grossRevenue: report.streaming.grossRevenue,
      platformRevenue: report.streaming.platformRevenue,
      artistEarnings: report.streaming.artistEarnings,
      pendingStreams: report.streaming.pendingStreams,
      paidStreams: report.streaming.paidStreams,
      topArtists: report.topArtists,
      topTracks: report.topTracks,
      topFans: report.topFans,
      dateRange: report.dateRange,
    });

    // ── Send email ───────────────────────────────────────────────────
    if (sendEmail) {
      const { data: logEntry, error: logError } = await supabaseAdmin
        .from("report_email_logs")
        .insert({ report_date: reportDate, report_type: "daily", recipient_email: recipientEmail, status: "pending" })
        .select("id")
        .single();

      if (logError) logStep("Error creating log entry", { error: logError.message });

      try {
        const emailHtml = generateEmailHtml(report);

        const emailResult = await resend.emails.send({
          from: "Music Exclusive <noreply@themusicisexclusive.com>",
          reply_to: "support@musicexclusive.co",
          to: [recipientEmail],
          subject: `Music Exclusive — Daily Report (${reportDate})`,
          html: emailHtml,
        });

        if (emailResult.error) throw new Error(emailResult.error.message);

        logStep("Email sent successfully", { emailId: emailResult.data?.id });

        if (logEntry?.id) {
          await supabaseAdmin.from("report_email_logs")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", logEntry.id);
        }

        return new Response(
          JSON.stringify({ success: true, report, emailSent: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (emailError: any) {
        logStep("Email send failed", { error: emailError.message });
        if (logEntry?.id) {
          await supabaseAdmin.from("report_email_logs")
            .update({ status: "failed", error_message: emailError.message })
            .eq("id", logEntry.id);
        }
        return new Response(
          JSON.stringify({ success: true, report, emailSent: false, emailError: emailError.message }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

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
