import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

export interface VerifyAdminResult {
  user: { id: string; email?: string } | null;
  error: string | null;
}

/**
 * Decode a JWT payload (no signature check) and return true when the token
 * carries `role: "service_role"` and is not expired.  Supabase pg_cron jobs
 * authenticate with this JWT, so scheduled Edge Functions must accept it.
 */
export function hasServiceRoleJwt(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    if (payload.role !== "service_role") return false;
    if (payload.exp && payload.exp < Date.now() / 1000) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Verifies that the request is from an authenticated admin user OR a
 * service_role caller (pg_cron / scheduled jobs).
 *
 * Admin access requires BOTH:
 * 1. A row in user_roles with role='admin'
 * 2. The user's email on the fixed allowlist (is_admin_email)
 *
 * Service_role callers bypass both checks (they already have full DB access).
 * This prevents privilege escalation even if a rogue role row exists.
 */
export async function verifyAdmin(authHeader: string | null): Promise<VerifyAdminResult> {
  if (!authHeader?.startsWith("Bearer ")) {
    return { user: null, error: "Missing Authorization header" };
  }

  const token = authHeader.replace("Bearer ", "");

  // Service_role JWTs (pg_cron, scheduled jobs) bypass admin checks
  if (hasServiceRoleJwt(token)) {
    return { user: { id: "service_role", email: "cron@system" }, error: null };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Validate the JWT by calling getUser with the user's token
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();

  if (userError || !userData?.user) {
    console.error("[VERIFY-ADMIN] getUser failed:", userError?.message);
    return { user: null, error: "Invalid or expired token" };
  }

  const userId = userData.user.id;
  const userEmail = userData.user.email;

  if (!userEmail) {
    return { user: null, error: "User has no email — cannot verify admin" };
  }

  // Use service role client (bypasses RLS)
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  // Run both checks in parallel: role table AND allowlist
  const [roleResult, allowlistResult] = await Promise.all([
    supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle(),
    supabaseAdmin.rpc("is_admin_email", { email: userEmail }),
  ]);

  if (roleResult.error) {
    console.error("[VERIFY-ADMIN] Error checking role:", roleResult.error.message);
    return { user: null, error: "Failed to verify admin role" };
  }

  if (allowlistResult.error) {
    console.error("[VERIFY-ADMIN] Error checking allowlist:", allowlistResult.error.message);
    return { user: null, error: "Failed to verify admin allowlist" };
  }

  const hasRole = !!roleResult.data;
  const onAllowlist = allowlistResult.data === true;

  if (!hasRole || !onAllowlist) {
    console.warn(
      `[VERIFY-ADMIN] Access denied for ${userEmail}: hasRole=${hasRole}, onAllowlist=${onAllowlist}`
    );
    return { user: null, error: "Forbidden - Admin access required" };
  }

  return {
    user: { id: userId, email: userEmail },
    error: null,
  };
}
