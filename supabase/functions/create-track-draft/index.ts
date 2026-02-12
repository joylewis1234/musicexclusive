import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !anonKey || !serviceKey) {
    console.error("[create-track-draft] Missing env vars");
    return json({ error: "Server misconfigured" }, 500);
  }

  // ── Auth ──
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }
  const token = authHeader.replace("Bearer ", "");

  const supabaseAuth = createClient(supabaseUrl, anonKey);
  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

  // Validate JWT
  const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
  if (claimsError || !claimsData?.claims?.sub) {
    console.error("[create-track-draft] JWT invalid:", claimsError);
    return json({ error: "Unauthorized", details: claimsError?.message }, 401);
  }
  const userId = claimsData.claims.sub;
  console.log("[create-track-draft] userId:", userId);

  // ── Parse body ──
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const genre = typeof body.genre === "string" ? body.genre : null;

  if (!title) {
    return json({ error: "Missing title" }, 400);
  }

  // ── Look up artist profile (service role – no RLS overhead) ──
  console.log("[create-track-draft] looking up artist_profile for user:", userId);
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("artist_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileErr) {
    console.error("[create-track-draft] profile query error:", profileErr);
    return json({ error: "Failed to look up artist profile", details: profileErr.message }, 500);
  }
  if (!profile?.id) {
    console.error("[create-track-draft] no profile found for user:", userId);
    return json({ error: "Artist profile not found" }, 404);
  }

  const artistId = profile.id;
  console.log("[create-track-draft] artistId:", artistId);

  // ── Insert track draft (service role – bypasses RLS for speed) ──
  const insertPayload = {
    artist_id: artistId,
    title,
    genre,
    artwork_url: null,
    full_audio_url: null,
    status: "uploading",
  };
  console.log("[create-track-draft] inserting track draft:", JSON.stringify(insertPayload));

  const { data: trackRow, error: insertErr } = await supabaseAdmin
    .from("tracks")
    .insert(insertPayload)
    .select("id")
    .single();

  if (insertErr) {
    console.error("[create-track-draft] insert error:", insertErr);
    return json({
      error: "Failed to create track draft",
      details: insertErr.message,
      code: insertErr.code,
      hint: insertErr.hint,
    }, 500);
  }

  if (!trackRow?.id) {
    console.error("[create-track-draft] insert returned no id");
    return json({ error: "Insert returned no track ID" }, 500);
  }

  console.log("[create-track-draft] ✅ trackId:", trackRow.id);
  return json({ trackId: trackRow.id, artistId });
});
