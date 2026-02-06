import { useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to log errors to the app_error_logs table.
 * Silently catches logging failures so it never disrupts the user.
 */
export function useErrorLogger() {
  const { user } = useAuth();

  const logError = useCallback(
    async (page: string, errorMessage: string) => {
      try {
        await supabase.from("app_error_logs" as any).insert({
          page,
          user_id: user?.id ?? null,
          error_message: errorMessage.slice(0, 2000), // cap length
        });
      } catch {
        // Never let logging itself break the app
        console.error("[ErrorLogger] Failed to persist error:", errorMessage);
      }
    },
    [user?.id]
  );

  return { logError };
}
