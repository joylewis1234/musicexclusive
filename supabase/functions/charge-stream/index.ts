import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create a client with the user's JWT to verify identity
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fanEmail = user.email;
    const fanUserId = user.id;

    if (!fanEmail) {
      return new Response(JSON.stringify({ error: "No email on account" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { trackId, idempotencyKey } = body ?? {};
    if (!trackId) {
      return new Response(JSON.stringify({ error: "trackId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!idempotencyKey || typeof idempotencyKey !== "string") {
      return new Response(JSON.stringify({ error: "idempotencyKey is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role client for all DB operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // 1. Fetch the track to get the owner's artist_id
    const { data: trackData, error: trackError } = await adminClient
      .from("tracks")
      .select("artist_id")
      .eq("id", trackId)
      .maybeSingle();

    if (trackError || !trackData) {
      console.error("Error fetching track:", trackError);
      return new Response(JSON.stringify({ error: "Track not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trackOwnerArtistId = trackData.artist_id;

    // 2. Check vault membership (read-only pre-check for better error messages)
    const { data: vaultMember, error: vaultError } = await adminClient
      .from("vault_members")
      .select("id, credits, vault_access_active")
      .eq("email", fanEmail)
      .maybeSingle();

    if (vaultError) {
      console.error("Error checking vault:", vaultError);
      return new Response(JSON.stringify({ error: "Could not verify vault access" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!vaultMember) {
      return new Response(JSON.stringify({ error: "You need vault access to stream" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!vaultMember.vault_access_active) {
      return new Response(JSON.stringify({ error: "Your vault access is not active" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (vaultMember.credits < 1) {
      return new Response(JSON.stringify({ error: "Insufficient credits", requiresCredits: true }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Idempotency: insert into stream_charges; if duplicate, return success
    const streamChargeId = crypto.randomUUID();

    const { error: idempotencyError } = await adminClient
      .from("stream_charges")
      .insert({
        stream_id: streamChargeId,
        fan_email: fanEmail,
        track_id: trackId,
        idempotency_key: idempotencyKey,
      });

    if (idempotencyError) {
      if (idempotencyError.code === "23505") {
        // Duplicate idempotency key — already charged
        const { data: current } = await adminClient
          .from("vault_members")
          .select("credits")
          .eq("email", fanEmail)
          .maybeSingle();
        return new Response(
          JSON.stringify({ success: true, alreadyCharged: true, newCredits: current?.credits ?? null }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("Idempotency insert error:", idempotencyError);
      return new Response(JSON.stringify({ error: "Failed to record stream charge" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Transactional debit: single RPC handles credit deduction + all ledger writes atomically
    const { data: rpcResult, error: rpcError } = await adminClient.rpc("debit_stream_credit", {
      p_fan_email: fanEmail,
      p_fan_user_id: fanUserId,
      p_track_id: trackId,
      p_artist_id: trackOwnerArtistId,
      p_stream_charge_id: streamChargeId,
      p_idempotency_key: idempotencyKey,
    });

    if (rpcError) {
      console.error("debit_stream_credit RPC error:", rpcError);
      return new Response(JSON.stringify({ error: "Failed to process payment" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!rpcResult?.success) {
      // Debit failed — could be concurrent update or insufficient credits
      return new Response(JSON.stringify({ error: "Concurrent update, retry" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, newCredits: rpcResult.newCredits }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("charge-stream error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
