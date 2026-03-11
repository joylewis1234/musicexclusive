import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
    const { artist_id, reason, recoup_paid } = body ?? {};

    if (!artist_id) {
      return new Response(JSON.stringify({ error: "artist_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!reason || typeof reason !== "string") {
      return new Response(JSON.stringify({ error: "reason is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Fetch all non-disqualified milestones for this artist
    const { data: milestones, error: fetchError } = await adminClient
      .from("bonus_milestones")
      .select("id, milestone, status, prize_usd")
      .eq("artist_id", artist_id)
      .neq("status", "disqualified");

    if (fetchError) {
      console.error("Error fetching milestones:", fetchError);
      return new Response(JSON.stringify({ error: "Failed to fetch milestones" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!milestones || milestones.length === 0) {
      return new Response(JSON.stringify({ error: "No active milestones found for this artist" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();
    const affectedIds = milestones.map((m: { id: string }) => m.id);
    const paidMilestones = milestones.filter((m: { status: string }) => m.status === "paid");

    // Disqualify all milestones
    const { error: updateError } = await adminClient
      .from("bonus_milestones")
      .update({
        status: "disqualified",
        disqualified_at: now,
        disqualified_reason: reason,
      })
      .in("id", affectedIds);

    if (updateError) {
      console.error("Error disqualifying milestones:", updateError);
      return new Response(JSON.stringify({ error: "Failed to disqualify milestones" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log admin action
    await adminClient.from("admin_action_logs").insert({
      action_type: "disqualify_bonus",
      target_type: "artist",
      target_id: artist_id,
      admin_email: adminUser.email,
      details: {
        reason,
        recoup_paid: !!recoup_paid,
        affected_milestones: milestones.map((m: { milestone: number; status: string; prize_usd: number }) => ({
          milestone: m.milestone,
          previous_status: m.status,
          prize_usd: m.prize_usd,
        })),
        paid_amount_to_recoup: recoup_paid
          ? paidMilestones.reduce((sum: number, m: { prize_usd: number }) => sum + Number(m.prize_usd), 0)
          : 0,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        disqualified_count: affectedIds.length,
        recoup_flagged: !!recoup_paid,
        recoup_amount: recoup_paid
          ? paidMilestones.reduce((sum: number, m: { prize_usd: number }) => sum + Number(m.prize_usd), 0)
          : 0,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("disqualify-bonus error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
