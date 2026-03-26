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

const REPORT_TIMEZONE = "America/Chicago";

/** Return "YYYY-MM-DD" for yesterday in America/Chicago */
function getYesterdayCT(): string {
  const now = new Date();
  const todayCT = now.toLocaleDateString("en-CA", { timeZone: REPORT_TIMEZONE }); // "YYYY-MM-DD"
  const [year, month, day] = todayCT.split("-").map(Number);
  const todayUTC = new Date(Date.UTC(year, month - 1, day));
  todayUTC.setUTCDate(todayUTC.getUTCDate() - 1);
  const y = todayUTC.getUTCFullYear();
  const m = String(todayUTC.getUTCMonth() + 1).padStart(2, "0");
  const d = String(todayUTC.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Convert a YYYY-MM-DD date in America/Chicago to a UTC ISO string for that midnight */
function tzMidnightToUTC(dateStr: string): string {
  // Build a formatter that tells us the UTC offset for this CT date
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: REPORT_TIMEZONE,
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
  const startUTC = tzMidnightToUTC(reportDate);

  const nextDay = new Date(reportDate + "T00:00:00");
  nextDay.setDate(nextDay.getDate() + 1);
  const nextDayStr = nextDay.toISOString().split("T")[0];
  const endUTC = tzMidnightToUTC(nextDayStr);

  logStep("Generating report", { reportDate, startUTC, endUTC, timezone: REPORT_TIMEZONE });
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
    .lt("created_at", endUTC)
    .limit(10000);

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
  // ── Formatting helpers (display only, no calculation changes) ──
  const fmtNum = (n: number | null | undefined): string => {
    return (n ?? 0).toLocaleString("en-US");
  };
  const fmtMoney = (n: number | null | undefined): string => {
    return "$" + (n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // ── Reusable row builder ──
  const labelStyle = "white-space:nowrap;word-break:keep-all;overflow-wrap:normal;font-size:12px;color:#a1a1aa;padding:8px 0;border-bottom:1px solid #222;";
  const valueStyle = "white-space:nowrap;text-align:right;font-weight:700;font-size:16px;color:#fff;padding:8px 0;border-bottom:1px solid #222;";
  const greenValueStyle = valueStyle.replace("color:#fff", "color:#22c55e");

  const metricRow = (label: string, value: string, green = false) =>
    `<tr><td style="${labelStyle}">${label}</td><td style="${green ? greenValueStyle : valueStyle}"><span style="white-space:nowrap;">${value}</span></td></tr>`;

  const tableWrap = (rows: string) =>
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>`;

  // ── Top lists with 2-col table inside each li ──
  const listItemRow = (left: string, right: string) =>
    `<li style="padding:6px 0;border-bottom:1px solid #333;font-size:14px;color:#ddd;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:0;width:99%;padding-right:12px;">${left}</td><td style="white-space:nowrap;text-align:right;font-weight:700;color:#fff;"><span style="white-space:nowrap;">${right}</span></td></tr></table></li>`;

  const topArtistsList = report.topArtists.length > 0
    ? `<ol style="margin:0;padding-left:20px;">${report.topArtists.map(a =>
        listItemRow(escapeHtml(a.name), `${fmtNum(a.streams)} stream${a.streams !== 1 ? "s" : ""}`)
      ).join("")}</ol>`
    : `<p style="color:#888;">No streams today</p>`;

  const topTracksList = report.topTracks.length > 0
    ? `<ol style="margin:0;padding-left:20px;">${report.topTracks.map(t =>
        listItemRow(`<strong>${escapeHtml(t.title)}</strong> <span style="color:#888;">by ${escapeHtml(t.artist)}</span>`, `${fmtNum(t.streams)} stream${t.streams !== 1 ? "s" : ""}`)
      ).join("")}</ol>`
    : `<p style="color:#888;">No streams today</p>`;

  const topFansList = report.topFans.length > 0
    ? `<ol style="margin:0;padding-left:20px;">${report.topFans.map(f =>
        listItemRow(escapeHtml(f.email), `${fmtNum(f.streams)} stream${f.streams !== 1 ? "s" : ""}`)
      ).join("")}</ol>`
    : `<p style="color:#888;">No streams today</p>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Daily Report - ${escapeHtml(report.reportDate)}</title>
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0a0a;color:#fff;margin:0;padding:40px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

  <!-- Header -->
  <tr><td style="text-align:center;padding-bottom:30px;">
    <h1 style="color:#a855f7;margin:0 0 8px 0;font-size:28px;">Music Exclusive&#8482;</h1>
    <p style="color:#888;margin:0;font-size:14px;">Daily Company Report &mdash; ${escapeHtml(report.reportDate)} (Central Time)</p>
  </td></tr>

  <!-- Streaming Activity -->
  <tr><td style="padding-bottom:20px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#111;border:1px solid #333;border-radius:12px;">
      <tr><td style="padding:20px;">
        <h2 style="color:#a855f7;font-size:14px;text-transform:uppercase;letter-spacing:1px;margin:0 0 16px 0;">&#128202; Streaming Activity</h2>
        ${tableWrap(
          metricRow("Total Streams", fmtNum(report.streaming.totalStreams)) +
          metricRow("Credits Used", fmtNum(report.streaming.totalCreditsUsed)) +
          metricRow("Gross Revenue", fmtMoney(report.streaming.grossRevenue), true) +
          metricRow("Platform Revenue", fmtMoney(report.streaming.platformRevenue), true) +
          metricRow("Artist Earnings", fmtMoney(report.streaming.artistEarnings)) +
          metricRow("Pending Streams", fmtNum(report.streaming.pendingStreams)) +
          metricRow("Paid Streams", fmtNum(report.streaming.paidStreams))
        )}
      </td></tr>
    </table>
  </td></tr>

  <!-- Growth -->
  <tr><td style="padding-bottom:20px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#111;border:1px solid #333;border-radius:12px;">
      <tr><td style="padding:20px;">
        <h2 style="color:#a855f7;font-size:14px;text-transform:uppercase;letter-spacing:1px;margin:0 0 16px 0;">&#128200; Growth</h2>
        ${tableWrap(
          metricRow("New Vault Winners", fmtNum(report.growth.newVaultWinners)) +
          metricRow("New Artists", fmtNum(report.growth.newArtists)) +
          metricRow("New Tracks", fmtNum(report.growth.newTracks))
        )}
      </td></tr>
    </table>
  </td></tr>

  <!-- Top 5 Artists -->
  <tr><td style="padding-bottom:20px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#111;border:1px solid #333;border-radius:12px;">
      <tr><td style="padding:20px;">
        <h2 style="color:#a855f7;font-size:14px;text-transform:uppercase;letter-spacing:1px;margin:0 0 16px 0;">&#127908; Top 5 Artists</h2>
        ${topArtistsList}
      </td></tr>
    </table>
  </td></tr>

  <!-- Top 5 Tracks -->
  <tr><td style="padding-bottom:20px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#111;border:1px solid #333;border-radius:12px;">
      <tr><td style="padding:20px;">
        <h2 style="color:#a855f7;font-size:14px;text-transform:uppercase;letter-spacing:1px;margin:0 0 16px 0;">&#127925; Top 5 Tracks</h2>
        ${topTracksList}
      </td></tr>
    </table>
  </td></tr>

  <!-- Top 10 Fans -->
  <tr><td style="padding-bottom:20px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#111;border:1px solid #333;border-radius:12px;">
      <tr><td style="padding:20px;">
        <h2 style="color:#a855f7;font-size:14px;text-transform:uppercase;letter-spacing:1px;margin:0 0 16px 0;">&#128101; Top 10 Fans</h2>
        ${topFansList}
      </td></tr>
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="text-align:center;color:#666;font-size:12px;padding-top:10px;">
    <p>This report was automatically generated by Music Exclusive.</p>
    <p><a href="https://musicexclusive.co/admin/reports/daily?date=${report.reportDate}" style="color:#a855f7;">Open Dashboard</a></p>
  </td></tr>

</table>
</td></tr></table>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
    const reportDate = body.date || getYesterdayCT();
    const recipientEmail = "support@musicexclusive.co";
    const sendEmail = body.sendEmail !== false;

    logStep("Processing request", { reportDate, recipientEmail, sendEmail });

    // ── Idempotency check ────────────────────────────────────────────
    if (sendEmail) {
      const { data: existing } = await supabaseAdmin
        .from("report_email_logs")
        .select("id, status")
        .eq("report_date", reportDate)
        .eq("report_type", "daily")
        .in("status", ["sent", "pending"])
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
          from: "Music Exclusive <noreply@musicexclusive.co>",
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
