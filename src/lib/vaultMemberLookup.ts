import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type VaultUser = { id?: string; email?: string | null };

/**
 * Resolve the current user's vault_members row.
 * Prefer `user_id` (stable, avoids duplicate-email / maybeSingle issues); fall back to `email` for legacy rows.
 */
export async function fetchVaultMemberRow(
  supabase: SupabaseClient<Database>,
  user: VaultUser,
  select: string,
) {
  if (user.id) {
    const byUserId = await supabase
      .from("vault_members")
      .select(select)
      .eq("user_id", user.id)
      .maybeSingle();
    if (byUserId.error) return byUserId;
    if (byUserId.data) return byUserId;
  }
  if (user.email) {
    return supabase.from("vault_members").select(select).eq("email", user.email).maybeSingle();
  }
  return { data: null, error: null as null };
}
