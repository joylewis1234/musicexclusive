import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CONNECT-ACCOUNT] ${step}${detailsStr}`);
};

const jsonResponse = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const DEFAULT_APP_URL = "https://musicexclusive.co";
const LOCAL_APP_ORIGINS = new Set([
  "http://localhost:8080",
  "http://127.0.0.1:8080",
]);

const resolveAllowedOrigin = (...candidates: Array<string | null | undefined>) => {
  for (const candidate of candidates) {
    if (!candidate) continue;

    try {
      const origin = new URL(candidate).origin;
      if (origin === DEFAULT_APP_URL || LOCAL_APP_ORIGINS.has(origin)) {
        return origin;
      }
    } catch {
      // Ignore invalid origins and fall back to the canonical app URL.
    }
  }

  return DEFAULT_APP_URL;
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
    if (!authHeader?.startsWith("Bearer ")) {
      logStep("Unauthorized - missing/invalid Authorization header");
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      logStep("Unauthorized - user verification failed", { message: userError?.message });
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const userId = user.id;
    const email = user.email;
    if (!email) {
      logStep("Unauthorized - missing email");
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    logStep("User authenticated", { userId, email });

    // Check if artist already has a Stripe account
    const { data: artistProfile, error: profileError } = await supabaseAdmin
      .from("artist_profiles")
      .select("id, stripe_account_id, payout_status, artist_name")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError) throw new Error(`Profile error: ${profileError.message}`);
    if (!artistProfile) throw new Error("Artist profile not found");
    logStep("Artist profile found", { profileId: artistProfile.id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    let requestBody: { returnOrigin?: string } | null = null;
    try {
      requestBody = await req.json();
    } catch {
      requestBody = null;
    }

    const origin = resolveAllowedOrigin(
      requestBody?.returnOrigin,
      req.headers.get("origin"),
      req.headers.get("referer"),
    );
    logStep("Using origin for return URLs", { origin });

    let accountId = artistProfile.stripe_account_id;

    // Create new Express account if one doesn't exist
    if (!accountId) {
      logStep("Creating new Stripe Connect Express account");
      const account = await stripe.accounts.create({
        type: "express",
        email,
        capabilities: {
          transfers: { requested: true },
        },
        business_profile: {
          name: artistProfile.artist_name,
        },
        metadata: {
          user_id: userId,
          artist_profile_id: artistProfile.id,
        },
      });
      accountId = account.id;
      logStep("Stripe account created", { accountId });

      // Update artist profile with Stripe account ID
      const { error: updateError } = await supabaseAdmin
        .from("artist_profiles")
        .update({ 
          stripe_account_id: accountId,
          payout_status: "pending"
        })
        .eq("id", artistProfile.id);

      if (updateError) {
        logStep("Error updating profile", { error: updateError.message });
      }
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/artist/dashboard?connect=refresh`,
      return_url: `${origin}/artist/dashboard?connect=success`,
      type: "account_onboarding",
    });
    logStep("Account link created", { url: accountLink.url });

    return jsonResponse({ url: accountLink.url, accountId }, 200);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logStep("ERROR", { message: errorMessage });
    // Normalize auth-related errors into 401s to avoid noisy 500s
    if (errorMessage.toLowerCase().includes("authentication") || errorMessage.toLowerCase().includes("unauthorized")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    return jsonResponse({ error: errorMessage }, 500);
  }
});
