/**
 * One-off: verify tracks.is_preview_public default + set vault_access_active for QA test fans.
 * Requires DATABASE_PASSWORD in .env (Supabase Postgres).
 * Run: node scripts/qa-db-remote-fixes.mjs
 */
import pg from "pg";
import dotenv from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env") });

const PROJECT_REF = "esgpsapstljgsqpmezzf";
const password = process.env.DATABASE_PASSWORD ?? process.env.SUPABASE_DB_PASSWORD;
if (!password) {
  console.error("Missing DATABASE_PASSWORD (or SUPABASE_DB_PASSWORD) in .env");
  process.exit(1);
}

// Session pooler — match Supabase CLI pooler host for this region (see `supabase db push` debug).
const client = new pg.Client({
  host: process.env.SUPABASE_DB_HOST ?? "aws-1-us-east-1.pooler.supabase.com",
  port: Number(process.env.SUPABASE_DB_PORT ?? 5432),
  user: process.env.SUPABASE_DB_USER ?? `postgres.${PROJECT_REF}`,
  password,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});

const TEST_FAN_EMAILS = [
  process.env.TEST_FAN_EMAIL,
  "joylewismusic+testdemo1@gmail.com",
  process.env.TEST_ARTIST_EMAIL,
].filter(Boolean);

async function main() {
  await client.connect();
  console.log("Connected to Postgres (remote).\n");

  // --- 1) is_preview_public default ---
  const { rows: defRows } = await client.query(`
    SELECT column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tracks'
      AND column_name = 'is_preview_public'
  `);
  const currentDefault = defRows[0]?.column_default ?? null;
  console.log("[tracks.is_preview_public] information_schema.column_default:", currentDefault ?? "(null)");

  const looksTrue =
    currentDefault &&
    (String(currentDefault).toLowerCase().includes("true") ||
      String(currentDefault) === "true");

  if (!looksTrue) {
    console.log("Applying: ALTER COLUMN is_preview_public SET DEFAULT true");
    await client.query(
      `ALTER TABLE public.tracks ALTER COLUMN is_preview_public SET DEFAULT true`
    );
    console.log("Applied.");
  } else {
    console.log("Default already true (or equivalent); no ALTER needed.");
  }

  // --- 2) vault_members: show candidates ---
  const { rows: before } = await client.query(
    `SELECT email, vault_access_active FROM public.vault_members
     WHERE lower(email) = ANY($1::text[])`,
    [TEST_FAN_EMAILS.map((e) => e.toLowerCase())]
  );
  console.log("\n[vault_members] rows for test emails (before):");
  console.table(before);

  const { rowCount } = await client.query(
    `UPDATE public.vault_members
     SET vault_access_active = true
     WHERE lower(email) = ANY($1::text[])
       AND vault_access_active = false`,
    [TEST_FAN_EMAILS.map((e) => e.toLowerCase())]
  );
  console.log(`\n[vault_members] updated rows: ${rowCount}`);

  const { rows: after } = await client.query(
    `SELECT email, vault_access_active FROM public.vault_members
     WHERE lower(email) = ANY($1::text[])`,
    [TEST_FAN_EMAILS.map((e) => e.toLowerCase())]
  );
  console.log("[vault_members] rows for test emails (after):");
  console.table(after);

  await client.end();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
