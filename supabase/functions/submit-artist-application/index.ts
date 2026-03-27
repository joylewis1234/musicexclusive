import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MIN = 10;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const APP_URL = "https://www.musicexclusive.co";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();

    // Validate required fields
    if (!body.contact_email || !body.artist_name || !body.agrees_terms) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const email = String(body.contact_email).toLowerCase().trim();
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const endpoint = "artist_application";
    const rateKey = `${email}|${ip}`;

    // Rate limit check
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MIN * 60 * 1000).toISOString();
    const { data: existing } = await supabase
      .from("request_rate_limits")
      .select("id, count, window_start")
      .eq("key", rateKey)
      .eq("endpoint", endpoint)
      .gte("window_start", windowStart)
      .order("window_start", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing && existing.count >= RATE_LIMIT_MAX) {
      return new Response(
        JSON.stringify({ error: "Too many submissions. Please wait and try again." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Upsert rate limit counter
    if (existing) {
      await supabase
        .from("request_rate_limits")
        .update({ count: existing.count + 1, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabase.from("request_rate_limits").insert({
        key: rateKey,
        endpoint,
        window_start: new Date().toISOString(),
        count: 1,
      });
    }

    // Insert application using service role
    const insertPayload = {
      id: body.id || crypto.randomUUID(),
      artist_name: body.artist_name,
      contact_email: email,
      country_city: body.country_city || null,
      spotify_url: body.spotify_url || null,
      apple_music_url: body.apple_music_url || null,
      years_releasing: body.years_releasing || "1-2 years",
      genres: body.genres || "",
      primary_social_platform: body.primary_social_platform || "instagram",
      social_profile_url: body.social_profile_url || "not_provided",
      follower_count: parseInt(body.follower_count) || 0,
      song_sample_url: body.song_sample_url || "not_required",
      hook_preview_url: body.hook_preview_url || null,
      owns_rights: body.owns_rights ?? true,
      not_released_publicly: body.not_released_publicly ?? true,
      agrees_terms: true,
      status: "pending",
    };

    const { error: insertError } = await supabase
      .from("artist_applications")
      .insert(insertPayload);

    if (insertError) {
      console.error("[submit-artist-application] Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Trigger notification (fire-and-forget, don't fail the submission)
    try {
      const notifyUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-new-application`;
      await fetch(notifyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          applicationId: insertPayload.id,
          baseUrl: APP_URL,
        }),
      });
    } catch (notifyErr) {
      console.error("[submit-artist-application] Notification failed:", notifyErr);
    }

    return new Response(
      JSON.stringify({ success: true, applicationId: insertPayload.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err) {
    console.error("[submit-artist-application] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
