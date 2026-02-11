import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[GENERATE-FAN-INVITE] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

function generateToken(): string {
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  const raw = String.fromCharCode(...arr);
  return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !userData.user) throw new Error("Unauthorized");

    const userId = userData.user.id;
    const { type, count } = await req.json();

    if (type === "artist") {
      // Verify user is an artist
      const { data: profile, error: profileErr } = await supabaseAdmin
        .from("artist_profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (profileErr || !profile) throw new Error("Artist profile not found");

      const artistId = profile.id;

      // Count invites generated in the last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { count: recentCount, error: countErr } = await supabaseAdmin
        .from("fan_invites")
        .select("id", { count: "exact", head: true })
        .eq("inviter_id", artistId)
        .eq("inviter_type", "artist")
        .gte("created_at", thirtyDaysAgo);

      if (countErr) throw new Error("Failed to check invite count");

      const used = recentCount || 0;
      const requested = count || 1;
      const remaining = 100 - used;

      if (requested > remaining) {
        return new Response(
          JSON.stringify({ error: `Only ${remaining} invites remaining this month`, remaining }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate invite(s)
      const invites = [];
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      for (let i = 0; i < requested; i++) {
        const inviteToken = generateToken();
        invites.push({
          token: inviteToken,
          inviter_id: artistId,
          inviter_type: "artist",
          status: "unused",
          expires_at: expiresAt,
        });
      }

      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from("fan_invites")
        .insert(invites)
        .select("id, token, created_at, status");

      if (insertErr) throw new Error("Failed to create invites: " + insertErr.message);

      logStep("Artist invites created", { artistId, count: requested });

      return new Response(
        JSON.stringify({ success: true, invites: inserted, remaining: remaining - requested }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (type === "superfan") {
      // Superfan invite generation (called by system, not directly by user usually)
      const inviteToken = generateToken();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from("fan_invites")
        .insert({
          token: inviteToken,
          inviter_id: userId,
          inviter_type: "superfan",
          status: "unused",
          expires_at: expiresAt,
        })
        .select("id, token, created_at, status, expires_at")
        .single();

      if (insertErr) throw new Error("Failed to create superfan invite: " + insertErr.message);

      logStep("Superfan invite created", { userId });

      return new Response(
        JSON.stringify({ success: true, invite: inserted }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid invite type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logStep("ERROR", { message });
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
