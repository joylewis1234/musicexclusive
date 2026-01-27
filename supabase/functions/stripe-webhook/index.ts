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
    
    const body = await req.text();
    
    // Parse the event
    let event: Stripe.Event;
    try {
      event = JSON.parse(body) as Stripe.Event;
    } catch (err) {
      logStep("Failed to parse webhook body", { error: String(err) });
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Event parsed", { type: event.type });

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
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
