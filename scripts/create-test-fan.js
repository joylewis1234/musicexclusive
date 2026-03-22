#!/usr/bin/env node
/**
 * Create test fan user using the create-test-fan edge function
 */

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

const FUNCTIONS_URL = SUPABASE_URL.replace(/\/$/, '').replace(/\.supabase\.co$/, '.functions.supabase.co');

async function createTestFan() {
  const email = 'demo-fan@test.com';
  const displayName = 'Demo Fan';
  const credits = 100;

  console.log(`\n👤 Creating test fan user...\n`);
  console.log(`   Email: ${email}`);
  console.log(`   Display Name: ${displayName}`);
  console.log(`   Credits: ${credits}\n`);

  try {
    const response = await fetch(`${FUNCTIONS_URL}/create-test-fan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({
        email,
        display_name: displayName,
        credits
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Error creating user:', data.error || data);
      return;
    }

    console.log('✅ User created successfully!\n');
    console.log('Response:', JSON.stringify(data, null, 2));
    console.log('\n💡 The password was auto-generated. Check the function response above.');
    console.log('   Or use the Supabase Dashboard to reset the password.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createTestFan();
