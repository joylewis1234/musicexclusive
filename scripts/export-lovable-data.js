import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file manually (no dependency needed)
function loadEnv() {
  try {
    const envPath = join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const lines = envContent.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const match = trimmed.match(/^([^#=]+)=(.*)$/);
          if (match) {
            const key = match[1].trim();
            let value = match[2].trim();
            // Remove quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) || 
                (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            }
            if (!process.env[key]) {
              process.env[key] = value;
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('⚠️  Could not read .env file:', err.message);
  }
}

loadEnv();

// Configuration - Get from .env or environment variables
const LOVABLE_SUPABASE_URL = process.env.LOVABLE_SUPABASE_URL || 
                             process.env.VITE_SUPABASE_URL || 
                             'https://yjytuglxpvdkyvjsdyfk.supabase.co';
                             
const LOVABLE_API_KEY = process.env.LOVABLE_SERVICE_ROLE_KEY || 
                        process.env.LOVABLE_ANON_KEY ||
                        process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!LOVABLE_API_KEY) {
  console.error('❌ Error: No API key found');
  console.error('\nLooking for one of these in .env:');
  console.error('  - VITE_SUPABASE_PUBLISHABLE_KEY');
  console.error('  - LOVABLE_ANON_KEY');
  console.error('  - LOVABLE_SERVICE_ROLE_KEY');
  console.error('\nOr set as environment variable:');
  console.error('  LOVABLE_ANON_KEY=your_key node scripts/export-lovable-data.js');
  process.exit(1);
}

const supabase = createClient(LOVABLE_SUPABASE_URL, LOVABLE_API_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Only tables with data (from Lovable's list)
const tables = [
  'vault_members',              // 4 rows
  'user_roles',                 // 6 rows
  'profiles',                   // 4 rows
  'artist_profiles',            // 2 rows
  'artist_applications',        // 4 rows
  'tracks',                     // 13 rows
  'credit_ledger',              // 148 rows
  'stream_ledger',              // 51 rows
  'stream_charges',             // 51 rows
  'stripe_events',              // 20 rows
  'artist_waitlist',            // 13 rows
  'fan_waitlist',               // 1 row
  'artist_invitations',         // 7 rows
  'fan_invites',                // 12 rows
  'agreement_acceptances',       // 1 row
  'artist_agreement_acceptances', // 3 rows
  'charts_bonus_cycles',         // 2 rows
  'track_likes',                // 2 rows
  'playback_sessions',          // 39 rows
  'playback_tokens',            // 39 rows
  'admin_action_logs',          // 42 rows
  'email_logs',                 // 2 rows
  'report_email_logs',          // 16 rows
  'invitation_email_logs',      // 4 rows
  'application_action_tokens',  // 6 rows
  'request_rate_limits',        // 18 rows
  // Skip: 'monitoring_events' (23,896 rows - diagnostic only)
];

function escapeSqlString(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  if (typeof value === 'object') {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  }
  // String
  return `'${String(value).replace(/'/g, "''")}'`;
}

function generateInsertSQL(tableName, rows) {
  if (rows.length === 0) return '';
  
  let sql = `\n-- ${tableName} (${rows.length} rows)\n`;
  
  for (const row of rows) {
    const columns = Object.keys(row).join(', ');
    const values = Object.values(row).map(escapeSqlString).join(', ');
    sql += `INSERT INTO ${tableName} (${columns}) VALUES (${values});\n`;
  }
  
  return sql;
}

async function exportTable(tableName) {
  console.log(`📦 Exporting ${tableName}...`);
  
  let allData = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;
  
  while (hasMore) {
    try {
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .range(from, from + pageSize - 1);
      
      if (error) {
        // Some tables might not be accessible with anon key due to RLS
        if (error.code === 'PGRST116' || error.message.includes('permission denied') || error.message.includes('RLS')) {
          console.log(`  ⚠️  Skipped (RLS restriction - need service_role key)`);
          return [];
        }
        console.error(`  ❌ Error: ${error.message}`);
        return [];
      }
      
      if (!data || data.length === 0) {
        hasMore = false;
        break;
      }
      
      allData = allData.concat(data);
      console.log(`  ✓ Fetched ${allData.length}${count ? ` / ${count}` : ''} rows...`);
      
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        from += pageSize;
      }
    } catch (err) {
      console.error(`  ❌ Error: ${err.message}`);
      hasMore = false;
    }
  }
  
  return allData;
}

async function exportAll() {
  console.log('🚀 Starting data export from Lovable Cloud...\n');
  console.log(`URL: ${LOVABLE_SUPABASE_URL}`);
  console.log(`Using: ${process.env.LOVABLE_SERVICE_ROLE_KEY ? 'Service Role Key' : 'Anon Key'}\n`);
  
  const exportData = {};
  const exportStats = {};
  
  for (const table of tables) {
    try {
      const data = await exportTable(table);
      exportData[table] = data;
      exportStats[table] = data.length;
      
      if (data.length > 0) {
        console.log(`  ✅ ${table}: ${data.length} rows exported\n`);
      } else {
        console.log(`  ⚠️  ${table}: No data or restricted\n`);
      }
    } catch (error) {
      console.error(`  ❌ ${table}: ${error.message}\n`);
      exportData[table] = [];
      exportStats[table] = 0;
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Save as JSON
  const jsonPath = join(__dirname, '..', 'supabase', 'export', 'lovable_data_export.json');
  fs.mkdirSync(join(__dirname, '..', 'supabase', 'export'), { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(exportData, null, 2));
  console.log(`\n✅ JSON export saved to: ${jsonPath}`);
  
  // Generate SQL INSERT statements
  let sql = `-- ============================================================\n`;
  sql += `-- Data Export from Lovable Cloud\n`;
  sql += `-- Generated: ${new Date().toISOString()}\n`;
  sql += `-- Source: ${LOVABLE_SUPABASE_URL}\n`;
  sql += `-- ============================================================\n\n`;
  sql += `-- IMPORTANT: Run this AFTER running full-schema.sql\n`;
  sql += `-- This file contains INSERT statements for all data\n\n`;
  
  // Disable triggers temporarily for faster import
  sql += `-- Temporarily disable triggers for faster import\n`;
  sql += `SET session_replication_role = 'replica';\n\n`;
  
  for (const [table, data] of Object.entries(exportData)) {
    if (data.length > 0) {
      sql += generateInsertSQL(table, data);
    }
  }
  
  // Re-enable triggers
  sql += `\n-- Re-enable triggers\n`;
  sql += `SET session_replication_role = 'origin';\n\n`;
  
  // Summary
  sql += `-- Export Summary:\n`;
  for (const [table, count] of Object.entries(exportStats)) {
    sql += `--   ${table}: ${count} rows\n`;
  }
  
  const sqlPath = join(__dirname, '..', 'supabase', 'export', 'lovable_data_export.sql');
  fs.writeFileSync(sqlPath, sql);
  console.log(`✅ SQL export saved to: ${sqlPath}`);
  
  // Print summary
  console.log(`\n📊 Export Summary:`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  const totalRows = Object.values(exportStats).reduce((sum, count) => sum + count, 0);
  const tablesWithData = Object.entries(exportStats).filter(([_, count]) => count > 0);
  
  for (const [table, count] of tablesWithData) {
    console.log(`  ${table.padEnd(35)} ${count.toString().padStart(6)} rows`);
  }
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  ${'TOTAL'.padEnd(35)} ${totalRows.toString().padStart(6)} rows`);
  console.log(`\n✨ Export complete!`);
  console.log(`\nNext steps:`);
  console.log(`1. Review the exported files in supabase/export/`);
  console.log(`2. Import the SQL file into your new Supabase project:`);
  console.log(`   psql "postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres" -f supabase/export/lovable_data_export.sql`);
}

exportAll().catch(console.error);
