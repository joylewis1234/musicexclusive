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
      console.error("[finalize-artist-setup] ❌ No application found for:", email);
      return new Response(
        JSON.stringify({ success: false, message: "No application found. Cannot assign artist role without an approved application." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Step 2: Verify application is in an approved state ──
    const allowedStatuses = ["approved", "approved_pending_setup", "active"];
    if (!allowedStatuses.includes(application.status)) {
      console.error("[finalize-artist-setup] ❌ Application status not approved:", application.status);
      return new Response(
        JSON.stringify({
          success: false,
          message: `Application status is "${application.status}". Only approved applications can create artist accounts.`,
          error_code: "NOT_APPROVED",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Step 3: Block if application already linked to ANOTHER auth user ──
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

    // ══════════════════════════════════════════════════════════════════════
    // ATOMIC BLOCK: All three operations must succeed or we fail entirely.
    // 1. Link auth_user_id to application
    // 2. Assign artist role
    // 3. Create artist profile (if missing)
    // ══════════════════════════════════════════════════════════════════════

    const errors: string[] = [];

    // ── Step 4: Link auth_user_id permanently ──
    if (!application.auth_user_id) {
      const { error: linkError } = await supabaseAdmin
        .from("artist_applications")
        .update({ auth_user_id: user.id, status: "active" })
        .eq("id", application.id)
        .is("auth_user_id", null);

      if (linkError) {
        console.error("[finalize-artist-setup] ❌ auth_user_id link error:", linkError);
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
        errors.push(`Link error: ${linkError.message}`);
      } else {
        console.log("[finalize-artist-setup] ✅ Linked auth_user_id to application:", application.id);
      }
    } else {
      // Already linked to this user — just ensure status is active
      const { error: statusError } = await supabaseAdmin
        .from("artist_applications")
        .update({ status: "active" })
        .eq("id", application.id);
      if (statusError) {
        console.error("[finalize-artist-setup] status update error:", statusError);
        errors.push(`Status update error: ${statusError.message}`);
      }
    }

    // If linking failed, abort before role/profile creation
    if (errors.length > 0) {
      console.error("[finalize-artist-setup] ❌ Aborting: linking failed:", errors);
      return new Response(
        JSON.stringify({ success: false, message: "Failed to link application to your account. Please try again.", details: errors }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Step 5: Assign artist role (must succeed) ──
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: user.id, role: "artist" },
        { onConflict: "user_id,role" }
      );

    if (roleError) {
      console.error("[finalize-artist-setup] ❌ Role assignment failed:", roleError);
      return new Response(
        JSON.stringify({ success: false, message: "Failed to assign artist role. Please try again.", details: roleError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log("[finalize-artist-setup] ✅ Artist role assigned for user:", user.id);

    // ── Step 6: Create artist profile if missing (must succeed) ──
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
        console.error("[finalize-artist-setup] ❌ Profile creation failed:", profileError);
        // Role was assigned but profile failed — this is a partial state we must report
        return new Response(
          JSON.stringify({ success: false, message: "Role assigned but profile creation failed. Please try again.", details: profileError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log("[finalize-artist-setup] ✅ Created artist profile for:", email);
    } else {
      console.log("[finalize-artist-setup] ℹ️ Artist profile already exists:", existingProfile.id);
    }

    // ══════════════════════════════════════════════════════════════════════
    // ALL STEPS SUCCEEDED — return success
    // ══════════════════════════════════════════════════════════════════════

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
