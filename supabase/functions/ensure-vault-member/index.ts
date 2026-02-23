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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate the user token
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await anonClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const email = claimsData.claims.email as string;

    if (!email) {
      return new Response(
        JSON.stringify({ error: "No email in token claims" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Use service_role client for the upsert
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const displayName = email.split("@")[0];

    const { data, error } = await serviceClient
      .from("vault_members")
      .upsert(
        {
          email,
          user_id: userId,
          display_name: displayName,
          vault_access_active: false,
          credits: 0,
        },
        { onConflict: "email", ignoreDuplicates: false }
      )
      .select()
      .single();

    if (error) {
      // If upsert fails because row exists and we can't overwrite credits,
      // just fetch the existing row
      if (error.code === "23505" || error.message?.includes("duplicate")) {
        const { data: existing } = await serviceClient
          .from("vault_members")
          .select("*")
          .eq("email", email)
          .single();

        // Update user_id if missing
        if (existing && !existing.user_id) {
          await serviceClient
            .from("vault_members")
            .update({ user_id: userId })
            .eq("email", email);
          existing.user_id = userId;
        }

        return new Response(JSON.stringify(existing), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.error("Upsert error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to ensure vault member" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
