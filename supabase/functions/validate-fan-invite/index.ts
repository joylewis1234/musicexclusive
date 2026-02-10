import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[VALIDATE-FAN-INVITE] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { token, action } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ valid: false, error: "Missing invite token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Look up the invite
    const { data: invite, error: fetchErr } = await supabaseAdmin
      .from("fan_invites")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (fetchErr || !invite) {
      logStep("Invite not found", { token: token.substring(0, 8) + "..." });
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid invite link" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already used
    if (invite.status === "used") {
      return new Response(
        JSON.stringify({ valid: false, error: "This invite has already been used" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      // Mark as expired
      await supabaseAdmin
        .from("fan_invites")
        .update({ status: "expired" })
        .eq("id", invite.id);

      return new Response(
        JSON.stringify({ valid: false, error: "This invite has expired" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if invalidated
    if (invite.status === "invalidated" || invite.status === "expired") {
      return new Response(
        JSON.stringify({ valid: false, error: "This invite is no longer valid" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify inviter is still eligible
    if (invite.inviter_type === "superfan") {
      const { data: member } = await supabaseAdmin
        .from("vault_members")
        .select("superfan_active")
        .eq("email", (await supabaseAdmin.auth.admin.getUserById(invite.inviter_id)).data?.user?.email || "")
        .maybeSingle();

      // If we can't verify or superfan is inactive, invalidate
      if (!member?.superfan_active) {
        await supabaseAdmin
          .from("fan_invites")
          .update({ status: "invalidated" })
          .eq("id", invite.id);

        return new Response(
          JSON.stringify({ valid: false, error: "This invite is no longer valid" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // If action is "consume", mark the invite as used
    if (action === "consume") {
      const authHeader = req.headers.get("Authorization");
      let inviteeEmail: string | null = null;
      
      if (authHeader) {
        const userToken = authHeader.replace("Bearer ", "");
        const { data: userData } = await supabaseAdmin.auth.getUser(userToken);
        inviteeEmail = userData.user?.email || null;
      }

      const { error: updateErr } = await supabaseAdmin
        .from("fan_invites")
        .update({ 
          status: "used", 
          used_at: new Date().toISOString(),
          invitee_email: inviteeEmail,
        })
        .eq("id", invite.id);

      if (updateErr) {
        logStep("Error consuming invite", { error: updateErr.message });
        throw new Error("Failed to consume invite");
      }

      // If invitee is authenticated, attach invite metadata to vault_members
      if (inviteeEmail) {
        await supabaseAdmin
          .from("vault_members")
          .update({ invite_token_used: token })
          .eq("email", inviteeEmail);
      }

      logStep("Invite consumed", { inviteId: invite.id, inviteeEmail });
    }

    return new Response(
      JSON.stringify({ 
        valid: true, 
        inviter_type: invite.inviter_type,
        invite_id: invite.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logStep("ERROR", { message });
    return new Response(
      JSON.stringify({ valid: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
