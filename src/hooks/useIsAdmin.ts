import { useEffect, useRef, useState } from "react";
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

  const checkedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Skip if auth is still loading or no user
    if (authLoading) return;

    if (!user?.email) {
      setIsAdmin(false);
      setIsChecking(false);
      checkedUserIdRef.current = null;
      return;
    }

    // Guard: don't re-check the same user
    if (checkedUserIdRef.current === user.id) return;

    let cancelled = false;
    setIsChecking(true);

    (async () => {
      try {
        const [roleResult, allowlistResult] = await Promise.all([
          supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "admin")
            .maybeSingle(),
          supabase.rpc("is_admin_email", { email: user.email }),
        ]);

        if (cancelled) return;

        const hasRole = !roleResult.error && !!roleResult.data;
        const onAllowlist = !allowlistResult.error && allowlistResult.data === true;
        setIsAdmin(hasRole && onAllowlist);
        checkedUserIdRef.current = user.id;
      } catch (err) {
        if (!cancelled) {
          console.error("Error checking admin access:", err);
          setIsAdmin(false);
        }
      } finally {
        if (!cancelled) setIsChecking(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user?.id, user?.email, authLoading]);

  return { isAdmin, isLoading: authLoading || isChecking };
}
