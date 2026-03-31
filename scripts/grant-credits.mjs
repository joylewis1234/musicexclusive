/**
 * One-off / admin: add credits to a vault_members row by email.
 * Usage: node scripts/grant-credits.mjs <email> [delta]
 * Env: VITE_SUPABASE_URL, VITE_SUPABASE_SERVICE_ROLE_KEY (from .env)
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const email = process.argv[2]?.trim();
const delta = Number(process.argv[3] ?? 20);

if (!url || !key) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!email) {
  console.error("Usage: node scripts/grant-credits.mjs <email> [delta]");
  process.exit(1);
}
if (!Number.isFinite(delta)) {
  console.error("delta must be a number");
  process.exit(1);
}

const supabase = createClient(url, key);

const { data: row, error: fetchErr } = await supabase
  .from("vault_members")
  .select("id, credits, email")
  .eq("email", email)
  .maybeSingle();

if (fetchErr) {
  console.error(fetchErr);
  process.exit(1);
}
if (!row) {
  console.error(`No vault_members row for: ${email}`);
  process.exit(1);
}

const prev = row.credits ?? 0;
const next = prev + delta;

const { error: upErr } = await supabase
  .from("vault_members")
  .update({ credits: next })
  .eq("id", row.id);

if (upErr) {
  console.error(upErr);
  process.exit(1);
}

console.log(`OK: ${row.email} credits ${prev} → ${next} (${delta >= 0 ? "+" : ""}${delta})`);
