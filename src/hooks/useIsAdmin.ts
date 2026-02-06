import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Admin access requires BOTH conditions:
 * 1. user_roles row with role='admin'
 * 2. Email on the fixed allowlist (is_admin_email DB function)
 *
 * This prevents privilege escalation even if a role row is
 * somehow inserted for a non-allowlisted user.
 */
export function useIsAdmin() {
  const { user, isLoading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function checkAdminAccess() {
      if (!user?.email) {
        setIsAdmin(false);
        setIsChecking(false);
        return;
      }

      try {
        // Run both checks in parallel
        const [roleResult, allowlistResult] = await Promise.all([
          supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "admin")
            .maybeSingle(),
          supabase.rpc("is_admin_email", { email: user.email }),
        ]);

        const hasRole = !roleResult.error && !!roleResult.data;
        const onAllowlist = !allowlistResult.error && allowlistResult.data === true;

        // BOTH must be true
        setIsAdmin(hasRole && onAllowlist);
      } catch (err) {
        console.error("Error checking admin access:", err);
        setIsAdmin(false);
      } finally {
        setIsChecking(false);
      }
    }

    if (!authLoading) {
      checkAdminAccess();
    }
  }, [user, authLoading]);

  return { isAdmin, isLoading: authLoading || isChecking };
}
