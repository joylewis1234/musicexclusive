

# Fix Artist Earnings Dashboard — Two Changes

## Change 1: Fix Track Earnings in `ArtistEarnings.tsx` (lines 123-160)

**What:** Replace the broken `credit_ledger` query with `stream_ledger` aggregation.

**Why:** The current code queries `credit_ledger` filtered by `user.email`, but ARTIST_EARNING rows store a UUID (not the artist's email) in `user_email`. Additionally, RLS blocks access since the JWT email won't match a UUID. The reference parsing also expects `track:TRACKID` but actual format is `stream_TRACKID_KEY`.

**Fix:** Query `stream_ledger` (which already works for the summary cards above) and aggregate by `track_id`:

```typescript
// Lines 123-160 → replace with:
const { data: streamsByTrack } = await supabase
  .from("stream_ledger")
  .select("track_id, amount_artist")
  .eq("artist_id", profile.id);

const trackMap = new Map<string, { streams: number; earned: number }>();
(streamsByTrack || []).forEach((entry) => {
  const existing = trackMap.get(entry.track_id) || { streams: 0, earned: 0 };
  trackMap.set(entry.track_id, {
    streams: existing.streams + 1,
    earned: existing.earned + Number(entry.amount_artist),
  });
});

const trackIds = Array.from(trackMap.keys());
if (trackIds.length > 0) {
  const { data: tracks } = await supabase
    .from("tracks")
    .select("id, title, artwork_url")
    .in("id", trackIds);

  const earnings: TrackEarning[] = (tracks || []).map((track) => {
    const stats = trackMap.get(track.id) || { streams: 0, earned: 0 };
    return {
      track_id: track.id,
      title: track.title,
      artwork_url: track.artwork_url,
      total_streams: stats.streams,
      total_earned: stats.earned,
    };
  }).sort((a, b) => b.total_earned - a.total_earned);

  setTrackEarnings(earnings);
}
```

**Impact:** Only affects the track-level breakdown on `/artist/earnings`. Summary cards, payout history, and weekly transparency report are unaffected (they already use `stream_ledger`).

---

## Change 2: Fix `EarningsDashboard.tsx` — Show ALL pending, not just "This Week"

**What:** Change the "Pending" summary card from "Pending This Week" to "All Pending" (all-time pending earnings). Add a "Streams (All Time)" counter alongside the existing metrics.

**Why:** The current code filters pending earnings to only the current Monday-Sunday window. Test data from prior weeks shows $0.00 because those streams are outside the current week range.

**Fix in `EarningsDashboard.tsx`:**
- Rename `pendingThisWeek` to `pendingAll` in the summary state
- Remove the `isThisWeek` filter for pending calculation (line 73) — count ALL pending streams
- Keep `streamsThisWeek` but also add `streamsAll` for total lifetime stream count
- Update the UI labels: "Pending" card shows all pending, "Streams" card shows lifetime total with "This week: X" as subtitle

**Impact:** Only affects the `EarningsDashboard` component (used on the artist dashboard). No backend changes. No effect on other pages.

---

## Files Modified
1. `src/pages/artist/ArtistEarnings.tsx` — lines 123-160 replaced
2. `src/components/artist/EarningsDashboard.tsx` — summary calculation and labels updated

No backend, edge function, or database changes needed.

