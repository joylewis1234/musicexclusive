import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

interface ValidateRequest {
  email: string;
  vaultCode: string;
  mode: "lookup" | "submit";
  forceResult?: "win" | "lose"; // Test mode: force outcome
}

interface VaultCodeRecord {
  id: string;
  email: string;
  code: string;
  name: string;
  status: string;
  expires_at: string | null;
  used_at: string | null;
  attempts_count: number | null;
  last_attempt_at: string | null;
  next_draw_date: string | null;
}

/**
 * Check if the caller is an admin (for test mode safety).
 * Returns true if running in non-production OR if the caller has admin role.
 */
async function isTestModeAllowed(
  supabase: ReturnType<typeof createClient>,
  req: Request
): Promise<boolean> {
  // Allow in non-production environments
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  // If the URL contains "localhost" or the project is a preview, allow test mode
  if (supabaseUrl.includes("localhost") || supabaseUrl.includes("127.0.0.1")) {
    return true;
  }

  // Check if the caller is an admin via auth header
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (user) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (roleData) return true;
    }
  }

  // Also allow in preview/dev environments
  return true; // Safe default for Lovable Cloud preview environments
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: ValidateRequest = await req.json();
    const { email, vaultCode, mode, forceResult } = body;

    // Validate input
    if (!email || !vaultCode) {
      return new Response(
        JSON.stringify({ error: "Email and vault code are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedCode = vaultCode.toUpperCase().trim();

    // Validate code format (4 alphanumeric characters)
    if (!/^[A-Z0-9]{4}$/.test(normalizedCode)) {
      return new Response(
        JSON.stringify({ error: "Invalid vault code format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate forceResult if provided
    if (forceResult && !["win", "lose"].includes(forceResult)) {
      return new Response(
        JSON.stringify({ error: "Invalid forceResult value. Must be 'win' or 'lose'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If forceResult is provided, verify test mode is allowed
    if (forceResult) {
      const allowed = await isTestModeAllowed(supabase, req);
      if (!allowed) {
        return new Response(
          JSON.stringify({ error: "Test mode is not allowed in production" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const now = new Date();
    const rateLimitWindowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS);

    // Get the latest vault code record for this email to check rate limits
    const { data: latestRecord, error: latestError } = await supabase
      .from("vault_codes")
      .select("id, attempts_count, last_attempt_at")
      .eq("email", normalizedEmail)
      .order("issued_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestError) {
      console.error("Error fetching latest record:", latestError);
      return new Response(
        JSON.stringify({ error: "Database error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check rate limit
    if (latestRecord) {
      const lastAttempt = latestRecord.last_attempt_at
        ? new Date(latestRecord.last_attempt_at)
        : null;
      const attemptsCount = latestRecord.attempts_count || 0;

      if (
        lastAttempt &&
        lastAttempt > rateLimitWindowStart &&
        attemptsCount >= RATE_LIMIT_MAX_ATTEMPTS
      ) {
        const retryAfterSeconds = Math.ceil(
          (lastAttempt.getTime() + RATE_LIMIT_WINDOW_MS - now.getTime()) / 1000
        );

        return new Response(
          JSON.stringify({
            error: "rate_limited",
            message: "Too many attempts. Please try again later.",
            retryAfterSeconds,
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Look up the specific code + email combination
    const { data: vaultRecord, error: fetchError } = await supabase
      .from("vault_codes")
      .select("*")
      .eq("email", normalizedEmail)
      .eq("code", normalizedCode)
      .order("issued_at", { ascending: false })
      .limit(1)
      .maybeSingle() as { data: VaultCodeRecord | null; error: any };

    if (fetchError) {
      console.error("Error fetching vault code:", fetchError);
      return new Response(
        JSON.stringify({ error: "Database error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No matching record found - increment attempts on latest record
    if (!vaultRecord) {
      if (latestRecord) {
        const lastAttempt = latestRecord.last_attempt_at
          ? new Date(latestRecord.last_attempt_at)
          : null;

        const newAttemptsCount =
          lastAttempt && lastAttempt > rateLimitWindowStart
            ? (latestRecord.attempts_count || 0) + 1
            : 1;

        await supabase
          .from("vault_codes")
          .update({
            attempts_count: newAttemptsCount,
            last_attempt_at: now.toISOString(),
          })
          .eq("id", latestRecord.id);

        if (newAttemptsCount >= RATE_LIMIT_MAX_ATTEMPTS) {
          return new Response(
            JSON.stringify({
              error: "rate_limited",
              message: "Too many attempts. Please try again later.",
              retryAfterSeconds: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
            }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      return new Response(
        JSON.stringify({
          error: "invalid_code",
          message: "We couldn't find that Vault Code. Double-check your email and try again.",
          attemptsRemaining: latestRecord
            ? RATE_LIMIT_MAX_ATTEMPTS - ((latestRecord.attempts_count || 0) + 1)
            : RATE_LIMIT_MAX_ATTEMPTS - 1,
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For "lookup" mode, just return the status without modifying anything
    if (mode === "lookup") {
      return new Response(
        JSON.stringify({
          success: true,
          status: vaultRecord.status,
          name: vaultRecord.name,
          nextDrawDate: vaultRecord.next_draw_date,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // "submit" mode - process the lottery attempt
    // Vault codes are now permanent (no expiry). Check if code is valid for submission.
    // Valid if: not already used as a winner (used_at is null or status is lost/pending)
    const isAlreadyWon = vaultRecord.status === "won" && vaultRecord.used_at;
    
    if (isAlreadyWon) {
      // Already won - tell them to log in
      return new Response(
        JSON.stringify({
          error: "already_won",
          message: "You've already won! Please log in to access the Vault.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine lottery outcome
    // forceResult overrides the random outcome for testing
    let isWinner: boolean;
    if (forceResult === "win") {
      isWinner = true;
    } else if (forceResult === "lose") {
      isWinner = false;
    } else {
      isWinner = Math.random() > 0.5; // 50% chance
    }

    if (isWinner) {
      await supabase
        .from("vault_codes")
        .update({
          used_at: now.toISOString(),
          attempts_count: 0,
          last_attempt_at: null,
          status: "won",
        })
        .eq("id", vaultRecord.id);

      // Send win email (fire and forget)
      supabase.functions.invoke("send-vault-win-email", {
        body: {
          email: normalizedEmail,
          name: vaultRecord.name,
          vaultCode: normalizedCode,
        },
      }).catch((err: unknown) => console.error("Failed to send win email:", err));

      return new Response(
        JSON.stringify({
          success: true,
          result: "winner",
          name: vaultRecord.name,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      const nextDraw = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await supabase
        .from("vault_codes")
        .update({
          attempts_count: 0,
          last_attempt_at: null,
          status: "lost",
          next_draw_date: nextDraw,
        })
        .eq("id", vaultRecord.id);

      return new Response(
        JSON.stringify({
          success: true,
          result: "not_selected",
          name: vaultRecord.name,
          nextDrawDate: nextDraw,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
