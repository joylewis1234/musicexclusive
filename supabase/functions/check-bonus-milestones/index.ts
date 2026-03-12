import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MILESTONES = [
  { threshold: 1000, prize: 25 },
  { threshold: 2500, prize: 50 },
  { threshold: 5000, prize: 100 },
  { threshold: 10000, prize: 125 },
] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { artist_id } = body ?? {};

    if (!artist_id) {
      return new Response(JSON.stringify({ error: "artist_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get total verified stream count for this artist
    // artist_id in stream_ledger is text (artist_profiles.id::text)
    const { count: streamCount, error: countError } = await adminClient
      .from("stream_ledger")
      .select("*", { count: "exact", head: true })
      .eq("artist_id", artist_id);

    if (countError) {
      console.error("Error counting streams:", countError);
      return new Response(JSON.stringify({ error: "Failed to count streams" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const totalStreams = streamCount ?? 0;

    // Get existing milestones for this artist
    const { data: existingMilestones, error: milestonesError } = await adminClient
      .from("bonus_milestones")
      .select("milestone, status")
      .eq("artist_id", artist_id);

    if (milestonesError) {
      console.error("Error fetching milestones:", milestonesError);
      return new Response(JSON.stringify({ error: "Failed to fetch milestones" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const existingSet = new Set(
      (existingMilestones ?? []).map((m: { milestone: number }) => m.milestone)
    );

    const newMilestones: Array<{ milestone: number; prize: number }> = [];

    // Milestones must be reached sequentially
    for (const { threshold, prize } of MILESTONES) {
      if (totalStreams >= threshold && !existingSet.has(threshold)) {
        newMilestones.push({ milestone: threshold, prize });
      } else if (totalStreams < threshold) {
        // Sequential: stop at first unmet threshold
        break;
      }
    }

    if (newMilestones.length === 0) {
      return new Response(
        JSON.stringify({ success: true, new_milestones: 0, total_streams: totalStreams }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert new milestones (UNIQUE constraint prevents duplicates)
    const rows = newMilestones.map(({ milestone, prize }) => ({
      artist_id,
      milestone,
      prize_usd: prize,
      status: "pending",
      reached_at: new Date().toISOString(),
    }));

    const { error: insertError } = await adminClient
      .from("bonus_milestones")
      .upsert(rows, { onConflict: "artist_id,milestone", ignoreDuplicates: true });

    if (insertError) {
      console.error("Error inserting milestones:", insertError);
      return new Response(JSON.stringify({ error: "Failed to insert milestones" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(
      `[check-bonus-milestones] Artist ${artist_id}: ${newMilestones.length} new milestone(s) at ${totalStreams} streams`
    );

    return new Response(
      JSON.stringify({
        success: true,
        new_milestones: newMilestones.length,
        milestones_reached: newMilestones.map((m) => m.milestone),
        total_streams: totalStreams,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("check-bonus-milestones error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
