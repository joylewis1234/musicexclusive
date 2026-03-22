import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_STATUSES = new Set(["approved", "approved_pending_setup", "active"]);

interface CreateArtistSetupAccountRequest {
  email?: string;
  password?: string;
  application_id?: string | null;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

async function findAuthUserByEmail(
  supabaseAdmin: ReturnType<typeof createClient>,
  email: string,
) {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email);
    if (user) return user;
    if (data.users.length < perPage) return null;

    page += 1;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: CreateArtistSetupAccountRequest = await req.json();
    const email = body.email ? normalizeEmail(body.email) : "";
    const password = body.password ?? "";
    const applicationId = body.application_id?.trim() || null;

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, message: "email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (password.length < 8) {
      return new Response(
        JSON.stringify({ success: false, message: "Password must be at least 8 characters." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    let application = null;

    if (applicationId) {
      const { data, error } = await supabaseAdmin
        .from("artist_applications")
        .select("id, artist_name, contact_email, auth_user_id, status")
        .eq("id", applicationId)
        .maybeSingle();

      if (error) throw error;
      application = data;
    }

    if (!application) {
      const { data, error } = await supabaseAdmin
        .from("artist_applications")
        .select("id, artist_name, contact_email, auth_user_id, status")
        .ilike("contact_email", email)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;
      application = data?.[0] ?? null;
    }

    if (!application) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "No application found. Cannot assign artist role without an approved application.",
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (normalizeEmail(application.contact_email) !== email) {
      return new Response(
        JSON.stringify({ success: false, message: "Application email does not match this setup request." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!ALLOWED_STATUSES.has(application.status)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Application status is "${application.status}". Only approved applications can create artist accounts.`,
          error_code: "NOT_APPROVED",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (application.auth_user_id) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "This application is already linked to another account. Contact support if you believe this is an error.",
          error_code: "ALREADY_LINKED",
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const existingUser = await findAuthUserByEmail(supabaseAdmin, email);
    if (existingUser) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "An account with this email already exists.",
          error_code: "ALREADY_REGISTERED",
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: authData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: application.artist_name || email.split("@")[0],
      },
    });

    if (createUserError || !authData.user) {
      console.error("[create-artist-setup-account] auth user creation failed:", createUserError);
      return new Response(
        JSON.stringify({
          success: false,
          message: createUserError?.message || "Failed to create artist account",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: authData.user.id,
        application_id: application.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[create-artist-setup-account] unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
