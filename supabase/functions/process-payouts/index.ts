import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { verifyAdmin } from "../_shared/verify-admin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-PAYOUTS] ${step}${detailsStr}`);
};

// Send payout notification
async function sendPayoutNotification(
  supabaseUrl: string,
  anonKey: string,
  type: 'artist_paid' | 'artist_failed' | 'payouts_completed' | 'payouts_failed',
  // deno-lint-ignore no-explicit-any
  data: Record<string, any>
): Promise<void> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-payout-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ type, ...data }),
    });
    const result = await response.json();
    logStep(`Notification sent: ${type}`, { success: result.success });
  } catch (error) {
    logStep(`Failed to send notification: ${type}`, { error: String(error) });
  }
}

// Get artist email from auth.users via service role
async function getArtistEmail(
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any,
  userId: string
): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error || !data?.user?.email) return null;
    return data.user.email;
  } catch {
    return null;
  }
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
      artistName?: string;
      artistEmail?: string;
      amount?: number;
      weekStart?: string;
      weekEnd?: string;
    }[] = [];

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    for (const payout of approvedPayouts) {
      const batch = payout.payout_batches;
      logStep("Processing payout", { payoutId: payout.id, artistId: payout.artist_id, batchId: batch.id });

      // IDEMPOTENCY CHECK: Skip if already has a stripe_transfer_id (already paid)
      if (payout.stripe_transfer_id) {
        logStep("Payout already processed (has transfer_id)", { payoutId: payout.id, transferId: payout.stripe_transfer_id });
        results.push({
          payoutId: payout.id,
          artistId: payout.artist_id,
          batchId: batch.id,
          status: "skipped",
          error: "Already has transfer ID - idempotency check",
          transferId: payout.stripe_transfer_id,
        });
        continue;
      }

      // Get artist profile with Stripe account
      const { data: artistProfile, error: profileError } = await supabaseAdmin
        .from("artist_profiles")
        .select("id, user_id, stripe_account_id, payout_status, artist_name")
        .eq("id", payout.artist_id)
        .maybeSingle();

      if (profileError || !artistProfile) {
        logStep("Artist profile not found", { artistId: payout.artist_id });
        const failureReason = "Artist profile not found";
        await supabaseAdmin
          .from("artist_payouts")
          .update({ status: "failed", failure_reason: failureReason })
          .eq("id", payout.id);
        results.push({
          payoutId: payout.id,
          artistId: payout.artist_id,
          batchId: batch.id,
          status: "failed",
          error: failureReason,
          artistName: "Unknown Artist",
        });
        continue;
      }

      // Get artist email for notifications
      const artistEmail = await getArtistEmail(supabaseAdmin, artistProfile.user_id);

      // Check if payout account is connected
      if (artistProfile.payout_status !== "connected" || !artistProfile.stripe_account_id) {
        logStep("Payout account not connected", { artistId: payout.artist_id });
        const failureReason = "Stripe onboarding incomplete - artist must complete Stripe Connect setup";
        await supabaseAdmin
          .from("artist_payouts")
          .update({ 
            status: "failed", 
            failure_reason: failureReason 
          })
          .eq("id", payout.id);
        results.push({
          payoutId: payout.id,
          artistId: payout.artist_id,
          batchId: batch.id,
          status: "failed",
          error: "Stripe onboarding incomplete",
          artistName: artistProfile.artist_name,
          artistEmail: artistEmail || undefined,
          weekStart: batch.week_start,
          weekEnd: batch.week_end,
        });
        continue;
      }

      // Convert USD to cents for Stripe
      const amountCents = Math.round(payout.artist_net_amount * 100);

      if (amountCents < 100) {
        // Stripe requires minimum $1 transfer
        logStep("Amount below minimum", { amountCents });
        const failureReason = "Amount below $1.00 minimum for Stripe transfers";
        await supabaseAdmin
          .from("artist_payouts")
          .update({ 
            status: "failed", 
            failure_reason: failureReason 
          })
          .eq("id", payout.id);
        results.push({
          payoutId: payout.id,
          artistId: payout.artist_id,
          batchId: batch.id,
          status: "failed",
          error: "Amount below $1 minimum",
          artistName: artistProfile.artist_name,
          artistEmail: artistEmail || undefined,
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
          artistName: artistProfile.artist_name,
          artistEmail: artistEmail || undefined,
          amount: payout.artist_net_amount,
          weekStart: batch.week_start,
          weekEnd: batch.week_end,
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
          artistName: artistProfile.artist_name,
          artistEmail: artistEmail || undefined,
          weekStart: batch.week_start,
          weekEnd: batch.week_end,
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

    // Send notifications for each result
    const paidResults = results.filter(r => r.status === "paid");
    const failedResults = results.filter(r => r.status === "failed");

    // Send individual artist notifications
    for (const result of paidResults) {
      if (result.artistEmail && result.artistName && result.amount !== undefined && result.weekStart && result.weekEnd) {
        await sendPayoutNotification(supabaseUrl, anonKey, 'artist_paid', {
          artistEmail: result.artistEmail,
          artistName: result.artistName,
          amount: `$${result.amount.toFixed(2)}`,
          weekStart: result.weekStart.split("T")[0],
          weekEnd: result.weekEnd.split("T")[0],
        });
      }
    }

    for (const result of failedResults) {
      if (result.artistEmail && result.artistName && result.error) {
        await sendPayoutNotification(supabaseUrl, anonKey, 'artist_failed', {
          artistEmail: result.artistEmail,
          artistName: result.artistName,
          failureReason: result.error,
        });
      }
    }

    // Calculate total paid amount
    const totalPaidAmount = paidResults.reduce((sum, r) => sum + (r.amount || 0), 0);
    const affectedBatchIds = [...new Set(results.map(r => r.batchId))];

    // Send company summary notification
    await sendPayoutNotification(supabaseUrl, anonKey, 'payouts_completed', {
      batchCount: affectedBatchIds.length,
      paidCount: paid,
      totalPaid: `$${totalPaidAmount.toFixed(2)}`,
      failedCount: failed,
    });

    // If there were failures, also send a detailed failures report
    if (failedResults.length > 0) {
      const failures = failedResults.map(r => ({
        artistName: r.artistName || "Unknown Artist",
        reason: r.error || "Unknown error",
      }));
      await sendPayoutNotification(supabaseUrl, anonKey, 'payouts_failed', { failures });
    }

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
// Logic: all paid/held -> paid, any failed -> failed, otherwise stays approved/processing
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
  
  // Check if any failed
  const hasFailed = statuses.some((s: string) => s === "failed");
  // Check if all are either paid or held (terminal successful states)
  const allPaidOrHeld = statuses.every((s: string) => s === "paid" || s === "held");
  // Check if some are paid but not all complete
  const hasPaid = statuses.some((s: string) => s === "paid");
  const hasPending = statuses.some((s: string) => s === "pending" || s === "approved");
  
  if (allPaidOrHeld) {
    newBatchStatus = "paid";
  } else if (hasFailed && !hasPending) {
    // All processed but some failed
    newBatchStatus = "failed";
  } else if (hasPaid && hasPending) {
    // Partial completion, still processing
    newBatchStatus = "processing";
  } else if (hasPaid && hasFailed) {
    // Mixed results, some paid some failed
    newBatchStatus = "partial";
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
