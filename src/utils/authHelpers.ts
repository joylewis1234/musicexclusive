import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type AuthResult =
  | { ok: true; session: Session; user: User }
  | { ok: false; error: string };

/**
 * Get authenticated user or fail with a clear error.
 * Never waits forever - returns immediately if no session.
 */
export async function getAuthedUserOrFail(
  signal?: AbortSignal
): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (signal?.aborted) {
      return { ok: false, error: "Request cancelled" };
    }

    if (error) {
      console.error("[getAuthedUserOrFail] Session error:", error);
      return { ok: false, error: error.message };
    }

    if (!data.session) {
      return { ok: false, error: "Please sign in again" };
    }

    return {
      ok: true,
      session: data.session,
      user: data.session.user,
    };
  } catch (err: any) {
    console.error("[getAuthedUserOrFail] Unexpected error:", err);
    return { ok: false, error: err?.message || "Authentication failed" };
  }
}

/**
 * Wraps a fetch function with a timeout.
 * Returns { ok: false, error: "timeout" } if the timeout is exceeded.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 10000
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out (10s)")), timeoutMs)
    ),
  ]);
}

/**
 * Helper to mask user ID for display (first 6 chars)
 */
export function maskUserId(userId?: string | null): string {
  if (!userId) return "(none)";
  return userId.slice(0, 6) + "...";
}
