import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { verifyAdmin } from "../_shared/verify-admin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AGGREGATE-WEEKLY-EARNINGS] ${step}${detailsStr}`);
};

// Send notification to company about batch creation
async function sendBatchCreatedNotification(
  supabaseUrl: string,
  anonKey: string,
  weekStart: string,
  weekEnd: string,
  artistCount: number,
  totalGross: number,
  totalArtistNet: number,
  applicationsApproved: number,
  applicationsDenied: number,
  invitationsGenerated: number,
  invitationsSent: number,
  invitationsApplied: number,
  invitedArtists: Array<{ artist_name: string; contact: string; platform: string; status: string }>
): Promise<void> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-payout-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        type: "batch_created",
        weekStart: weekStart.split("T")[0],
        weekEnd: weekEnd.split("T")[0],
        artistCount,
        totalGross: `$${totalGross.toFixed(2)}`,
        totalArtistNet: `$${totalArtistNet.toFixed(2)}`,
        applicationsApproved,
        applicationsDenied,
        invitationsGenerated,
        invitationsSent,
        invitationsApplied,
        invitedArtists,
      }),
    });
    const result = await response.json();
    logStep("Batch created notification sent", { 
      success: result.success, 
      applicationsApproved, 
      applicationsDenied,
      invitationsGenerated,
      invitationsSent,
      invitationsApplied
    });
  } catch (error) {
    logStep("Failed to send batch created notification", { error: String(error) });
  }
}

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

  // Verify admin authorization
  const authHeader = req.headers.get("Authorization");
  const { user, error: authError } = await verifyAdmin(authHeader);
  if (authError || !user) {
    logStep("Auth failed", { error: authError });
    return new Response(
      JSON.stringify({ error: authError || "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  
  logStep("Authorized admin", { userId: user.id, email: user.email });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const now = new Date();
    const currentWeekStart = getWeekStart(now);

    // Fetch ALL unbatched streams from completed weeks (before current week)
    const { data: allUnbatched, error: streamFetchError } = await supabaseAdmin
      .from("stream_ledger")
      .select("*")
      .is("payout_batch_id", null)
      .lt("created_at", currentWeekStart.toISOString())
      .order("created_at", { ascending: true });

    if (streamFetchError) {
      throw new Error(`Failed to fetch unbatched streams: ${streamFetchError.message}`);
    }

    logStep("Unbatched streams from completed weeks", { count: allUnbatched?.length || 0 });

    if (!allUnbatched || allUnbatched.length === 0) {
      return new Response(
        JSON.stringify({
          message: "No unbatched streams from completed weeks",
          batchesCreated: 0,
          artistPayoutsCreated: 0,
          totals: { gross: 0, platformFee: 0, artistNet: 0 },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group streams by week AND artist
    const weekArtistGroups: Record<string, Record<string, {
      artistId: string;
      entries: typeof allUnbatched;
      grossAmount: number;
      platformFee: number;
      artistNet: number;
    }>> = {};

    for (const stream of allUnbatched) {
      const artistId = stream.artist_id;
      if (!artistId) {
        logStep("Skipping stream with no artist_id", { id: stream.id });
        continue;
      }

      const streamWeekStart = getWeekStart(new Date(stream.created_at));
      const weekKey = streamWeekStart.toISOString();

      if (!weekArtistGroups[weekKey]) {
        weekArtistGroups[weekKey] = {};
      }

      if (!weekArtistGroups[weekKey][artistId]) {
        weekArtistGroups[weekKey][artistId] = {
          artistId,
          entries: [],
          grossAmount: 0,
          platformFee: 0,
          artistNet: 0,
        };
      }

      weekArtistGroups[weekKey][artistId].entries.push(stream);
      weekArtistGroups[weekKey][artistId].grossAmount += Number(stream.amount_total);
      weekArtistGroups[weekKey][artistId].platformFee += Number(stream.amount_platform);
      weekArtistGroups[weekKey][artistId].artistNet += Number(stream.amount_artist);
    }

    const weekCount = Object.keys(weekArtistGroups).length;
    logStep("Grouped by week/artist", { weeks: weekCount });

    let batchTotalGross = 0;
    let batchTotalPlatformFee = 0;
    let batchTotalArtistNet = 0;
    const batchesCreated: string[] = [];
    const artistPayoutsCreated: string[] = [];

    for (const [weekStartIso, artistGroups] of Object.entries(weekArtistGroups)) {
      const weekStart = new Date(weekStartIso);
      const weekEnd = getWeekEnd(weekStart);

      for (const [artistId, data] of Object.entries(artistGroups)) {
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
          .eq("week_start", weekStartIso)
          .maybeSingle();

        if (existingArtistBatch) {
          logStep("Batch already exists for artist/week", { artistId, week: weekStartIso.split("T")[0] });
          // Still link orphaned streams to existing batch
          const streamIds = data.entries.map(e => e.id);
          await supabaseAdmin
            .from("stream_ledger")
            .update({ payout_batch_id: existingArtistBatch.id })
            .in("id", streamIds);
          continue;
        }

        // Create the payout batch for this artist
        const { data: newBatch, error: batchError } = await supabaseAdmin
          .from("payout_batches")
          .insert({
            artist_user_id: artistUserId,
            week_start: weekStartIso,
            week_end: weekEnd.toISOString(),
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

        logStep("Batch created", { batchId: newBatch.id, artistId, week: weekStartIso.split("T")[0], artistNet: data.artistNet });

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

        batchTotalGross += data.grossAmount;
        batchTotalPlatformFee += data.platformFee;
        batchTotalArtistNet += data.artistNet;
        batchesCreated.push(newBatch.id);
      }
    }

    logStep("Aggregation complete", { batchesCreated: batchesCreated.length, artistPayoutsCreated: artistPayoutsCreated.length });

    return new Response(
      JSON.stringify({
        message: "Weekly earnings aggregation complete",
        weeksProcessed: weekCount,
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
