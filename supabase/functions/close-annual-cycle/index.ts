import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { verifyAdmin } from "../_shared/verify-admin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRIZE_MAP: Record<number, number> = { 1: 500, 2: 250, 3: 100 };

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
    const { genre, cycle_year } = body ?? {};

    if (!genre || !cycle_year) {
      return new Response(JSON.stringify({ error: "genre and cycle_year are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Fetch all active qualified entries for this genre+year (cumulative_streams >= 10000)
    const { data: entries, error: fetchError } = await adminClient
      .from("charts_bonus_cycles")
      .select("*, artist_profiles!inner(id, user_id, artist_name, stripe_account_id)")
      .eq("genre", genre)
      .eq("cycle_year", cycle_year)
      .eq("status", "active")
      .gte("cumulative_streams", 10000)
      .order("cumulative_streams", { ascending: false });

    if (fetchError) {
      console.error("Error fetching entries:", fetchError);
      return new Response(JSON.stringify({ error: "Failed to fetch chart entries" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!entries || entries.length === 0) {
      return new Response(JSON.stringify({ error: "No qualified entries for this genre/year" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Assign ranks with tie handling
    const ranked: Array<{ entry: typeof entries[0]; rank: number; prize: number }> = [];
    let currentRank = 0;
    let lastStreams = -1;

    for (const entry of entries) {
      if (entry.cumulative_streams !== lastStreams) {
        currentRank++;
        lastStreams = entry.cumulative_streams;
      }
      if (currentRank > 3) break;

      const prize = PRIZE_MAP[currentRank] ?? 100; // ties at rank 3 get $100
      ranked.push({ entry, rank: currentRank, prize });
    }

    // Process Stripe transfers
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const results: Array<{ artist_name: string; rank: number; prize: number; status: string; error?: string }> = [];
    const resendKey = Deno.env.get("RESEND_API_KEY");

    for (const { entry, rank, prize } of ranked) {
      const artist = entry.artist_profiles;

      if (!artist.stripe_account_id) {
        // Update rank/prize but can't pay
        await adminClient
          .from("charts_bonus_cycles")
          .update({ rank, prize_usd: prize, status: "pending_payout" })
          .eq("id", entry.id);

        results.push({ artist_name: artist.artist_name, rank, prize, status: "pending_payout", error: "No Stripe account" });
        continue;
      }

      try {
        const transfer = await stripe.transfers.create({
          amount: Math.round(prize * 100),
          currency: "usd",
          destination: artist.stripe_account_id,
          description: `Exclusive Charts: Rank #${rank} in ${genre} (${cycle_year})`,
          metadata: { chart_cycle_id: entry.id, genre, cycle_year: String(cycle_year), rank: String(rank) },
        });

        await adminClient
          .from("charts_bonus_cycles")
          .update({ rank, prize_usd: prize, status: "paid", paid_at: new Date().toISOString() })
          .eq("id", entry.id);

        results.push({ artist_name: artist.artist_name, rank, prize, status: "paid" });

        // Send email (best effort)
        if (resendKey) {
          const { data: authUser } = await adminClient.auth.admin.getUserById(artist.user_id);
          const artistEmail = authUser?.user?.email;
          if (artistEmail) {
            fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
              body: JSON.stringify({
                from: "Music Exclusive <noreply@musicexclusive.co>",
                to: artistEmail,
                subject: `🏆 You placed #${rank} in ${genre} Exclusive Charts!`,
                html: `<p>Congratulations ${artist.artist_name}!</p>
                  <p>You finished <strong>#${rank}</strong> in the <strong>${genre}</strong> Exclusive Charts for ${cycle_year} and earned a <strong>$${prize}</strong> prize!</p>
                  <p>The payment has been sent to your connected Stripe account.</p>`,
              }),
            }).catch((err) => console.warn("Charts email failed:", err));
          }
        }
      } catch (stripeErr: any) {
        await adminClient
          .from("charts_bonus_cycles")
          .update({ rank, prize_usd: prize, status: "pending_payout" })
          .eq("id", entry.id);

        results.push({ artist_name: artist.artist_name, rank, prize, status: "pending_payout", error: stripeErr.message });
      }
    }

    // Create next year cycle rows for all qualified artists in this genre
    const nextYear = cycle_year + 1;
    for (const entry of entries) {
      await adminClient
        .from("charts_bonus_cycles")
        .upsert(
          { artist_id: entry.artist_id, genre, cycle_year: nextYear, cumulative_streams: 0, status: "active" },
          { onConflict: "artist_id,genre,cycle_year", ignoreDuplicates: true }
        );
    }

    // Log admin action
    await adminClient.from("admin_action_logs").insert({
      action_type: "close_annual_cycle",
      target_type: "charts_bonus_cycle",
      target_id: entries[0].id,
      admin_email: adminUser.email,
      details: { genre, cycle_year, results, next_year_seeded: entries.length },
    });

    // Check for ties at rank 3 and note it
    const tiesAtRank3 = ranked.filter((r) => r.rank === 3).length;

    return new Response(
      JSON.stringify({
        success: true,
        genre,
        cycle_year,
        winners: results,
        ties_at_rank_3: tiesAtRank3 > 1 ? tiesAtRank3 : 0,
        next_year_seeded: entries.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("close-annual-cycle error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
