import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// ── Monitoring helper (fire-and-forget) ──
async function logMonitoringEvent(
  event: {
    function_name: string;
    event_type: string;
    status: number;
    latency_ms?: number;
    stage?: string;
    error_code?: string;
    error_message?: string;
    conflict?: boolean;
    retry_count?: number;
    contention_count?: number;
    ledger_written?: boolean;
    metadata?: Record<string, unknown>;
  }
) {
  try {
    await supabaseAdmin.from("monitoring_events").insert(event);
  } catch (_) { /* never block main flow */ }
}

const rollbackStripeEvent = async (eventId: string, reason: string) => {
  const { error } = await supabaseAdmin
    .from("stripe_events")
    .delete()
    .eq("id", eventId);
  if (error) {
    logStep("Failed to rollback stripe event", { eventId, reason, error: error.message });
  } else {
    logStep("Rolled back stripe event", { eventId, reason });
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!stripeKey) {
      logStep("STRIPE_SECRET_KEY not configured");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!webhookSecret) {
      logStep("STRIPE_WEBHOOK_SECRET not configured");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    // Verify webhook signature
    let event: Stripe.Event;

    if (!signature) {
      logStep("Missing stripe-signature header");
      logMonitoringEvent({
        function_name: "stripe-webhook",
        event_type: "signature_missing",
        status: 403,
        latency_ms: Date.now() - startTime,
      }).catch(() => {});
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      logStep("Webhook signature verified");
    } catch (err) {
      logStep("Invalid webhook signature", { error: String(err) });
      logMonitoringEvent({
        function_name: "stripe-webhook",
        event_type: "signature_invalid",
        status: 400,
        latency_ms: Date.now() - startTime,
        error_message: String(err),
      }).catch(() => {});
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Event parsed", { type: event.type, eventId: event.id });

    // Idempotency check: insert first to prevent race conditions
    const { error: insertEventError } = await supabaseAdmin
      .from("stripe_events")
      .insert({
        id: event.id,
        event_type: event.type,
        payload: event.data.object as unknown as Record<string, unknown>,
      });

    if (insertEventError) {
      if (insertEventError.code === "23505") {
        logStep("Event already processed, skipping", { eventId: event.id });
        return new Response(JSON.stringify({ received: true, duplicate: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      logStep("Error storing event ID", { error: insertEventError.message });
      return new Response(JSON.stringify({ error: "Idempotency insert failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout session completed", {
          sessionId: session.id,
          mode: session.mode,
          paymentIntent: session.payment_intent,
        });

        const customerEmail = session.customer_email || session.metadata?.email;
        const credits = parseInt(session.metadata?.credits || "0", 10);
        const transactionType = session.metadata?.type || "CREDITS_PURCHASE";
        const isSubscription = session.mode === "subscription";
        const paymentIntentId = typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id;

        if (customerEmail && credits > 0) {
          logStep("Processing credit purchase", {
            email: customerEmail,
            credits,
            type: transactionType,
            paymentIntentId,
          });

          const usdAmount = credits * 0.20;
          const ledgerType = isSubscription ? "SUBSCRIPTION_CREDITS" : transactionType;

          const { error: rpcError } = await supabaseAdmin.rpc("apply_credit_purchase", {
            p_email: customerEmail,
            p_credits: credits,
            p_ledger_type: ledgerType,
            p_reference: paymentIntentId || session.id,
            p_usd: usdAmount,
            p_set_superfan: isSubscription,
            p_set_superfan_since: isSubscription,
          });

          if (rpcError) {
            logStep("Error applying credits", { error: rpcError.message });
            await rollbackStripeEvent(event.id, "apply_credit_purchase failed");
            logMonitoringEvent({
              function_name: "stripe-webhook",
              event_type: "credit_apply_error",
              status: 500,
              latency_ms: Date.now() - startTime,
              ledger_written: false,
              error_message: rpcError.message,
              metadata: { stripe_event_type: "checkout.session.completed", email: customerEmail },
            }).catch(() => {});
            return new Response(JSON.stringify({ error: "Credit processing failed" }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          // Send Superfan welcome email + generate invite for subscription purchases (non-blocking)
          if (isSubscription) {
            try {
              const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
              const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

              fetch(`${supabaseUrl}/functions/v1/send-superfan-welcome-email`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${supabaseAnonKey}`,
                },
                body: JSON.stringify({ email: customerEmail }),
              }).catch(err => logStep("Superfan email fire-and-forget error", { error: String(err) }));

              logStep("Superfan welcome email + invite triggered", { email: customerEmail });
            } catch (emailErr) {
              logStep("Error triggering superfan email/invite", { error: String(emailErr) });
            }
          }

          // Consume invite token if present in metadata
          const inviteToken = session.metadata?.invite_token;
          if (inviteToken) {
            try {
              const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
              const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
              fetch(`${supabaseUrl}/functions/v1/validate-fan-invite`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${supabaseAnonKey}`,
                },
                body: JSON.stringify({ token: inviteToken, action: "consume" }),
              }).catch(err => logStep("Invite consume error", { error: String(err) }));
            } catch (err) {
              logStep("Error consuming invite", { error: String(err) });
            }
          }

          logMonitoringEvent({
            function_name: "stripe-webhook",
            event_type: "checkout.session.completed",
            status: 200,
            latency_ms: Date.now() - startTime,
            ledger_written: true,
            metadata: { credits, is_subscription: isSubscription },
          }).catch(() => {});
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice payment succeeded", { invoiceId: invoice.id });

        if (invoice.billing_reason === "subscription_cycle") {
          const customerEmail = invoice.customer_email;
          if (customerEmail) {
            const subscriptionCredits = 25;
            const usdAmount = 5.00;

            const { error: rpcError } = await supabaseAdmin.rpc("apply_credit_purchase", {
              p_email: customerEmail,
              p_credits: subscriptionCredits,
              p_ledger_type: "SUBSCRIPTION_CREDITS",
              p_reference: invoice.id,
              p_usd: usdAmount,
              p_set_superfan: true,
              p_set_superfan_since: false,
            });

            if (rpcError) {
              logStep("Error applying subscription credits", { error: rpcError.message });
              await rollbackStripeEvent(event.id, "subscription credits failed");
              logMonitoringEvent({
                function_name: "stripe-webhook",
                event_type: "credit_apply_error",
                status: 500,
                latency_ms: Date.now() - startTime,
                ledger_written: false,
                error_message: rpcError.message,
                metadata: { stripe_event_type: "invoice.payment_succeeded", email: customerEmail },
              }).catch(() => {});
              return new Response(JSON.stringify({ error: "Subscription credit processing failed" }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }

            logStep("Subscription credits granted", {
              email: customerEmail,
              credits: subscriptionCredits,
            });

            // Generate monthly superfan invite (non-blocking)
            try {
              const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
              const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
              fetch(`${supabaseUrl}/functions/v1/generate-superfan-invite`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${supabaseAnonKey}`,
                },
                body: JSON.stringify({ email: customerEmail, sendEmail: true, isRenewal: true }),
              }).catch(err => logStep("Monthly invite fire-and-forget error", { error: String(err) }));
              logStep("Monthly superfan invite triggered", { email: customerEmail });
            } catch (err) {
              logStep("Error triggering monthly invite", { error: String(err) });
            }

            logMonitoringEvent({
              function_name: "stripe-webhook",
              event_type: "invoice.payment_succeeded",
              status: 200,
              latency_ms: Date.now() - startTime,
              ledger_written: true,
              metadata: { credits: subscriptionCredits, billing_reason: "subscription_cycle" },
            }).catch(() => {});
          }
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription event", {
          type: event.type,
          subscriptionId: subscription.id,
          status: subscription.status,
        });
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        logStep("Payment intent succeeded", { paymentIntentId: paymentIntent.id });
        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        logStep("Connect account updated", {
          accountId: account.id,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
        });

        const { data: artistProfile, error: findError } = await supabaseAdmin
          .from("artist_profiles")
          .select("id, payout_status")
          .eq("stripe_account_id", account.id)
          .maybeSingle();

        if (findError) {
          logStep("Error finding artist profile", { error: findError.message });
          break;
        }

        if (artistProfile) {
          let newStatus = "pending";
          if (account.charges_enabled && account.payouts_enabled) {
            newStatus = "connected";
          } else if (!account.charges_enabled && !account.payouts_enabled) {
            newStatus = "not_connected";
          }

          if (newStatus !== artistProfile.payout_status) {
            const { error: updateError } = await supabaseAdmin
              .from("artist_profiles")
              .update({ payout_status: newStatus })
              .eq("id", artistProfile.id);

            if (updateError) {
              logStep("Error updating payout status", { error: updateError.message });
            } else {
              logStep("Payout status updated via webhook", {
                artistProfileId: artistProfile.id,
                newStatus,
              });
            }
          }
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logStep("ERROR", { message: errorMessage });
    logMonitoringEvent({
      function_name: "stripe-webhook",
      event_type: "error",
      status: 500,
      latency_ms: Date.now() - startTime,
      error_message: errorMessage,
    }).catch(() => {});
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
