import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-CONNECT-STATUS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Get artist profile
    const { data: artistProfile, error: profileError } = await supabaseAdmin
      .from("artist_profiles")
      .select("id, stripe_account_id, payout_status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) throw new Error(`Profile error: ${profileError.message}`);
    if (!artistProfile) throw new Error("Artist profile not found");
    logStep("Artist profile found", { profileId: artistProfile.id, stripeAccountId: artistProfile.stripe_account_id });

    // If no Stripe account, return not connected
    if (!artistProfile.stripe_account_id) {
      return new Response(
        JSON.stringify({ status: "not_connected", chargesEnabled: false, payoutsEnabled: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Retrieve account from Stripe to check status
    const account = await stripe.accounts.retrieve(artistProfile.stripe_account_id);
    logStep("Stripe account retrieved", { 
      accountId: account.id, 
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled 
    });

    // Determine status based on Stripe account capabilities
    let newStatus = "pending";
    if (account.charges_enabled && account.payouts_enabled) {
      newStatus = "connected";
    }

    // Update profile if status changed
    if (newStatus !== artistProfile.payout_status) {
      const { error: updateError } = await supabaseAdmin
        .from("artist_profiles")
        .update({ payout_status: newStatus })
        .eq("id", artistProfile.id);

      if (updateError) {
        logStep("Error updating status", { error: updateError.message });
      } else {
        logStep("Status updated", { newStatus });
      }
    }

    return new Response(
      JSON.stringify({ 
        status: newStatus,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled
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
