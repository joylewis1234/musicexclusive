import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type SignupIntent = "fan" | "artist-signup" | "artist-setup";

interface CompleteSignupVerificationRequest {
  intent?: SignupIntent;
  displayName?: string;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const body: CompleteSignupVerificationRequest = await req.json();
    const intent = body.intent;

    if (!intent || !["fan", "artist-signup", "artist-setup"].includes(intent)) {
      return new Response(
        JSON.stringify({ success: false, error: "A valid signup intent is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid session." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const user = userData.user;
    const email = user.email ? normalizeEmail(user.email) : "";
    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: "Account email is missing." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const displayName =
      body.displayName?.trim() ||
      (typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name : "") ||
      email.split("@")[0];

    const { error: userUpdateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      email_confirm: true,
      user_metadata: {
        ...(user.user_metadata ?? {}),
        display_name: displayName,
      },
    });

    if (userUpdateError) {
      console.error("[complete-signup-verification] failed to update user:", userUpdateError);
      return new Response(
        JSON.stringify({ success: false, error: "Could not confirm your account." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (intent === "fan") {
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: user.id, role: "fan" }, { onConflict: "user_id,role" });

      if (roleError) {
        return new Response(
          JSON.stringify({ success: false, error: "Could not assign fan access." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { error: vaultMemberError } = await supabaseAdmin
        .from("vault_members")
        .upsert(
          {
            email,
            user_id: user.id,
            display_name: displayName,
            vault_access_active: false,
            credits: 0,
          },
          { onConflict: "email", ignoreDuplicates: false },
        );

      if (vaultMemberError) {
        return new Response(
          JSON.stringify({ success: false, error: "Could not prepare your fan profile." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    if (intent === "artist-signup") {
      const { error: artistRoleError } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: user.id, role: "artist" }, { onConflict: "user_id,role" });

      if (artistRoleError) {
        return new Response(
          JSON.stringify({ success: false, error: "Could not assign artist access." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: existingProfile, error: profileLookupError } = await supabaseAdmin
        .from("artist_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileLookupError) {
        return new Response(
          JSON.stringify({ success: false, error: "Could not prepare your artist profile." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (!existingProfile) {
        const { error: profileInsertError } = await supabaseAdmin
          .from("artist_profiles")
          .insert({
            user_id: user.id,
            artist_name: displayName,
            genre: null,
          });

        if (profileInsertError) {
          return new Response(
            JSON.stringify({ success: false, error: "Could not create your artist profile." }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, email }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[complete-signup-verification] unexpected error:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
