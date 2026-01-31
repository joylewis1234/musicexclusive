import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-PAYOUTS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    return new Response(
      JSON.stringify({ error: "STRIPE_SECRET_KEY is not set" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  try {
    logStep("Function started");

    // Optional: process a specific batch ID from request body
    let specificBatchId: string | null = null;
    try {
      const body = await req.json();
      specificBatchId = body?.batchId || null;
    } catch {
      // No body or invalid JSON, process all approved
    }

    // Fetch approved artist_payouts (not the batch - we process at payout level)
    let query = supabaseAdmin
      .from("artist_payouts")
      .select(`
        *,
        payout_batches!inner (
          id,
          artist_user_id,
          week_start,
          week_end,
          total_usd,
          status
        )
      `)
      .eq("status", "approved");

    if (specificBatchId) {
      query = query.eq("payout_batch_id", specificBatchId);
    }

    const { data: approvedPayouts, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch approved payouts: ${fetchError.message}`);
    }

    logStep("Approved payouts fetched", { count: approvedPayouts?.length || 0 });

    if (!approvedPayouts || approvedPayouts.length === 0) {
      return new Response(
        JSON.stringify({ message: "No approved payouts to process", processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: {
      payoutId: string;
      artistId: string;
      batchId: string;
      status: "paid" | "failed" | "skipped";
      error?: string;
      transferId?: string;
    }[] = [];

    for (const payout of approvedPayouts) {
      const batch = payout.payout_batches;
      logStep("Processing payout", { payoutId: payout.id, artistId: payout.artist_id, batchId: batch.id });

      // Get artist profile with Stripe account
      const { data: artistProfile, error: profileError } = await supabaseAdmin
        .from("artist_profiles")
        .select("id, user_id, stripe_account_id, payout_status, artist_name")
        .eq("id", payout.artist_id)
        .maybeSingle();

      if (profileError || !artistProfile) {
        logStep("Artist profile not found", { artistId: payout.artist_id });
        await supabaseAdmin
          .from("artist_payouts")
          .update({ status: "failed", failure_reason: "Artist profile not found" })
          .eq("id", payout.id);
        results.push({
          payoutId: payout.id,
          artistId: payout.artist_id,
          batchId: batch.id,
          status: "failed",
          error: "Artist profile not found",
        });
        continue;
      }

      // Check if payout account is connected
      if (artistProfile.payout_status !== "connected" || !artistProfile.stripe_account_id) {
        logStep("Payout account not connected", { artistId: payout.artist_id });
        await supabaseAdmin
          .from("artist_payouts")
          .update({ status: "approved", failure_reason: "Payout account not connected - will retry when connected" })
          .eq("id", payout.id);
        results.push({
          payoutId: payout.id,
          artistId: payout.artist_id,
          batchId: batch.id,
          status: "skipped",
          error: "Payout account not connected",
        });
        continue;
      }

      // Convert USD to cents for Stripe
      const amountCents = Math.round(payout.artist_net_amount * 100);

      if (amountCents < 100) {
        // Stripe requires minimum $1 transfer
        logStep("Amount below minimum", { amountCents });
        results.push({
          payoutId: payout.id,
          artistId: payout.artist_id,
          batchId: batch.id,
          status: "skipped",
          error: "Amount below $1 minimum",
        });
        continue;
      }

      try {
        // Create Stripe Transfer to connected account
        const transfer = await stripe.transfers.create({
          amount: amountCents,
          currency: "usd",
          destination: artistProfile.stripe_account_id,
          description: `Weekly payout for ${artistProfile.artist_name} (${batch.week_start.split("T")[0]} - ${batch.week_end.split("T")[0]})`,
          metadata: {
            artist_payout_id: payout.id,
            payout_batch_id: batch.id,
            artist_id: payout.artist_id,
            week_start: batch.week_start,
            week_end: batch.week_end,
          },
        });

        logStep("Transfer created", { transferId: transfer.id, amount: amountCents });

        // Update artist_payout as paid
        await supabaseAdmin
          .from("artist_payouts")
          .update({
            status: "paid",
            stripe_transfer_id: transfer.id,
          })
          .eq("id", payout.id);

        // Update stream_ledger entries for this artist in this batch
        await supabaseAdmin
          .from("stream_ledger")
          .update({ payout_status: "paid" })
          .eq("payout_batch_id", batch.id)
          .eq("artist_id", payout.artist_id);

        results.push({
          payoutId: payout.id,
          artistId: payout.artist_id,
          batchId: batch.id,
          status: "paid",
          transferId: transfer.id,
        });

      } catch (stripeError: unknown) {
        const errorMessage = stripeError instanceof Error ? stripeError.message : "Unknown Stripe error";
        logStep("Stripe transfer failed", { payoutId: payout.id, error: errorMessage });

        await supabaseAdmin
          .from("artist_payouts")
          .update({ 
            status: "failed",
            failure_reason: errorMessage,
          })
          .eq("id", payout.id);

        results.push({
          payoutId: payout.id,
          artistId: payout.artist_id,
          batchId: batch.id,
          status: "failed",
          error: errorMessage,
        });
      }
    }

    // Update batch statuses based on their payouts
    if (specificBatchId) {
      await updateBatchStatus(supabaseAdmin, specificBatchId);
    } else {
      // Update all affected batches
      const affectedBatchIds = [...new Set(results.map(r => r.batchId))];
      for (const batchId of affectedBatchIds) {
        await updateBatchStatus(supabaseAdmin, batchId);
      }
    }

    const paid = results.filter(r => r.status === "paid").length;
    const failed = results.filter(r => r.status === "failed").length;
    const skipped = results.filter(r => r.status === "skipped").length;

    logStep("Processing complete", { paid, failed, skipped });

    return new Response(
      JSON.stringify({
        message: "Payout processing complete",
        summary: { paid, failed, skipped, total: results.length },
        results,
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

// Helper to update batch status based on its payouts
// deno-lint-ignore no-explicit-any
async function updateBatchStatus(supabaseAdmin: any, batchId: string) {
  const { data: payouts } = await supabaseAdmin
    .from("artist_payouts")
    .select("status")
    .eq("payout_batch_id", batchId);

  if (!payouts || payouts.length === 0) return;

  // deno-lint-ignore no-explicit-any
  const statuses = payouts.map((p: any) => p.status);
  
  let newBatchStatus = "approved";
  
  if (statuses.every((s: string) => s === "paid")) {
    newBatchStatus = "paid";
  } else if (statuses.some((s: string) => s === "failed") && !statuses.some((s: string) => s === "approved" || s === "pending")) {
    newBatchStatus = "failed";
  } else if (statuses.some((s: string) => s === "paid")) {
    newBatchStatus = "processing"; // Partial completion
  }

  const updateData: Record<string, unknown> = { status: newBatchStatus };
  if (newBatchStatus === "paid") {
    updateData.paid_at = new Date().toISOString();
  }

  await supabaseAdmin
    .from("payout_batches")
    .update(updateData)
    .eq("id", batchId);
}
