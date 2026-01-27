import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();
    
    // For now, we'll process without signature verification for testing
    // In production, you should verify the webhook signature
    let event: Stripe.Event;
    
    try {
      event = JSON.parse(body) as Stripe.Event;
    } catch (err) {
      console.error("Failed to parse webhook body:", err);
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Received Stripe event:", event.type);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("Checkout session completed:", session.id, "mode:", session.mode);
        
        // Get the customer email and credits from metadata
        const customerEmail = session.customer_email || session.metadata?.email;
        const credits = parseInt(session.metadata?.credits || "0", 10);
        const subscriptionType = session.metadata?.subscription_type;
        
        if (customerEmail && credits > 0) {
          console.log(`Adding ${credits} credits for ${customerEmail} (type: ${subscriptionType || "one-time"})`);
          
          // Get current credits
          const { data: member, error: fetchError } = await supabaseAdmin
            .from("vault_members")
            .select("credits")
            .eq("email", customerEmail)
            .maybeSingle();
          
          if (fetchError) {
            console.error("Error fetching member:", fetchError);
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
              console.error("Error updating credits:", updateError);
            } else {
              console.log(`Updated credits to ${newCredits} for ${customerEmail}`);
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
              console.error("Error creating member:", insertError);
            } else {
              console.log(`Created member with ${credits} credits for ${customerEmail}`);
            }
          }
        }
        break;
      }
      
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("Subscription event:", event.type, subscription.id, "status:", subscription.status);
        // Handle subscription status changes if needed
        break;
      }
      
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("Payment intent succeeded:", paymentIntent.id);
        break;
      }
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
