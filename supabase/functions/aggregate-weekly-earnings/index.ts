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

    // Find all unbatched ARTIST_EARNING entries from the previous week
    const { data: unbatchedEarnings, error: fetchError } = await supabaseAdmin
      .from("credit_ledger")
      .select("*")
      .eq("type", "ARTIST_EARNING")
      .is("payout_batch_id", null)
      .gte("created_at", previousWeekStart.toISOString())
      .lte("created_at", previousWeekEnd.toISOString());

    if (fetchError) {
      throw new Error(`Failed to fetch unbatched earnings: ${fetchError.message}`);
    }

    logStep("Unbatched earnings fetched", { count: unbatchedEarnings?.length || 0 });

    if (!unbatchedEarnings || unbatchedEarnings.length === 0) {
      return new Response(
        JSON.stringify({ message: "No unbatched earnings found for the previous week", batchesCreated: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group earnings by artist (using reference field which contains artist email or ID)
    // The reference field format should be: "artist:{artist_user_id}:track:{track_id}"
    const earningsByArtist: Record<string, { 
      artistUserId: string;
      entries: typeof unbatchedEarnings;
      totalCredits: number;
      totalUsd: number;
    }> = {};

    for (const entry of unbatchedEarnings) {
      // Extract artist_user_id from reference - expected format: "artist:{user_id}:..."
      const refMatch = entry.reference?.match(/^artist:([^:]+)/);
      if (!refMatch) {
        logStep("Skipping entry with invalid reference", { id: entry.id, reference: entry.reference });
        continue;
      }

      const artistUserId = refMatch[1];

      if (!earningsByArtist[artistUserId]) {
        earningsByArtist[artistUserId] = {
          artistUserId,
          entries: [],
          totalCredits: 0,
          totalUsd: 0,
        };
      }

      earningsByArtist[artistUserId].entries.push(entry);
      earningsByArtist[artistUserId].totalCredits += Math.abs(entry.credits_delta);
      earningsByArtist[artistUserId].totalUsd += Math.abs(Number(entry.usd_delta));
    }

    logStep("Earnings grouped by artist", { artistCount: Object.keys(earningsByArtist).length });

    // Create payout batches for each artist
    const batchesCreated: string[] = [];

    for (const [artistUserId, data] of Object.entries(earningsByArtist)) {
      // Check if batch already exists for this artist/week
      const { data: existingBatch } = await supabaseAdmin
        .from("payout_batches")
        .select("id")
        .eq("artist_user_id", artistUserId)
        .eq("week_start", previousWeekStart.toISOString())
        .maybeSingle();

      if (existingBatch) {
        logStep("Batch already exists for artist/week", { artistUserId, batchId: existingBatch.id });
        continue;
      }

      // Create the payout batch
      const { data: newBatch, error: batchError } = await supabaseAdmin
        .from("payout_batches")
        .insert({
          artist_user_id: artistUserId,
          week_start: previousWeekStart.toISOString(),
          week_end: previousWeekEnd.toISOString(),
          total_credits: data.totalCredits,
          total_usd: data.totalUsd,
          status: "pending",
        })
        .select("id")
        .single();

      if (batchError) {
        logStep("Failed to create batch", { artistUserId, error: batchError.message });
        continue;
      }

      logStep("Batch created", { batchId: newBatch.id, artistUserId, totalUsd: data.totalUsd });

      // Update all ledger entries with the batch ID
      const entryIds = data.entries.map(e => e.id);
      const { error: updateError } = await supabaseAdmin
        .from("credit_ledger")
        .update({ payout_batch_id: newBatch.id })
        .in("id", entryIds);

      if (updateError) {
        logStep("Failed to update ledger entries", { batchId: newBatch.id, error: updateError.message });
      }

      batchesCreated.push(newBatch.id);
    }

    logStep("Aggregation complete", { batchesCreated: batchesCreated.length });

    return new Response(
      JSON.stringify({
        message: "Weekly earnings aggregation complete",
        weekStart: previousWeekStart.toISOString(),
        weekEnd: previousWeekEnd.toISOString(),
        batchesCreated: batchesCreated.length,
        batchIds: batchesCreated,
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
