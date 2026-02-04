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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();
    
    // Verify webhook signature if secret is configured
    let event: Stripe.Event;
    
    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        logStep("Webhook signature verified");
      } catch (err) {
        logStep("Invalid webhook signature", { error: String(err) });
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (webhookSecret && !signature) {
      // Secret is configured but no signature provided - reject
      logStep("Missing stripe-signature header");
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // No webhook secret configured - parse as JSON (legacy mode, log warning)
      logStep("WARNING: STRIPE_WEBHOOK_SECRET not configured - signature verification skipped");
      try {
        event = JSON.parse(body) as Stripe.Event;
      } catch (err) {
        logStep("Failed to parse webhook body", { error: String(err) });
        return new Response(JSON.stringify({ error: "Invalid payload" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    logStep("Event parsed", { type: event.type, eventId: event.id });

    // Idempotency check: verify event hasn't been processed already
    const { data: existingEvent } = await supabaseAdmin
      .from("stripe_events")
      .select("id")
      .eq("id", event.id)
      .maybeSingle();

    if (existingEvent) {
      logStep("Event already processed, skipping", { eventId: event.id });
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout session completed", { 
          sessionId: session.id, 
          mode: session.mode,
          paymentIntent: session.payment_intent 
        });
        
        // Get the customer email and credits from metadata
        const customerEmail = session.customer_email || session.metadata?.email;
        const credits = parseInt(session.metadata?.credits || "0", 10);
        const transactionType = session.metadata?.type || "CREDITS_PURCHASE";
        const paymentIntentId = typeof session.payment_intent === 'string' 
          ? session.payment_intent 
          : session.payment_intent?.id;
        
        if (customerEmail && credits > 0) {
          logStep("Processing credit purchase", { 
            email: customerEmail, 
            credits, 
            type: transactionType,
            paymentIntentId 
          });
          
          // Get current credits
          const { data: member, error: fetchError } = await supabaseAdmin
            .from("vault_members")
            .select("credits")
            .eq("email", customerEmail)
            .maybeSingle();
          
          if (fetchError) {
            logStep("Error fetching member", { error: fetchError.message });
          } else if (member) {
            // Update existing member
            const newCredits = (member.credits || 0) + credits;
            const { error: updateError } = await supabaseAdmin
              .from("vault_members")
              .update({ 
                credits: newCredits,
                vault_access_active: true,
              })
              .eq("email", customerEmail);
            
            if (updateError) {
              logStep("Error updating credits", { error: updateError.message });
            } else {
              logStep("Credits updated successfully", { 
                email: customerEmail, 
                previousCredits: member.credits,
                newCredits 
              });
            }
          } else {
            // Create new member
            const { error: insertError } = await supabaseAdmin
              .from("vault_members")
              .insert({
                email: customerEmail,
                display_name: customerEmail.split("@")[0],
                credits: credits,
                vault_access_active: true,
              });
            
            if (insertError) {
              logStep("Error creating member", { error: insertError.message });
            } else {
              logStep("New member created with credits", { 
                email: customerEmail, 
                credits 
              });
            }
          }

          // Create ledger entry
          const usdAmount = credits * 0.20;
          const { error: ledgerError } = await supabaseAdmin
            .from("credit_ledger")
            .insert({
              user_email: customerEmail,
              type: transactionType,
              credits_delta: credits,
              usd_delta: usdAmount,
              reference: paymentIntentId || session.id,
            });

          if (ledgerError) {
            logStep("Error creating ledger entry", { error: ledgerError.message });
          } else {
            logStep("Ledger entry created", { 
              email: customerEmail, 
              credits_delta: credits,
              usd_delta: usdAmount,
              reference: paymentIntentId || session.id
            });
          }
        }
        break;
      }
      
      case "invoice.payment_succeeded": {
        // Handle subscription renewals
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice payment succeeded", { invoiceId: invoice.id });
        
        // Check if this is a subscription invoice (not first payment)
        if (invoice.billing_reason === "subscription_cycle") {
          const customerEmail = invoice.customer_email;
          if (customerEmail) {
            // Grant monthly credits for Superfan subscription
            const subscriptionCredits = 25;
            
            const { data: member } = await supabaseAdmin
              .from("vault_members")
              .select("credits")
              .eq("email", customerEmail)
              .maybeSingle();
            
            if (member) {
              const newCredits = (member.credits || 0) + subscriptionCredits;
              await supabaseAdmin
                .from("vault_members")
                .update({ credits: newCredits })
                .eq("email", customerEmail);
              
              // Create ledger entry for subscription credits
              await supabaseAdmin
                .from("credit_ledger")
                .insert({
                  user_email: customerEmail,
                  type: "SUBSCRIPTION_CREDITS",
                  credits_delta: subscriptionCredits,
                  usd_delta: 5.00,
                  reference: invoice.id,
                });
              
              logStep("Subscription credits granted", { 
                email: customerEmail, 
                credits: subscriptionCredits 
              });
            }
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
          status: subscription.status 
        });
        // Handle subscription status changes if needed
        break;
      }
      
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        logStep("Payment intent succeeded", { paymentIntentId: paymentIntent.id });
        break;
      }

      // Stripe Connect events for artist payout accounts
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        logStep("Connect account updated", { 
          accountId: account.id, 
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled
        });

        // Find artist profile by stripe_account_id and update payout status
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
                newStatus 
              });
            }
          }
        }
        break;
      }
      
      default:
        logStep("Unhandled event type", { type: event.type });
    }

    // Store event ID to prevent duplicate processing
    const { error: insertEventError } = await supabaseAdmin
      .from("stripe_events")
      .insert({
        id: event.id,
        event_type: event.type,
        payload: event.data.object as unknown as Record<string, unknown>,
      });

    if (insertEventError) {
      logStep("Error storing event ID", { error: insertEventError.message });
    } else {
      logStep("Event stored for idempotency", { eventId: event.id });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
