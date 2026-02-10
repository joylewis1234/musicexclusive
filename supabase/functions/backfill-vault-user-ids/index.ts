import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[BACKFILL-VAULT-USER-IDS] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Require admin auth (NO anonymous backfill allowed) ─────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);

    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Starting backfill");

    // Get all vault_members where user_id is null
    const { data: members, error: fetchErr } = await supabaseAdmin
      .from("vault_members")
      .select("id, email")
      .is("user_id", null);

    if (fetchErr) throw new Error("Failed to fetch members: " + fetchErr.message);
    if (!members || members.length === 0) {
      logStep("No members need backfill");
      return new Response(
        JSON.stringify({ success: true, updated: 0, not_found: 0, total: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Members to backfill", { count: members.length });

    // Fetch all auth users (paginate if needed)
    const allAuthUsers: Array<{ id: string; email: string }> = [];
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (!usersPage?.users?.length) break;
      for (const u of usersPage.users) {
        if (u.email) {
          allAuthUsers.push({ id: u.id, email: u.email.toLowerCase() });
        }
      }
      if (usersPage.users.length < perPage) break;
      page++;
    }

    logStep("Auth users loaded", { count: allAuthUsers.length });

    // Build email -> auth user id map
    const emailToUserId = new Map<string, string>();
    for (const u of allAuthUsers) {
      emailToUserId.set(u.email, u.id);
    }

    let updated = 0;
    let notFound = 0;

    for (const member of members) {
      const authUserId = emailToUserId.get(member.email.toLowerCase());
      if (authUserId) {
        const { error: updateErr } = await supabaseAdmin
          .from("vault_members")
          .update({ user_id: authUserId })
          .eq("id", member.id);

        if (updateErr) {
          logStep("Update failed", { memberId: member.id, error: updateErr.message });
        } else {
          updated++;
        }
      } else {
        notFound++;
      }
    }

    logStep("Backfill complete", { updated, notFound, total: members.length });

    return new Response(
      JSON.stringify({ success: true, updated, not_found: notFound, total: members.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logStep("ERROR", { message });
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
