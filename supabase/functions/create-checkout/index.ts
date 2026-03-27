import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

const CHECKOUT_SESSION_PLACEHOLDER = "{CHECKOUT_SESSION_ID}";
const APP_URL = "https://www.musicexclusive.co";

const ensureCheckoutSessionIdInSuccessUrl = (
  url: string,
  credits: number
): string => {
  // Make sure we always get the Checkout Session ID back after Stripe redirects,
  // even when the frontend provides a custom successUrl.
  const u = new URL(url);

  // Preserve any existing credits param if caller set it; otherwise set it.
  if (!u.searchParams.get("credits")) {
    u.searchParams.set("credits", String(credits));
  }

  // Stripe will replace this placeholder during redirect.
  // IMPORTANT: We must keep the placeholder *unencoded*.
  // Using URLSearchParams will encode `{` and `}` into `%7B` / `%7D`, and Stripe will NOT replace it.
  if (!u.searchParams.get("session_id")) {
    u.searchParams.set("session_id", CHECKOUT_SESSION_PLACEHOLDER);
  }

  const encodedPlaceholder = encodeURIComponent(CHECKOUT_SESSION_PLACEHOLDER);
  return u.toString().replace(encodedPlaceholder, CHECKOUT_SESSION_PLACEHOLDER);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const { credits, email, successUrl, cancelUrl } = await req.json();
    logStep("Request parsed", { credits, email });
    
    if (!credits || credits < 25) {
      return new Response(
        JSON.stringify({ error: "Minimum 25 credits required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate price: 1 credit = $0.20 = 20 cents
    const priceInCents = credits * 20;
    logStep("Price calculated", { credits, priceInCents });

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer already exists
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    }

    // Create Stripe checkout session
    const defaultSuccessUrl = `${APP_URL}/checkout/return?payment=success&credits=${credits}&return_to=%2Ffan%2Fpayment`;
    const defaultCancelUrl = `${APP_URL}/fan/payment?payment=cancelled`;

    const successUrlWithSession = ensureCheckoutSessionIdInSuccessUrl(
      successUrl || defaultSuccessUrl,
      credits
    );

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : email,
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${credits} Listening Credits`,
              description: `Add ${credits} credits to your wallet. 1 credit = 1 stream.`,
            },
            unit_amount: priceInCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        credits: credits.toString(),
        email: email,
        type: "CREDITS_PURCHASE",
      },
      success_url: successUrlWithSession,
      cancel_url: cancelUrl || defaultCancelUrl,
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
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
