import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Exclude confusing characters: 0/O, 1/I/L
const CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return code;
}

interface GenerateRequest {
  name: string;
  email: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: GenerateRequest = await req.json();
    const { name, email } = body;

    // Validate input
    if (!name || !email) {
      return new Response(
        JSON.stringify({ error: "Name and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const trimmedName = name.trim();

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if email already has a vault code (codes are permanent)
    const { data: existingCode, error: fetchError } = await supabase
      .from("vault_codes")
      .select("code, name, status")
      .eq("email", normalizedEmail)
      .order("issued_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error("Error checking existing code:", fetchError);
      return new Response(
        JSON.stringify({ error: "Database error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingCode) {
      // Return existing code
      return new Response(
        JSON.stringify({
          success: true,
          code: existingCode.code,
          name: existingCode.name,
          existing: true,
          status: existingCode.status,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting: Check if a code was issued recently (within 1 minute)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { data: recentCodes } = await supabase
      .from("vault_codes")
      .select("issued_at")
      .eq("email", normalizedEmail)
      .gte("issued_at", oneMinuteAgo)
      .limit(1);

    if (recentCodes && recentCodes.length > 0) {
      return new Response(
        JSON.stringify({ error: "Please wait before requesting another code" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate unique 4-character code
    let generatedCode = generateCode();
    let attempts = 0;
    const maxAttempts = 20;

    while (attempts < maxAttempts) {
      const { data: collision } = await supabase
        .from("vault_codes")
        .select("code")
        .eq("code", generatedCode)
        .maybeSingle();

      if (!collision) break;
      generatedCode = generateCode();
      attempts++;
    }

    // Insert new vault code (permanent - no expiry)
    const { error: insertError } = await supabase
      .from("vault_codes")
      .insert({
        name: trimmedName,
        email: normalizedEmail,
        code: generatedCode,
        expires_at: null,
      });

    if (insertError) {
      console.error("Error inserting vault code:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to generate vault code" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        code: generatedCode,
        name: trimmedName,
        existing: false,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
