import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TERMS_VERSION = "1.0";
const PRIVACY_VERSION = "1.0";
const MIN_PASSWORD_LENGTH = 8;
const passwordMinLengthMessage = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;

type ClaimMode = "inspect" | "claim";

interface ClaimRequest {
  mode?: ClaimMode;
  email?: string;
  vaultCode?: string;
  password?: string;
  termsVersion?: string;
  privacyVersion?: string;
}

interface VaultCodeRecord {
  id: string;
  name: string;
  email: string;
  code: string;
  status: string;
  used_at: string | null;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeVaultCode(value: string) {
  return value.trim().toUpperCase();
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

  let createdUserId: string | null = null;

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const body: ClaimRequest = await req.json();
    const mode = body.mode ?? "inspect";
    const email = body.email ? normalizeEmail(body.email) : "";
    const vaultCode = body.vaultCode ? normalizeVaultCode(body.vaultCode) : "";
    const password = body.password ?? "";
    const termsVersion = body.termsVersion ?? TERMS_VERSION;
    const privacyVersion = body.privacyVersion ?? PRIVACY_VERSION;

    if (!email || !vaultCode) {
      return new Response(
        JSON.stringify({ success: false, error: "email and vaultCode are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: vaultRecord, error: vaultError } = await supabaseAdmin
      .from("vault_codes")
      .select("id, name, email, code, status, used_at")
      .eq("email", email)
      .eq("code", vaultCode)
      .maybeSingle<VaultCodeRecord>();

    if (vaultError) {
      throw vaultError;
    }

    if (!vaultRecord) {
      return new Response(
        JSON.stringify({ success: false, error: "invalid_code" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (vaultRecord.status !== "won") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "not_winner",
          status: vaultRecord.status,
          name: vaultRecord.name,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const existingUser = await findAuthUserByEmail(supabaseAdmin, email);

    if (mode === "inspect") {
      return new Response(
        JSON.stringify({
          success: true,
          status: existingUser ? "account_exists" : "claimable",
          email,
          vaultCode,
          name: vaultRecord.name,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return new Response(
        JSON.stringify({ success: false, error: passwordMinLengthMessage }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (existingUser) {
      return new Response(
        JSON.stringify({
          success: true,
          status: "account_exists",
          email,
          vaultCode,
          name: vaultRecord.name,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: authData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: vaultRecord.name,
      },
    });

    if (createUserError) {
      const msg = createUserError.message.toLowerCase();
      if (msg.includes("already") || msg.includes("exists") || msg.includes("registered")) {
        return new Response(
          JSON.stringify({
            success: true,
            status: "account_exists",
            email,
            vaultCode,
            name: vaultRecord.name,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      throw createUserError;
    }

    const createdUser = authData.user;
    if (!createdUser) {
      throw new Error("Auth user was not returned after createUser");
    }

    createdUserId = createdUser.id;

    const userAgent = req.headers.get("user-agent");
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
    const acceptedAt = new Date().toISOString();

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: createdUser.id, role: "fan" }, { onConflict: "user_id,role" });
    if (roleError) throw roleError;

    const { error: vaultMemberError } = await supabaseAdmin
      .from("vault_members")
      .upsert(
        {
          email,
          display_name: vaultRecord.name,
          user_id: createdUser.id,
          credits: 0,
          vault_access_active: false,
        },
        { onConflict: "email" },
      );
    if (vaultMemberError) throw vaultMemberError;

    const { error: agreementError } = await supabaseAdmin
      .from("agreement_acceptances")
      .upsert(
        {
          email,
          name: vaultRecord.name,
          terms_version: termsVersion,
          privacy_version: privacyVersion,
          accepted_at: acceptedAt,
          ip_address: ipAddress,
          user_agent: userAgent,
        },
        { onConflict: "email" },
      );
    if (agreementError) throw agreementError;

    const { error: fanTermsError } = await supabaseAdmin
      .from("fan_terms_acceptances")
      .insert({
        user_id: createdUser.id,
        agreement_type: "fan_terms",
        version: `vault_claim_${termsVersion}`,
        user_agent: userAgent,
      });
    if (fanTermsError && fanTermsError.code !== "23505") throw fanTermsError;

    return new Response(
      JSON.stringify({
        success: true,
        status: "claimed",
        email,
        vaultCode,
        name: vaultRecord.name,
        userId: createdUser.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[claim-vault-access] error:", message);

    if (createdUserId) {
      try {
        const supabaseAdmin = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        );
        await supabaseAdmin.auth.admin.deleteUser(createdUserId);
      } catch (cleanupError) {
        console.error("[claim-vault-access] cleanup failed:", cleanupError);
      }
    }

    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
