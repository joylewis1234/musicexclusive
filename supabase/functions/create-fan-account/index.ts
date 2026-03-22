import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const MIN_PASSWORD_LENGTH = 8;
const passwordMinLengthMessage = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CreateFanAccountRequest {
  email?: string;
  password?: string;
  displayName?: string;
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
    const body: CreateFanAccountRequest = await req.json();
    const email = body.email ? normalizeEmail(body.email) : "";
    const password = body.password ?? "";
    const displayName = body.displayName?.trim() || email.split("@")[0] || "Fan";

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: "email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return new Response(
        JSON.stringify({ success: false, error: passwordMinLengthMessage }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const existingUser = await findAuthUserByEmail(supabaseAdmin, email);
    if (existingUser) {
      return new Response(
        JSON.stringify({ success: true, status: "account_exists" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: authData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName,
      },
    });

    if (createUserError || !authData.user) {
      console.error("[create-fan-account] auth user creation failed:", createUserError);
      return new Response(
        JSON.stringify({ success: false, error: createUserError?.message || "Failed to create account" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userId = authData.user.id;

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "fan" }, { onConflict: "user_id,role" });

    if (roleError) {
      console.error("[create-fan-account] role assignment failed:", roleError);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to assign fan role" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { error: vaultMemberError } = await supabaseAdmin
      .from("vault_members")
      .upsert(
        {
          email,
          user_id: userId,
          display_name: displayName,
          vault_access_active: false,
          credits: 0,
        },
        { onConflict: "email", ignoreDuplicates: false },
      );

    if (vaultMemberError) {
      console.error("[create-fan-account] vault member upsert failed:", vaultMemberError);
      await supabaseAdmin.from("user_roles").delete().eq("user_id", userId).eq("role", "fan");
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to prepare fan profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: "created",
        user_id: userId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[create-fan-account] unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
