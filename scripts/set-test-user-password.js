#!/usr/bin/env node
/**
 * Set password for test user using Supabase Admin API
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
  console.error('Error loading .env:', error.message);
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEW_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nSet in .env:');
  console.error('  VITE_SUPABASE_URL=https://your-project.supabase.co');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setPassword() {
  const email = 'demo-fan@test.com';
  const userId = 'db9c713b-df72-4dc2-b535-6ebfdc1cce45'; // Known UUID from migration
  const newPassword = 'FanTest2026!';

  console.log(`\n🔐 Setting password for ${email}...\n`);

  // Try to update by known UUID first
  console.log(`Attempting to update user by ID: ${userId}...`);
  const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
    userId,
    { 
      password: newPassword,
      email_confirm: true
    }
  );

  if (!updateError && updateData?.user) {
    console.log('✅ Password updated successfully using user ID!\n');
    console.log(`   Email: ${updateData.user.email}`);
    console.log(`   User ID: ${updateData.user.id}`);
    console.log(`   Password: ${newPassword}\n`);
    
    // Test authentication
    console.log('🧪 Testing authentication...');
    const testClient = createClient(
      SUPABASE_URL,
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || ''
    );
    
    const { data: signInData, error: signInError } = await testClient.auth.signInWithPassword({
      email,
      password: newPassword
    });

    if (signInError) {
      console.error('❌ Authentication test failed:', signInError.message);
    } else {
      console.log('✅ Authentication test passed!');
      console.log(`   Session token: ${signInData.session?.access_token?.substring(0, 20)}...\n`);
    }
    return;
  }

  // Fallback: Try to find user by listing
  console.log('⚠️  Direct update failed, trying to find user by email...');
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('❌ Error listing users:', listError);
    if (updateError) {
      console.error('   Also had update error:', updateError.message);
    }
    return;
  }

  const user = usersData.users.find(u => u.email === email);
  
  if (!user) {
    console.log(`⚠️  User ${email} not found. Creating new user...\n`);
    
    // Create the user
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: email,
      password: newPassword,
      email_confirm: true,
      user_metadata: {
        display_name: 'Demo Fan'
      }
    });

    if (createError) {
      console.error('❌ Error creating user:', createError);
    console.log('\nAvailable users:');
    if (usersData.users.length === 0) {
      console.log('   (No users found)');
    } else {
      usersData.users.forEach(u => {
        console.log(`   - ${u.email} (${u.id})`);
      });
    }
    console.log('\n💡 Tip: The user might need to be created via SQL with the specific UUID');
    console.log('   from the migration. Check supabase/export/create-auth-users-safe.sql');
    return;
    }

    console.log('✅ User created successfully!');
    console.log(`   Email: ${createData.user.email}`);
    console.log(`   User ID: ${createData.user.id}`);
    console.log(`   Password: ${newPassword}\n`);
    
    // Test authentication
    console.log('🧪 Testing authentication...');
    const testClient = createClient(
      SUPABASE_URL,
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || ''
    );
    
    const { data: signInData, error: signInError } = await testClient.auth.signInWithPassword({
      email,
      password: newPassword
    });

    if (signInError) {
      console.error('❌ Authentication test failed:', signInError.message);
    } else {
      console.log('✅ Authentication test passed!');
      console.log(`   Session token: ${signInData.session?.access_token?.substring(0, 20)}...\n`);
    }
    return;
  }

  console.log(`✅ Found user: ${user.id}`);
  console.log(`   Email confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
  console.log(`   Created: ${user.created_at}\n`);

  // Update the user's password using Admin API
  console.log('Updating password...');
  const { data, error } = await supabase.auth.admin.updateUserById(
    user.id,
    { 
      password: newPassword,
      email_confirm: true  // Ensure email is confirmed
    }
  );

  if (error) {
    console.error('❌ Error updating password:', error);
    return;
  }

  console.log('✅ Password updated successfully!\n');
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${newPassword}`);
  console.log(`   User ID: ${data.user.id}\n`);
  
  // Test the password by trying to sign in
  console.log('🧪 Testing authentication...');
  const testClient = createClient(
    SUPABASE_URL,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || ''
  );
  
  const { data: signInData, error: signInError } = await testClient.auth.signInWithPassword({
    email,
    password: newPassword
  });

  if (signInError) {
    console.error('❌ Authentication test failed:', signInError.message);
  } else {
    console.log('✅ Authentication test passed!');
    console.log(`   Session token: ${signInData.session?.access_token?.substring(0, 20)}...\n`);
  }
}

setPassword().catch(console.error);
