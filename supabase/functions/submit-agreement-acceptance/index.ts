import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MIN = 10;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();

    // Validate required fields
    if (!body.email || !body.name || !body.terms_version || !body.privacy_version) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const email = String(body.email).toLowerCase().trim();
    const name = String(body.name).trim();

    // Basic validation
    if (email.length < 4 || !email.includes("@") || name.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid email or name" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip")?.trim()
      || "unknown";
    const userAgent = req.headers.get("user-agent") || null;
    const endpoint = "agreement_acceptance";
    const rateKey = `${email}|${ip}`;

    // Rate limit check
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MIN * 60 * 1000).toISOString();
    const { data: existing } = await supabase
      .from("request_rate_limits")
      .select("id, count, window_start")
      .eq("key", rateKey)
      .eq("endpoint", endpoint)
      .gte("window_start", windowStart)
      .order("window_start", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing && existing.count >= RATE_LIMIT_MAX) {
      return new Response(
        JSON.stringify({ error: "Too many submissions. Please wait and try again." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Upsert rate limit counter
    if (existing) {
      await supabase
        .from("request_rate_limits")
        .update({ count: existing.count + 1, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabase.from("request_rate_limits").insert({
        key: rateKey,
        endpoint,
        window_start: new Date().toISOString(),
        count: 1,
      });
    }

    // Upsert agreement acceptance using service role
    const { error: upsertError } = await supabase
      .from("agreement_acceptances")
      .upsert(
        {
          email,
          name,
          terms_version: body.terms_version,
          privacy_version: body.privacy_version,
          accepted_at: new Date().toISOString(),
        },
        { onConflict: "email" }
      );

    if (upsertError) {
      console.error("[submit-agreement-acceptance] Upsert error:", upsertError);
      return new Response(
        JSON.stringify({ error: upsertError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err) {
    console.error("[submit-agreement-acceptance] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
