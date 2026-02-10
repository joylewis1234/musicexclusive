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

// Helper: resolve auth user_id from email (no listUsers)
async function resolveAuthUserId(email: string): Promise<string | null> {
  // Use vault_members first (may already have user_id from prior login)
  const { data: vm } = await supabaseAdmin
    .from("vault_members")
    .select("user_id")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  if (vm?.user_id) return vm.user_id;
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    // Try to extract caller's auth user_id from Authorization header
    let callerUserId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      try {
        const { data: userData } = await supabaseAdmin.auth.getUser(token);
        callerUserId = userData.user?.id || null;
      } catch (_) { /* not authenticated, that's ok */ }
    }

    const { sessionId } = await req.json();
    logStep("Request parsed", { sessionId, callerUserId });

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: "Session ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof sessionId === "string" && sessionId.includes("CHECKOUT_SESSION_ID")) {
      logStep("Invalid session id placeholder received", { sessionId });
      return new Response(
        JSON.stringify({
          error: "Invalid session id. Stripe did not return a real Checkout Session ID (cs_...). Please retry the purchase from inside the app.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    logStep("Session retrieved", { 
      status: session.status, 
      paymentStatus: session.payment_status,
      mode: session.mode,
      email: session.metadata?.email || session.customer_email
    });

    const isSubscription = session.mode === "subscription";
    const isPaid = session.payment_status === "paid";
    const isComplete = session.status === "complete";
    
    if (!isPaid && !(isSubscription && isComplete)) {
      logStep("Payment not completed", { paymentStatus: session.payment_status, status: session.status });
      return new Response(
        JSON.stringify({ error: "Payment not completed", status: session.payment_status }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const customerEmail = session.metadata?.email || session.customer_email;
    const credits = parseInt(session.metadata?.credits || "0", 10);

    if (!customerEmail || credits <= 0) {
      logStep("Missing email or credits", { customerEmail, credits });
      return new Response(
        JSON.stringify({ error: "Invalid session data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Idempotency check
    const { data: existingEvent } = await supabaseAdmin
      .from("stripe_events")
      .select("id")
      .eq("id", `checkout_${sessionId}`)
      .maybeSingle();

    if (existingEvent) {
      logStep("Session already processed, returning current credits", { sessionId });
      const { data: member } = await supabaseAdmin
        .from("vault_members")
        .select("credits")
        .eq("email", customerEmail)
        .maybeSingle();
      
      return new Response(
        JSON.stringify({ success: true, alreadyProcessed: true, credits: member?.credits || 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine user_id to write: prefer caller's auth uid, fallback to existing
    const userId = callerUserId || await resolveAuthUserId(customerEmail);

    // Update or create vault_members
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
      newCredits = (member.credits || 0) + credits;
      const updateData: Record<string, unknown> = { 
        credits: newCredits,
        vault_access_active: true,
      };
      if (userId) updateData.user_id = userId;
      
      if (isSubscription) {
        updateData.membership_type = "superfan";
        updateData.superfan_active = true;
        updateData.superfan_since = new Date().toISOString();
      }
      
      const { error: updateError } = await supabaseAdmin
        .from("vault_members")
        .update(updateData)
        .eq("email", customerEmail);

      if (updateError) {
        logStep("Error updating credits", { error: updateError.message });
        throw new Error(updateError.message);
      }
      logStep("Credits updated", { email: customerEmail, previousCredits: member.credits, newCredits, userId });
    } else {
      newCredits = credits;
      const insertData: Record<string, unknown> = {
        email: customerEmail,
        display_name: customerEmail.split("@")[0],
        credits: credits,
        vault_access_active: true,
      };
      if (userId) insertData.user_id = userId;
      
      if (isSubscription) {
        insertData.membership_type = "superfan";
        insertData.superfan_active = true;
        insertData.superfan_since = new Date().toISOString();
      }
      
      const { error: insertError } = await supabaseAdmin
        .from("vault_members")
        .insert(insertData);

      if (insertError) {
        logStep("Error creating member", { error: insertError.message });
        throw new Error(insertError.message);
      }
      logStep("New member created with credits", { email: customerEmail, credits, userId });
    }

    // Create ledger entry
    const usdAmount = credits * 0.20;
    const paymentIntentId = typeof session.payment_intent === 'string' 
      ? session.payment_intent 
      : session.payment_intent?.id;
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
    } else {
      logStep("Ledger entry created", { email: customerEmail, credits_delta: credits });
    }

    // Mark session as processed
    await supabaseAdmin
      .from("stripe_events")
      .insert({
        id: `checkout_${sessionId}`,
        event_type: "checkout.session.verified",
        payload: { sessionId, email: customerEmail, credits },
      });

    logStep("Session marked as processed", { sessionId });

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

    // Consume invite token if present
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
        }).catch(err => logStep("Invite consume fire-and-forget error", { error: String(err) }));
        logStep("Invite consumption triggered", { inviteToken: inviteToken.substring(0, 8) + "..." });
      } catch (err) {
        logStep("Error consuming invite", { error: String(err) });
      }
    }

    return new Response(
      JSON.stringify({ success: true, credits: newCredits, added: credits }),
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
