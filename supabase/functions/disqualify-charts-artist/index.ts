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
    const { user: adminUser, error: authError } = await verifyAdmin(req.headers.get("Authorization"));
    if (authError || !adminUser) {
      return new Response(JSON.stringify({ error: authError ?? "Unauthorized" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { artist_id, genre, cycle_year, reason } = body ?? {};

    if (!artist_id || !genre || !cycle_year || !reason) {
      return new Response(
        JSON.stringify({ error: "artist_id, genre, cycle_year, and reason are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Fetch the target entry
    const { data: entry, error: fetchError } = await adminClient
      .from("charts_bonus_cycles")
      .select("id, status, prize_usd, rank")
      .eq("artist_id", artist_id)
      .eq("genre", genre)
      .eq("cycle_year", cycle_year)
      .maybeSingle();

    if (fetchError || !entry) {
      return new Response(JSON.stringify({ error: "Chart entry not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (entry.status === "disqualified") {
      return new Response(JSON.stringify({ error: "Already disqualified" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const wasPaid = entry.status === "paid";
    const previousRank = entry.rank;

    // Disqualify
    await adminClient
      .from("charts_bonus_cycles")
      .update({
        status: "disqualified",
        rank: null,
        disqualified_at: new Date().toISOString(),
        disqualified_reason: reason,
      })
      .eq("id", entry.id);

    // Recalculate ranks for remaining active/paid entries in this genre+year
    const { data: remaining, error: remainingError } = await adminClient
      .from("charts_bonus_cycles")
      .select("id, cumulative_streams")
      .eq("genre", genre)
      .eq("cycle_year", cycle_year)
      .neq("status", "disqualified")
      .gte("cumulative_streams", 10000)
      .order("cumulative_streams", { ascending: false });

    if (!remainingError && remaining) {
      // Clear all ranks first
      await adminClient
        .from("charts_bonus_cycles")
        .update({ rank: null })
        .eq("genre", genre)
        .eq("cycle_year", cycle_year)
        .neq("status", "disqualified");

      // Re-assign top 3
      let currentRank = 0;
      let lastStreams = -1;
      for (const r of remaining) {
        if (r.cumulative_streams !== lastStreams) {
          currentRank++;
          lastStreams = r.cumulative_streams;
        }
        if (currentRank > 3) break;

        await adminClient
          .from("charts_bonus_cycles")
          .update({ rank: currentRank })
          .eq("id", r.id);
      }
    }

    // Log admin action
    await adminClient.from("admin_action_logs").insert({
      action_type: "disqualify_charts_artist",
      target_type: "charts_bonus_cycle",
      target_id: entry.id,
      admin_email: adminUser.email,
      details: {
        artist_id,
        genre,
        cycle_year,
        reason,
        was_paid: wasPaid,
        previous_rank: previousRank,
        recoup_flagged: wasPaid,
        prize_to_recoup: wasPaid ? entry.prize_usd : 0,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        was_paid: wasPaid,
        recoup_flagged: wasPaid,
        recoup_amount: wasPaid ? entry.prize_usd : 0,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("disqualify-charts-artist error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
