import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-CHECKOUT] ${step}${detailsStr}`);
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
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const { sessionId } = await req.json();
    logStep("Request parsed", { sessionId });

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: "Session ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If Stripe didn't replace the placeholder (or it got URL-decoded), we'll receive "{CHECKOUT_SESSION_ID}".
    // Fail fast with a clear message.
    if (typeof sessionId === "string" && sessionId.includes("CHECKOUT_SESSION_ID")) {
      logStep("Invalid session id placeholder received", { sessionId });
      return new Response(
        JSON.stringify({
          error:
            "Invalid session id. Stripe did not return a real Checkout Session ID (cs_...). Please retry the purchase from inside the app.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    logStep("Session retrieved", { 
      status: session.status, 
      paymentStatus: session.payment_status,
      mode: session.mode,
      email: session.metadata?.email || session.customer_email
    });

    // For subscriptions, check status "complete" or payment_status "paid"
    const isSubscription = session.mode === "subscription";
    const isPaid = session.payment_status === "paid";
    const isComplete = session.status === "complete";
    
    // Verify payment was successful
    if (!isPaid && !(isSubscription && isComplete)) {
      logStep("Payment not completed", { paymentStatus: session.payment_status, status: session.status });
      return new Response(
        JSON.stringify({ error: "Payment not completed", status: session.payment_status }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get customer email and credits from session
    // Prefer metadata.email (set by our app) so credits always go to the intended account
    // even if the user edits the email field inside Stripe Checkout.
    const customerEmail = session.metadata?.email || session.customer_email;
    const credits = parseInt(session.metadata?.credits || "0", 10);

    if (!customerEmail || credits <= 0) {
      logStep("Missing email or credits", { customerEmail, credits });
      return new Response(
        JSON.stringify({ error: "Invalid session data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // Check if this session was already processed (idempotency)
    const { data: existingEvent } = await supabaseAdmin
      .from("stripe_events")
      .select("id")
      .eq("id", `checkout_${sessionId}`)
      .maybeSingle();

    if (existingEvent) {
      logStep("Session already processed, returning current credits", { sessionId });
      
      // Get current credits to return
      const { data: member } = await supabaseAdmin
        .from("vault_members")
        .select("credits")
        .eq("email", customerEmail)
        .maybeSingle();
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          alreadyProcessed: true, 
          credits: member?.credits || 0 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update credits in vault_members
    const { data: member, error: fetchError } = await supabaseAdmin
      .from("vault_members")
      .select("credits")
      .eq("email", customerEmail)
      .maybeSingle();

    if (fetchError) {
      logStep("Error fetching member", { error: fetchError.message });
      throw new Error(fetchError.message);
    }

    let newCredits: number;

    if (member) {
      // Update existing member
      newCredits = (member.credits || 0) + credits;
      const { error: updateError } = await supabaseAdmin
        .from("vault_members")
        .update({ 
          credits: newCredits,
          vault_access_active: true,
        })
        .eq("email", customerEmail);

      if (updateError) {
        logStep("Error updating credits", { error: updateError.message });
        throw new Error(updateError.message);
      }
      
      logStep("Credits updated", { email: customerEmail, previousCredits: member.credits, newCredits });
    } else {
      // Create new member
      newCredits = credits;
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
        throw new Error(insertError.message);
      }
      
      logStep("New member created with credits", { email: customerEmail, credits });
    }

    // Create ledger entry - use appropriate type based on session mode
    const usdAmount = credits * 0.20;
    const paymentIntentId = typeof session.payment_intent === 'string' 
      ? session.payment_intent 
      : session.payment_intent?.id;
    
    // For subscriptions, use the subscription ID as reference
    const subscriptionId = typeof session.subscription === 'string' 
      ? session.subscription 
      : session.subscription?.id;
    
    const ledgerType = isSubscription ? "SUBSCRIPTION_CREDITS" : "CREDITS_PURCHASE";
    const ledgerReference = paymentIntentId || subscriptionId || sessionId;

    const { error: ledgerError } = await supabaseAdmin
      .from("credit_ledger")
      .insert({
        user_email: customerEmail,
        type: ledgerType,
        credits_delta: credits,
        usd_delta: usdAmount,
        reference: ledgerReference,
      });

    if (ledgerError) {
      logStep("Error creating ledger entry", { error: ledgerError.message });
      // Don't throw - credits were already added
    } else {
      logStep("Ledger entry created", { email: customerEmail, credits_delta: credits });
    }

    // Mark session as processed (idempotency)
    await supabaseAdmin
      .from("stripe_events")
      .insert({
        id: `checkout_${sessionId}`,
        event_type: "checkout.session.verified",
        payload: { sessionId, email: customerEmail, credits },
      });

    logStep("Session marked as processed", { sessionId });

    return new Response(
      JSON.stringify({ 
        success: true, 
        credits: newCredits,
        added: credits
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
