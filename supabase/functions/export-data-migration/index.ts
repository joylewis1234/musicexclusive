import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeSQL(val: unknown): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "true" : "false";
  if (typeof val === "number") return String(val);
  if (typeof val === "object") return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

function generateInserts(tableName: string, rows: Record<string, unknown>[], conflictClause = ""): string {
  if (!rows || rows.length === 0) return `-- No data for ${tableName}\n`;
  const columns = Object.keys(rows[0]);
  const lines: string[] = [];
  lines.push(`-- ${tableName} (${rows.length} rows)`);
  for (const row of rows) {
    const values = columns.map((col) => escapeSQL(row[col]));
    lines.push(
      `INSERT INTO public.${tableName} (${columns.join(", ")}) VALUES (${values.join(", ")})${conflictClause};`
    );
  }
  lines.push("");
  return lines.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const sql: string[] = [];
  sql.push("-- =============================================");
  sql.push("-- MusicExclusive Data Migration Script");
  sql.push("-- Generated: " + new Date().toISOString());
  sql.push("-- Run AFTER full-schema.sql on your new instance");
  sql.push("-- PREREQUISITE: Create auth.users with matching UUIDs first");
  sql.push("-- =============================================");
  sql.push("");
  sql.push("BEGIN;");
  sql.push("");

  const conflict = " ON CONFLICT DO NOTHING";

  // 1. vault_members
  const { data: vaultMembers } = await supabaseAdmin.from("vault_members").select("*").order("joined_at");
  sql.push(generateInserts("vault_members", vaultMembers || [], ` ON CONFLICT (email) DO NOTHING`));

  // 2. profiles
  const { data: profiles } = await supabaseAdmin.from("profiles").select("*").order("created_at");
  sql.push(generateInserts("profiles", profiles || [], conflict));

  // 3. user_roles
  const { data: userRoles } = await supabaseAdmin.from("user_roles").select("*").order("created_at");
  sql.push(generateInserts("user_roles", userRoles || [], ` ON CONFLICT (user_id, role) DO NOTHING`));

  // 4. artist_profiles
  const { data: artistProfiles } = await supabaseAdmin.from("artist_profiles").select("*").order("created_at");
  sql.push(generateInserts("artist_profiles", artistProfiles || [], conflict));

  // 5. artist_applications
  const { data: artistApps } = await supabaseAdmin.from("artist_applications").select("*").order("created_at");
  sql.push(generateInserts("artist_applications", artistApps || [], conflict));

  // 6. artist_waitlist
  const { data: artistWaitlist } = await supabaseAdmin.from("artist_waitlist").select("*").order("created_at");
  sql.push(generateInserts("artist_waitlist", artistWaitlist || [], conflict));

  // 7. fan_waitlist
  const { data: fanWaitlist } = await supabaseAdmin.from("fan_waitlist").select("*").order("created_at");
  sql.push(generateInserts("fan_waitlist", fanWaitlist || [], conflict));

  // 8. tracks
  const { data: tracks } = await supabaseAdmin.from("tracks").select("*").order("created_at");
  sql.push(generateInserts("tracks", tracks || [], conflict));

  // 9. track_likes
  const { data: trackLikes } = await supabaseAdmin.from("track_likes").select("*").order("created_at");
  sql.push(generateInserts("track_likes", trackLikes || [], conflict));

  // 10. stream_charges
  const { data: streamCharges } = await supabaseAdmin.from("stream_charges").select("*").order("created_at");
  sql.push(generateInserts("stream_charges", streamCharges || [], conflict));

  // 11. stream_ledger
  const { data: streamLedger } = await supabaseAdmin.from("stream_ledger").select("*").order("created_at");
  sql.push(generateInserts("stream_ledger", streamLedger || [], conflict));

  // 12. credit_ledger
  const { data: creditLedger } = await supabaseAdmin.from("credit_ledger").select("*").order("created_at");
  sql.push(generateInserts("credit_ledger", creditLedger || [], ` ON CONFLICT (reference, type, user_email) DO NOTHING`));

  // 13. stripe_events
  const { data: stripeEvents } = await supabaseAdmin.from("stripe_events").select("*").order("processed_at");
  sql.push(generateInserts("stripe_events", stripeEvents || [], conflict));

  // 14. fan_invites
  const { data: fanInvites } = await supabaseAdmin.from("fan_invites").select("*").order("created_at");
  sql.push(generateInserts("fan_invites", fanInvites || [], conflict));

  // 15. agreement_acceptances
  const { data: agreements } = await supabaseAdmin.from("agreement_acceptances").select("*").order("accepted_at");
  sql.push(generateInserts("agreement_acceptances", agreements || [], conflict));

  // 16. artist_agreement_acceptances
  const { data: artistAgreements } = await supabaseAdmin.from("artist_agreement_acceptances").select("*").order("accepted_at");
  sql.push(generateInserts("artist_agreement_acceptances", artistAgreements || [], conflict));

  // 17. fan_terms_acceptances
  const { data: fanTerms } = await supabaseAdmin.from("fan_terms_acceptances").select("*").order("accepted_at");
  sql.push(generateInserts("fan_terms_acceptances", fanTerms || [], conflict));

  sql.push("COMMIT;");
  sql.push("");
  sql.push("-- =============================================");
  sql.push("-- Migration complete. Verify row counts:");
  sql.push(`-- vault_members: ${vaultMembers?.length || 0}`);
  sql.push(`-- profiles: ${profiles?.length || 0}`);
  sql.push(`-- user_roles: ${userRoles?.length || 0}`);
  sql.push(`-- artist_profiles: ${artistProfiles?.length || 0}`);
  sql.push(`-- artist_applications: ${artistApps?.length || 0}`);
  sql.push(`-- artist_waitlist: ${artistWaitlist?.length || 0}`);
  sql.push(`-- fan_waitlist: ${fanWaitlist?.length || 0}`);
  sql.push(`-- tracks: ${tracks?.length || 0}`);
  sql.push(`-- track_likes: ${trackLikes?.length || 0}`);
  sql.push(`-- stream_charges: ${streamCharges?.length || 0}`);
  sql.push(`-- stream_ledger: ${streamLedger?.length || 0}`);
  sql.push(`-- credit_ledger: ${creditLedger?.length || 0}`);
  sql.push(`-- stripe_events: ${stripeEvents?.length || 0}`);
  sql.push(`-- fan_invites: ${fanInvites?.length || 0}`);
  sql.push(`-- agreement_acceptances: ${agreements?.length || 0}`);
  sql.push(`-- artist_agreement_acceptances: ${artistAgreements?.length || 0}`);
  sql.push(`-- fan_terms_acceptances: ${fanTerms?.length || 0}`);
  sql.push("-- =============================================");

  const output = sql.join("\n");

  return new Response(output, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": "attachment; filename=data-migration.sql",
    },
  });
});
