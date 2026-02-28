

## Redesign Daily Report Email -- Table-Based, Gmail-Mobile Safe

### What changes
Only `generateEmailHtml()` (lines 260-354) in `supabase/functions/send-daily-report/index.ts`. Nothing else in the file is touched.

### Exact diff

**Remove lines 260-354** (the entire `generateEmailHtml` function) and replace with the following:

```typescript
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
    <p><a href="https://themusicisexclusive.com/admin/reports/daily?date=${report.reportDate}" style="color:#a855f7;">Open Dashboard</a></p>
  </td></tr>

</table>
</td></tr></table>
</body>
</html>`;
}
```

### What this fixes and how

- **No more flex/grid** -- The entire email is now nested `<table role="presentation">` elements, which Gmail mobile renders reliably.
- **No-wrap on every value** -- Each value cell has `white-space:nowrap` plus an inner `<span style="white-space:nowrap;">` (Gmail sometimes strips td styles; the span is a safety net).
- **No-wrap on labels** -- `word-break:keep-all; overflow-wrap:normal` prevents "Reven ue" breaks.
- **Pending/Paid split** -- Two separate rows instead of the cramped "12 / 130" combo cell.
- **Green only on revenue** -- `color:#22c55e` applied only to Gross Revenue and Platform Revenue value cells.
- **Formatting helpers** -- `fmtNum` and `fmtMoney` are local to `generateEmailHtml()`. They add thousands separators and consistent `$X.XX` formatting. They touch zero calculations.
- **Top lists** -- Each `<li>` contains a 2-column table: name/email left (with `text-overflow:ellipsis` fallback), count right-aligned and nowrap.
- **All inline styles** -- The `<style>` block is removed entirely; every style is inline, which is the safest approach for Gmail.
- **Dark theme preserved** -- Same `#0a0a0a` body, `#111` cards, `#333` borders, `#a855f7` purple headings.

