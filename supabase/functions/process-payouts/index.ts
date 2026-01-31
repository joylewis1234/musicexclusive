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
      // No body or invalid JSON, process all pending
    }

    // Fetch pending payout batches
    let query = supabaseAdmin
      .from("payout_batches")
      .select("*")
      .in("status", ["pending", "failed"]);

    if (specificBatchId) {
      query = query.eq("id", specificBatchId);
    }

    const { data: pendingBatches, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch pending batches: ${fetchError.message}`);
    }

    logStep("Pending batches fetched", { count: pendingBatches?.length || 0 });

    if (!pendingBatches || pendingBatches.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pending batches to process", processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: {
      batchId: string;
      artistUserId: string;
      status: "paid" | "failed" | "skipped";
      error?: string;
      transferId?: string;
    }[] = [];

    for (const batch of pendingBatches) {
      logStep("Processing batch", { batchId: batch.id, artistUserId: batch.artist_user_id });

      // Mark as processing
      await supabaseAdmin
        .from("payout_batches")
        .update({ status: "processing" })
        .eq("id", batch.id);

      // Get artist profile with Stripe account
      const { data: artistProfile, error: profileError } = await supabaseAdmin
        .from("artist_profiles")
        .select("stripe_account_id, payout_status, artist_name")
        .eq("user_id", batch.artist_user_id)
        .maybeSingle();

      if (profileError || !artistProfile) {
        logStep("Artist profile not found", { artistUserId: batch.artist_user_id });
        await supabaseAdmin
          .from("payout_batches")
          .update({ status: "failed" })
          .eq("id", batch.id);
        results.push({
          batchId: batch.id,
          artistUserId: batch.artist_user_id,
          status: "failed",
          error: "Artist profile not found",
        });
        continue;
      }

      // Check if payout account is connected
      if (artistProfile.payout_status !== "connected" || !artistProfile.stripe_account_id) {
        logStep("Payout account not connected", { artistUserId: batch.artist_user_id });
        await supabaseAdmin
          .from("payout_batches")
          .update({ status: "pending" }) // Keep pending until artist connects
          .eq("id", batch.id);
        results.push({
          batchId: batch.id,
          artistUserId: batch.artist_user_id,
          status: "skipped",
          error: "Payout account not connected",
        });
        continue;
      }

      // Convert USD to cents for Stripe
      const amountCents = Math.round(batch.total_usd * 100);

      if (amountCents < 100) {
        // Stripe requires minimum $1 transfer
        logStep("Amount below minimum", { amountCents });
        await supabaseAdmin
          .from("payout_batches")
          .update({ status: "pending" }) // Keep pending until more earnings accumulate
          .eq("id", batch.id);
        results.push({
          batchId: batch.id,
          artistUserId: batch.artist_user_id,
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
            payout_batch_id: batch.id,
            artist_user_id: batch.artist_user_id,
            week_start: batch.week_start,
            week_end: batch.week_end,
          },
        });

        logStep("Transfer created", { transferId: transfer.id, amount: amountCents });

        // Update batch as paid
        await supabaseAdmin
          .from("payout_batches")
          .update({
            status: "paid",
            stripe_transfer_id: transfer.id,
            paid_at: new Date().toISOString(),
          })
          .eq("id", batch.id);

        // Also update artist_payouts if exists
        await supabaseAdmin
          .from("artist_payouts")
          .update({
            status: "paid",
            stripe_transfer_id: transfer.id,
          })
          .eq("payout_batch_id", batch.id);

        // Update stream_ledger entries to mark as paid
        await supabaseAdmin
          .from("stream_ledger")
          .update({ payout_status: "paid" })
          .eq("payout_batch_id", batch.id);

        results.push({
          batchId: batch.id,
          artistUserId: batch.artist_user_id,
          status: "paid",
          transferId: transfer.id,
        });

      } catch (stripeError: unknown) {
        const errorMessage = stripeError instanceof Error ? stripeError.message : "Unknown Stripe error";
        logStep("Stripe transfer failed", { batchId: batch.id, error: errorMessage });

        // Mark batch and artist_payout as failed
        await supabaseAdmin
          .from("payout_batches")
          .update({ status: "failed" })
          .eq("id", batch.id);

        await supabaseAdmin
          .from("artist_payouts")
          .update({ 
            status: "failed",
            failure_reason: errorMessage,
          })
          .eq("payout_batch_id", batch.id);

        results.push({
          batchId: batch.id,
          artistUserId: batch.artist_user_id,
          status: "failed",
          error: errorMessage,
        });
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
