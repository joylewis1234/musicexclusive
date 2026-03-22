#!/usr/bin/env node
/**
 * Test authentication directly
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');

// Load .env
try {
  const envFile = readFileSync(envPath, 'utf-8');
  envFile.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
} catch (error) {
  // Ignore
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('❌ Missing SUPABASE_URL or ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function testAuth() {
  const email = 'demo-fan@test.com';
  const password = 'FanTest2026!';

  console.log(`\n🧪 Testing authentication for ${email}...\n`);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('❌ Authentication failed:');
      console.error(`   Error: ${error.message}`);
      console.error(`   Status: ${error.status}`);
      console.error(`   Code: ${error.code || 'N/A'}\n`);
      
      // Try with different password variations
      console.log('💡 The password hash might not be compatible.');
      console.log('   Try updating the password using SQL with a fresh hash:\n');
      console.log('   UPDATE auth.users');
      console.log('   SET encrypted_password = crypt(\'FanTest2026!\', gen_salt(\'bf\'))');
      console.log('   WHERE email = \'demo-fan@test.com\';\n');
      
      return;
    }

    if (data.session) {
      console.log('✅ Authentication successful!\n');
      console.log(`   User ID: ${data.user.id}`);
      console.log(`   Email: ${data.user.email}`);
      console.log(`   Access Token: ${data.session.access_token.substring(0, 30)}...\n`);
      return data.session.access_token;
    } else {
      console.error('❌ No session returned');
      return null;
    }
  } catch (err) {
    console.error('❌ Exception:', err.message);
    return null;
  }
}

testAuth();
