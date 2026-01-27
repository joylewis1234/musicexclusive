import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { artist_name, email } = await req.json();

    if (!artist_name || !email) {
      return new Response(
        JSON.stringify({ error: "artist_name and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Create an actual auth user first (required for foreign key)
    const tempPassword = `TestPass${Date.now()}!`;
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password: tempPassword,
      email_confirm: true,
      user_metadata: { is_test_artist: true, artist_name: artist_name.trim() },
    });

    if (authError) {
      console.error("Auth user creation error:", authError);
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const testUserId = authData.user.id;

    // Create artist_profiles record
    const { error: profileError } = await supabaseAdmin
      .from("artist_profiles")
      .insert({
        user_id: testUserId,
        artist_name: artist_name.trim(),
        payout_status: "not_connected",
        bio: "Test artist created for development purposes.",
        genre: "Test",
      });

    if (profileError) {
      console.error("Profile insert error:", profileError);
      return new Response(
        JSON.stringify({ error: profileError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create artist_applications record marked as active
    const { error: appError } = await supabaseAdmin
      .from("artist_applications")
      .insert({
        artist_name: artist_name.trim(),
        contact_email: email.trim(),
        status: "active",
        primary_social_platform: "instagram",
        social_profile_url: "https://instagram.com/test",
        song_sample_url: "https://example.com/test.mp3",
        genres: "Test",
        years_releasing: "1-3",
        follower_count: 1000,
        owns_rights: true,
        not_released_publicly: true,
        agrees_terms: true,
      });

    if (appError) {
      console.error("Application insert error:", appError);
      return new Response(
        JSON.stringify({ error: appError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        artist_name: artist_name.trim(),
        email: email.trim(),
        user_id: testUserId,
        temp_password: tempPassword, // Return for testing login
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
