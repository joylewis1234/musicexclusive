import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export interface VerifyAdminResult {
  user: { id: string; email?: string } | null;
  error: string | null;
}

/**
 * Verifies that the request is from an authenticated admin user.
 * Uses JWT validation and checks the user_roles table.
 */
export async function verifyAdmin(authHeader: string | null): Promise<VerifyAdminResult> {
  if (!authHeader?.startsWith("Bearer ")) {
    return { user: null, error: "Missing Authorization header" };
  }

  const token = authHeader.replace("Bearer ", "");
  
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  // Verify JWT and get claims
  const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
  
  if (claimsError || !claimsData?.claims) {
    return { user: null, error: "Invalid or expired token" };
  }

  const userId = claimsData.claims.sub;
  const userEmail = claimsData.claims.email as string | undefined;

  if (!userId) {
    return { user: null, error: "Invalid token - no user ID" };
  }

  // Check admin role using service role client (bypasses RLS)
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: roleData, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (roleError) {
    console.error("[VERIFY-ADMIN] Error checking role:", roleError.message);
    return { user: null, error: "Failed to verify admin role" };
  }

  if (!roleData) {
    return { user: null, error: "Forbidden - Admin access required" };
  }

  return { 
    user: { id: userId, email: userEmail }, 
    error: null 
  };
}
