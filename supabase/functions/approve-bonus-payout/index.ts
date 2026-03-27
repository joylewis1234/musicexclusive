import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { verifyAdmin } from "../_shared/verify-admin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Admin auth
    const { user: adminUser, error: authError } = await verifyAdmin(
      req.headers.get("Authorization")
    );
    if (authError || !adminUser) {
      return new Response(JSON.stringify({ error: authError ?? "Unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { milestone_id } = body ?? {};

    if (!milestone_id) {
      return new Response(JSON.stringify({ error: "milestone_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Fetch milestone
    const { data: milestone, error: fetchError } = await adminClient
      .from("bonus_milestones")
      .select("*, artist_profiles!inner(id, user_id, artist_name, stripe_account_id)")
      .eq("id", milestone_id)
      .maybeSingle();

    if (fetchError || !milestone) {
      return new Response(JSON.stringify({ error: "Milestone not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (milestone.status !== "pending") {
      return new Response(
        JSON.stringify({ error: `Milestone status is '${milestone.status}', expected 'pending'` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const artist = milestone.artist_profiles;
    if (!artist.stripe_account_id) {
      return new Response(
        JSON.stringify({ error: "Artist does not have a connected Stripe account" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Stripe transfer
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const amountCents = Math.round(Number(milestone.prize_usd) * 100);

    const transfer = await stripe.transfers.create({
      amount: amountCents,
      currency: "usd",
      destination: artist.stripe_account_id,
      description: `Cash Bonus: ${milestone.milestone} streams milestone`,
      metadata: {
        milestone_id: milestone.id,
        artist_id: artist.id,
        milestone: String(milestone.milestone),
      },
    });

    // Update milestone status
    await adminClient
      .from("bonus_milestones")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
      })
      .eq("id", milestone_id);

    // Log admin action
    await adminClient.from("admin_action_logs").insert({
      action_type: "approve_bonus_payout",
      target_type: "bonus_milestone",
      target_id: milestone_id,
      admin_email: adminUser.email,
      details: {
        milestone: milestone.milestone,
        prize_usd: milestone.prize_usd,
        stripe_transfer_id: transfer.id,
        artist_name: artist.artist_name,
      },
    });

    // Send notification email (best effort)
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      // Look up artist email from auth
      const { data: authUser } = await adminClient.auth.admin.getUserById(artist.user_id);
      const artistEmail = authUser?.user?.email;
      if (artistEmail) {
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: "Music Exclusive <support@musicexclusive.co>",
            reply_to: "support@musicexclusive.co",
            to: artistEmail,
            subject: `🎉 You earned a $${milestone.prize_usd} Cash Bonus!`,
            html: `<p>Congratulations ${artist.artist_name}!</p>
              <p>You've reached the <strong>${milestone.milestone.toLocaleString()} streams</strong> milestone and earned a <strong>$${milestone.prize_usd}</strong> bonus.</p>
              <p>The payment has been sent to your connected Stripe account.</p>`,
          }),
        }).catch((err) => console.warn("Bonus email failed:", err));
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        stripe_transfer_id: transfer.id,
        milestone: milestone.milestone,
        prize_usd: milestone.prize_usd,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("approve-bonus-payout error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
