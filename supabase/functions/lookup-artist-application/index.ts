import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface LookupRequest {
  email?: string;
  application_id?: string;
  auth_user_id?: string;
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: LookupRequest = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Lookup by auth_user_id (strongest link) ──
    if (body.auth_user_id) {
      const uid = String(body.auth_user_id).trim();
      console.log("[lookup-artist-application] Looking up by auth_user_id:", uid);

      const { data, error } = await supabaseAdmin
        .from("artist_applications")
        .select("id, status, contact_email, artist_name, created_at, auth_user_id")
        .eq("auth_user_id", uid)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) {
        console.error("[lookup-artist-application] auth_user_id query error:", error);
        return new Response(
          JSON.stringify({ success: false, found: false, message: "Lookup failed", error_code: error.code }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const row = data?.[0] ?? null;
      if (row) {
        return new Response(
          JSON.stringify({
            success: true,
            found: true,
            email: row.contact_email,
            status: row.status,
            application_id: row.id,
            artist_name: row.artist_name,
            auth_user_id: row.auth_user_id,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Fall through to application_id or email lookup
      console.log("[lookup-artist-application] No record found by auth_user_id, falling through...");
    }

    // ── Lookup by application_id (deterministic, preferred) ──
    if (body.application_id) {
      const appId = String(body.application_id).trim();
      console.log("[lookup-artist-application] Looking up by application_id:", appId);

      const { data, error } = await supabaseAdmin
        .from("artist_applications")
        .select("id, status, contact_email, artist_name, created_at, auth_user_id")
        .eq("id", appId)
        .maybeSingle();

      if (error) {
        console.error("[lookup-artist-application] query error:", error);
        return new Response(
          JSON.stringify({ success: false, found: false, message: "Lookup failed", error_code: error.code }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!data) {
        return new Response(
          JSON.stringify({ success: true, found: false, message: "No application found with that ID." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          found: true,
          email: data.contact_email,
          status: data.status,
          application_id: data.id,
          artist_name: data.artist_name,
          auth_user_id: data.auth_user_id,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Lookup by email (fallback) ──
    const rawEmail = String(body?.email ?? "");
    const email = normalizeEmail(rawEmail);

    console.log("[lookup-artist-application] Looking up by email:", email);

    if (!email || !email.includes("@") || email.length > 255) {
      return new Response(
        JSON.stringify({
          success: false,
          found: false,
          message: "Please provide a valid email address.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("artist_applications")
      .select("id, status, contact_email, artist_name, created_at, auth_user_id")
      .ilike("contact_email", email)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("[lookup-artist-application] query error:", error);
      return new Response(
        JSON.stringify({ success: false, found: false, message: "Lookup failed", error_code: error.code }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const row = data?.[0] ?? null;

    if (!row) {
      return new Response(
        JSON.stringify({
          success: true,
          found: false,
          message: "No approved application found for that email.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        found: true,
        email: row.contact_email,
        status: row.status,
        application_id: row.id,
        artist_name: row.artist_name,
        auth_user_id: row.auth_user_id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[lookup-artist-application] unexpected error:", err);
    return new Response(
      JSON.stringify({ success: false, found: false, message: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
