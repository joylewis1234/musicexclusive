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

/**
 * Ensures a vault_members row exists (required for shared_tracks.sender_id RLS).
 * Creates one via the ensure-vault-member edge function if missing.
 */
export async function ensureVaultMemberRow(
  supabase: SupabaseClient<Database>,
  user: VaultUser,
): Promise<{ id: string } | null> {
  const existing = await fetchVaultMemberRow(supabase, user, "id");
  if (existing.error) {
    console.error("ensureVaultMemberRow fetch:", existing.error);
    return null;
  }
  if (existing.data && "id" in existing.data && existing.data.id) {
    return { id: existing.data.id as string };
  }
  const { error: fnError } = await supabase.functions.invoke("ensure-vault-member");
  if (fnError) {
    console.error("ensure-vault-member:", fnError);
    return null;
  }
  const after = await fetchVaultMemberRow(supabase, user, "id");
  if (after.error || !after.data || !("id" in after.data) || !after.data.id) {
    return null;
  }
  return { id: after.data.id as string };
}
