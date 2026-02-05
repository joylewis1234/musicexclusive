import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

export interface VerifyAdminResult {
  user: { id: string; email?: string } | null;
  error: string | null;
}

/**
 * Verifies that the request is from an authenticated admin user.
 * Uses getUser() for JWT validation, then checks user_roles table.
 */
export async function verifyAdmin(authHeader: string | null): Promise<VerifyAdminResult> {
  if (!authHeader?.startsWith("Bearer ")) {
    return { user: null, error: "Missing Authorization header" };
  }

  const token = authHeader.replace("Bearer ", "");

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

  // Check admin role using service role client (bypasses RLS)
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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
    error: null,
  };
}
