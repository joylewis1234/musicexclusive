import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const currentYear = new Date().getUTCFullYear();

    // Get all stream_ledger entries for the current year, grouped by artist+genre
    // We need to join through tracks to get genre
    // stream_ledger.artist_id is text (artist_profiles.id::text)
    // stream_ledger.track_id is uuid referencing tracks.id

    // Step 1: Get all tracks with genre info
    const { data: tracks, error: tracksError } = await adminClient
      .from("tracks")
      .select("id, artist_id, genre")
      .eq("status", "ready");

    if (tracksError) {
      console.error("Error fetching tracks:", tracksError);
      return new Response(JSON.stringify({ error: "Failed to fetch tracks" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build track->genre and track->artist maps
    const trackGenreMap = new Map<string, string>();
    const trackArtistMap = new Map<string, string>();
    for (const t of tracks ?? []) {
      if (t.genre) {
        trackGenreMap.set(t.id, t.genre);
        trackArtistMap.set(t.id, t.artist_id);
      }
    }

    // Step 2: Get all stream_ledger entries for current year
    const yearStart = `${currentYear}-01-01T00:00:00Z`;
    const yearEnd = `${currentYear + 1}-01-01T00:00:00Z`;

    const { data: streams, error: streamsError } = await adminClient
      .from("stream_ledger")
      .select("artist_id, track_id")
      .gte("created_at", yearStart)
      .lt("created_at", yearEnd);

    if (streamsError) {
      console.error("Error fetching streams:", streamsError);
      return new Response(JSON.stringify({ error: "Failed to fetch streams" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 3: Aggregate by artist_id + genre
    // Key: `${artist_id}::${genre}`
    const aggregates = new Map<string, { artist_id: string; genre: string; count: number }>();

    for (const s of streams ?? []) {
      const genre = trackGenreMap.get(s.track_id);
      if (!genre) continue;

      const key = `${s.artist_id}::${genre}`;
      if (!aggregates.has(key)) {
        aggregates.set(key, { artist_id: s.artist_id, genre, count: 0 });
      }
      aggregates.get(key)!.count++;
    }

    // Step 4: Also get all-time cumulative counts per artist+genre for qualification check
    const { data: allTimeStreams, error: allTimeError } = await adminClient
      .from("stream_ledger")
      .select("artist_id, track_id");

    if (allTimeError) {
      console.error("Error fetching all-time streams:", allTimeError);
      return new Response(JSON.stringify({ error: "Failed to fetch all-time streams" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cumulativeMap = new Map<string, number>();
    for (const s of allTimeStreams ?? []) {
      const genre = trackGenreMap.get(s.track_id);
      if (!genre) continue;
      const key = `${s.artist_id}::${genre}`;
      cumulativeMap.set(key, (cumulativeMap.get(key) ?? 0) + 1);
    }

    // Step 5: Check which artists have completed the cash bonus (all 4 milestones)
    const { data: completedBonusArtists, error: bonusError } = await adminClient
      .from("bonus_milestones")
      .select("artist_id")
      .eq("milestone", 10000)
      .in("status", ["pending", "paid"]);

    if (bonusError) {
      console.error("Error fetching bonus milestones:", bonusError);
    }

    const cashBonusCompleteSet = new Set(
      (completedBonusArtists ?? []).map((r: { artist_id: string }) => r.artist_id)
    );

    // Step 6: Upsert charts_bonus_cycles rows
    let upsertCount = 0;
    const genreArtists = new Map<string, Array<{ artist_id: string; annual_streams: number }>>();

    for (const [, agg] of aggregates) {
      const cumulativeKey = `${agg.artist_id}::${agg.genre}`;
      const cumulative = cumulativeMap.get(cumulativeKey) ?? agg.count;

      const { error: upsertError } = await adminClient
        .from("charts_bonus_cycles")
        .upsert(
          {
            artist_id: agg.artist_id,
            genre: agg.genre,
            cycle_year: currentYear,
            cumulative_streams: cumulative,
            status: "active",
          },
          { onConflict: "artist_id,genre,cycle_year" }
        );

      if (upsertError) {
        console.warn(`Upsert failed for ${agg.artist_id}/${agg.genre}:`, upsertError);
        continue;
      }
      upsertCount++;

      // Collect for ranking (only qualified artists)
      const isQualified = cashBonusCompleteSet.has(agg.artist_id) && cumulative >= 10000;
      if (isQualified) {
        if (!genreArtists.has(agg.genre)) {
          genreArtists.set(agg.genre, []);
        }
        genreArtists.get(agg.genre)!.push({
          artist_id: agg.artist_id,
          annual_streams: agg.count,
        });
      }
    }

    // Step 7: Calculate ranks per genre (top 3 only)
    let rankUpdates = 0;
    for (const [genre, artists] of genreArtists) {
      // Sort descending by annual streams
      artists.sort((a, b) => b.annual_streams - a.annual_streams);

      // Clear existing ranks for this genre+year first
      await adminClient
        .from("charts_bonus_cycles")
        .update({ rank: null })
        .eq("genre", genre)
        .eq("cycle_year", currentYear)
        .neq("status", "disqualified");

      // Assign top 3 ranks (handle ties: same stream count = same rank)
      let currentRank = 0;
      let lastStreams = -1;
      for (const artist of artists) {
        if (artist.annual_streams !== lastStreams) {
          currentRank++;
          lastStreams = artist.annual_streams;
        }
        if (currentRank > 3) break;

        await adminClient
          .from("charts_bonus_cycles")
          .update({ rank: currentRank })
          .eq("artist_id", artist.artist_id)
          .eq("genre", genre)
          .eq("cycle_year", currentYear);

        rankUpdates++;
      }
    }

    console.log(
      `[update-charts-standings] Year ${currentYear}: ${upsertCount} genre entries upserted, ${rankUpdates} ranks assigned across ${genreArtists.size} genres`
    );

    return new Response(
      JSON.stringify({
        success: true,
        cycle_year: currentYear,
        entries_upserted: upsertCount,
        genres_ranked: genreArtists.size,
        ranks_assigned: rankUpdates,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("update-charts-standings error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
