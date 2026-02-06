import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Parse optional body for application_id
    let applicationId: string | null = null;
    try {
      const body = await req.json();
      applicationId = body?.application_id ?? null;
    } catch {
      // No body is fine
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
    if (userError || !userData?.user) {
      console.error("[finalize-artist-setup] auth error:", userError);
      return new Response(
        JSON.stringify({ success: false, message: "Invalid session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = userData.user;
    const email = user.email?.trim().toLowerCase();

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, message: "No email on account" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Step 1: Find the application — by application_id first, then email ──
    let application: { id: string; artist_name: string; genres: string | null; auth_user_id: string | null; status: string } | null = null;

    if (applicationId) {
      const { data } = await supabaseAdmin
        .from("artist_applications")
        .select("id, artist_name, genres, auth_user_id, status")
        .eq("id", applicationId)
        .maybeSingle();
      application = data;
      console.log("[finalize-artist-setup] Lookup by application_id:", applicationId, "found:", !!data);
    }

    if (!application) {
      const { data } = await supabaseAdmin
        .from("artist_applications")
        .select("id, artist_name, genres, auth_user_id, status")
        .ilike("contact_email", email)
        .order("created_at", { ascending: false })
        .limit(1);
      application = data?.[0] ?? null;
      console.log("[finalize-artist-setup] Lookup by email:", email, "found:", !!application);
    }

    if (!application) {
      console.error("[finalize-artist-setup] No application found for:", email);
      return new Response(
        JSON.stringify({ success: false, message: "No application found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Step 2: Block if application already linked to ANOTHER auth user ──
    if (application.auth_user_id && application.auth_user_id !== user.id) {
      console.error("[finalize-artist-setup] ❌ Application already linked to another user:", application.auth_user_id, "current:", user.id);
      return new Response(
        JSON.stringify({
          success: false,
          message: "This application is already linked to another account. Contact support if you believe this is an error.",
          error_code: "ALREADY_LINKED",
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Step 3: Link auth_user_id permanently ──
    if (!application.auth_user_id) {
      const { error: linkError } = await supabaseAdmin
        .from("artist_applications")
        .update({ auth_user_id: user.id })
        .eq("id", application.id)
        .is("auth_user_id", null);

      if (linkError) {
        console.error("[finalize-artist-setup] auth_user_id link error:", linkError);
        // Check if it's the unique constraint — means someone else just claimed it
        if (linkError.code === "23505") {
          return new Response(
            JSON.stringify({
              success: false,
              message: "This application was just claimed by another account.",
              error_code: "ALREADY_LINKED",
            }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        console.log("[finalize-artist-setup] ✅ Linked auth_user_id to application:", application.id);
      }
    }

    // ── Step 4: Update application status to active ──
    const { error: updateError } = await supabaseAdmin
      .from("artist_applications")
      .update({ status: "active" })
      .eq("id", application.id);

    if (updateError) {
      console.error("[finalize-artist-setup] update error:", updateError);
    }

    // ── Step 5: Ensure artist role exists ──
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: user.id, role: "artist" },
        { onConflict: "user_id,role" }
      );

    if (roleError) {
      console.error("[finalize-artist-setup] role error:", roleError);
    }

    // ── Step 6: Check if artist profile exists; if not, create one ──
    const { data: existingProfile } = await supabaseAdmin
      .from("artist_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existingProfile) {
      const artistName = application.artist_name || email.split("@")[0];
      const genre = application.genres?.split(",")[0]?.trim() || null;

      const { error: profileError } = await supabaseAdmin
        .from("artist_profiles")
        .insert({
          user_id: user.id,
          artist_name: artistName,
          genre: genre,
        });

      if (profileError) {
        console.error("[finalize-artist-setup] profile creation error:", profileError);
      } else {
        console.log("[finalize-artist-setup] ✅ Created artist profile for:", email);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Artist setup finalized",
        application_id: application.id,
        auth_user_id: user.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[finalize-artist-setup] unexpected error:", err);
    return new Response(
      JSON.stringify({ success: false, message: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
