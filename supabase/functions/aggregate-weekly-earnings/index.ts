import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AGGREGATE-WEEKLY-EARNINGS] ${step}${detailsStr}`);
};

// Get the Monday 00:00 of the week containing the given date
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday
  d.setUTCDate(diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// Get the Sunday 23:59:59.999 of the week containing the given date
function getWeekEnd(weekStart: Date): Date {
  const d = new Date(weekStart);
  d.setUTCDate(d.getUTCDate() + 6);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    // Get the previous week's boundaries (last completed week)
    const now = new Date();
    const currentWeekStart = getWeekStart(now);
    
    // We aggregate the previous week (already completed)
    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setUTCDate(previousWeekStart.getUTCDate() - 7);
    const previousWeekEnd = getWeekEnd(previousWeekStart);

    logStep("Week boundaries calculated", {
      weekStart: previousWeekStart.toISOString(),
      weekEnd: previousWeekEnd.toISOString(),
    });

    // Aggregate streams from stream_ledger that haven't been batched yet
    const { data: unbatchedStreams, error: streamFetchError } = await supabaseAdmin
      .from("stream_ledger")
      .select("*")
      .is("payout_batch_id", null)
      .gte("created_at", previousWeekStart.toISOString())
      .lte("created_at", previousWeekEnd.toISOString());

    if (streamFetchError) {
      throw new Error(`Failed to fetch unbatched streams: ${streamFetchError.message}`);
    }

    logStep("Unbatched streams fetched", { count: unbatchedStreams?.length || 0 });

    if (!unbatchedStreams || unbatchedStreams.length === 0) {
      return new Response(
        JSON.stringify({ message: "No unbatched streams found for the previous week", batchesCreated: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group streams by artist
    const streamsByArtist: Record<string, { 
      artistId: string;
      entries: typeof unbatchedStreams;
      grossAmount: number;
      platformFee: number;
      artistNet: number;
    }> = {};

    for (const stream of unbatchedStreams) {
      const artistId = stream.artist_id;
      if (!artistId) {
        logStep("Skipping stream with no artist_id", { id: stream.id });
        continue;
      }

      if (!streamsByArtist[artistId]) {
        streamsByArtist[artistId] = {
          artistId,
          entries: [],
          grossAmount: 0,
          platformFee: 0,
          artistNet: 0,
        };
      }

      streamsByArtist[artistId].entries.push(stream);
      streamsByArtist[artistId].grossAmount += Number(stream.amount_total);
      streamsByArtist[artistId].platformFee += Number(stream.amount_platform);
      streamsByArtist[artistId].artistNet += Number(stream.amount_artist);
    }

    logStep("Streams grouped by artist", { artistCount: Object.keys(streamsByArtist).length });

    // Calculate batch totals
    let batchTotalGross = 0;
    let batchTotalPlatformFee = 0;
    let batchTotalArtistNet = 0;

    for (const data of Object.values(streamsByArtist)) {
      batchTotalGross += data.grossAmount;
      batchTotalPlatformFee += data.platformFee;
      batchTotalArtistNet += data.artistNet;
    }

    // Check if a batch already exists for this week
    const { data: existingBatch } = await supabaseAdmin
      .from("payout_batches")
      .select("id")
      .eq("week_start", previousWeekStart.toISOString())
      .is("artist_user_id", null) // New batch format without artist_user_id at batch level
      .maybeSingle();

    let batchId: string;
    
    if (existingBatch) {
      logStep("Batch already exists for week, updating", { batchId: existingBatch.id });
      batchId = existingBatch.id;
    } else {
      // For backward compatibility, we still create per-artist batches
      // Create batches per artist (existing pattern)
      const batchesCreated: string[] = [];
      const artistPayoutsCreated: string[] = [];

      for (const [artistId, data] of Object.entries(streamsByArtist)) {
        // Get artist user_id from artist_profiles
        const { data: artistProfile } = await supabaseAdmin
          .from("artist_profiles")
          .select("user_id")
          .eq("id", artistId)
          .maybeSingle();

        const artistUserId = artistProfile?.user_id || artistId;

        // Check if batch already exists for this artist/week
        const { data: existingArtistBatch } = await supabaseAdmin
          .from("payout_batches")
          .select("id")
          .eq("artist_user_id", artistUserId)
          .eq("week_start", previousWeekStart.toISOString())
          .maybeSingle();

        if (existingArtistBatch) {
          logStep("Batch already exists for artist/week", { artistId, batchId: existingArtistBatch.id });
          continue;
        }

        // Create the payout batch for this artist
        const { data: newBatch, error: batchError } = await supabaseAdmin
          .from("payout_batches")
          .insert({
            artist_user_id: artistUserId,
            week_start: previousWeekStart.toISOString(),
            week_end: previousWeekEnd.toISOString(),
            total_credits: data.entries.length,
            total_usd: data.artistNet,
            total_gross: data.grossAmount,
            total_platform_fee: data.platformFee,
            total_artist_net: data.artistNet,
            status: "pending",
          })
          .select("id")
          .single();

        if (batchError) {
          logStep("Failed to create batch", { artistId, error: batchError.message });
          continue;
        }

        logStep("Batch created", { batchId: newBatch.id, artistId, artistNet: data.artistNet });

        // Create artist_payout record
        const { data: newPayout, error: payoutError } = await supabaseAdmin
          .from("artist_payouts")
          .insert({
            payout_batch_id: newBatch.id,
            artist_id: artistId,
            gross_amount: data.grossAmount,
            platform_fee_amount: data.platformFee,
            artist_net_amount: data.artistNet,
            status: "pending",
          })
          .select("id")
          .single();

        if (payoutError) {
          logStep("Failed to create artist_payout", { batchId: newBatch.id, error: payoutError.message });
        } else {
          artistPayoutsCreated.push(newPayout.id);
        }

        // Update all stream_ledger entries with the batch ID
        const streamIds = data.entries.map(e => e.id);
        const { error: updateError } = await supabaseAdmin
          .from("stream_ledger")
          .update({ payout_batch_id: newBatch.id })
          .in("id", streamIds);

        if (updateError) {
          logStep("Failed to update stream entries", { batchId: newBatch.id, error: updateError.message });
        }

        batchesCreated.push(newBatch.id);
      }

      logStep("Aggregation complete", { batchesCreated: batchesCreated.length, artistPayoutsCreated: artistPayoutsCreated.length });

      return new Response(
        JSON.stringify({
          message: "Weekly earnings aggregation complete",
          weekStart: previousWeekStart.toISOString(),
          weekEnd: previousWeekEnd.toISOString(),
          batchesCreated: batchesCreated.length,
          artistPayoutsCreated: artistPayoutsCreated.length,
          batchIds: batchesCreated,
          totals: {
            gross: batchTotalGross,
            platformFee: batchTotalPlatformFee,
            artistNet: batchTotalArtistNet,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle case where batch already exists (shouldn't reach here with current logic)
    return new Response(
      JSON.stringify({
        message: "Batch already exists for this week",
        batchId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
