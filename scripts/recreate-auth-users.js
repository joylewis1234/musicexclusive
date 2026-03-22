import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file
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

const NEW_SUPABASE_URL = process.env.NEW_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const NEW_SERVICE_ROLE_KEY = process.env.NEW_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!NEW_SUPABASE_URL || !NEW_SERVICE_ROLE_KEY) {
  console.error('❌ Error: NEW_SUPABASE_URL and NEW_SUPABASE_SERVICE_ROLE_KEY required');
  console.error('\nSet in .env:');
  console.error('  NEW_SUPABASE_URL=https://your-new-project.supabase.co');
  console.error('  NEW_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  console.error('\nOr use existing VITE_SUPABASE_URL and set NEW_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(NEW_SUPABASE_URL, NEW_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Users to recreate with SPECIFIC UUIDs from data-migration.sql
// These UUIDs must match exactly for foreign keys to work
const users = [
  {
    email: 'support@musicexclusive.co',
    password: 'Debtfree99!', // You'll need to set this
    display_name: 'support@musicexclusive.co',
    roles: ['admin'],
    uuid: '558ee15a-a018-4bdb-9ab0-d071444d168f' // From data-migration.sql
  },
  {
    email: 'demo-fan@test.com',
    password: 'FanTest2026!', // Known password
    display_name: 'Demo Fan',
    roles: ['fan'],
    uuid: 'db9c713b-df72-4dc2-b535-6ebfdc1cce45' // From data-migration.sql
  },
  {
    email: 'joylewismusic+testdemo1@gmail.com',
    password: 'Debtfree12345!!', // You'll need to set this
    display_name: 'joylewismusic+testdemo1',
    roles: ['artist', 'fan'],
    uuid: 'ba5df0b2-8bb9-41f2-b1ad-4e2c97868448' // From data-migration.sql
  },
  {
    email: 'test-artist+validation@example.com',
    password: 'TestPass1772210292411!', // You'll need to set this
    display_name: 'test-artist+validation',
    roles: ['artist', 'fan'],
    uuid: 'b429eeb1-88c3-48df-a023-f345fee49912' // From data-migration.sql
  }
];

async function recreateUsers() {
  console.log('🚀 Recreating auth users with specific UUIDs...\n');
  console.log(`Supabase URL: ${NEW_SUPABASE_URL}\n`);
  console.log('⚠️  IMPORTANT: These UUIDs must match data-migration.sql exactly!\n');
  
  const userMap = {}; // email -> { auth_id, roles }
  
  for (const user of users) {
    if (user.password === 'SET_PASSWORD_HERE') {
      console.log(`⚠️  Skipping ${user.email} - password not set`);
      console.log(`   UUID: ${user.uuid}`);
      continue;
    }
    
    try {
      // Check if user already exists
      const { data: existingUser } = await supabase.auth.admin.getUserById(user.uuid);
      if (existingUser?.user) {
        console.log(`ℹ️  User ${user.email} already exists with UUID ${user.uuid}`);
        userMap[user.email] = { auth_id: existingUser.user.id, roles: user.roles };
        
        // Verify UUID matches
        if (existingUser.user.id === user.uuid) {
          console.log(`   ✅ UUID matches expected value`);
        } else {
          console.log(`   ⚠️  UUID mismatch! Expected ${user.uuid}, got ${existingUser.user.id}`);
        }
        
        // Create user_roles if they don't exist
        for (const role of user.roles) {
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({ user_id: existingUser.user.id, role });
          
          if (roleError) {
            if (roleError.message.includes('duplicate') || roleError.message.includes('unique')) {
              console.log(`   ℹ️  Role ${role} already exists`);
            } else {
              console.error(`   ⚠️  Failed to set role ${role}:`, roleError.message);
            }
          } else {
            console.log(`   ✅ Set role: ${role}`);
          }
        }
        console.log('');
        continue;
      }
      
      // Supabase Admin API doesn't support custom UUIDs directly
      // We need to create the user first, then check if UUID matches
      // If not, we'll need to use SQL (see create-auth-users.sql)
      
      console.log(`   Attempting to create ${user.email}...`);
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { display_name: user.display_name }
      });
      
      if (authError) {
        // Check if user already exists
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existing = existingUsers?.users?.find(u => u.email === user.email);
        
        if (existing) {
          console.log(`   ℹ️  User ${user.email} already exists`);
          console.log(`   Current UUID: ${existing.id}`);
          console.log(`   Expected UUID: ${user.uuid}`);
          
          if (existing.id === user.uuid) {
            console.log(`   ✅ UUID matches!`);
            userMap[user.email] = { auth_id: existing.id, roles: user.roles };
          } else {
            console.error(`   ❌ UUID mismatch!`);
            console.error(`   ⚠️  You need to delete this user and recreate with correct UUID`);
            console.error(`   Or use SQL script: supabase/export/create-auth-users.sql`);
            console.log('');
            continue;
          }
        } else {
          console.error(`❌ Failed to create ${user.email}:`, authError.message);
          console.error(`   Error details:`, JSON.stringify(authError, null, 2));
          console.log('');
          continue;
        }
      } else {
        // User was created - check UUID
        console.log(`   ✅ User created with UUID: ${authData.user.id}`);
        console.log(`   Expected UUID: ${user.uuid}`);
        
        if (authData.user.id === user.uuid) {
          console.log(`   ✅ UUID matches perfectly!`);
          userMap[user.email] = { auth_id: authData.user.id, roles: user.roles };
        } else {
          console.error(`   ❌ UUID mismatch!`);
          console.error(`   ⚠️  Supabase Admin API doesn't support custom UUIDs`);
          console.error(`   You need to use SQL: supabase/export/create-auth-users.sql`);
          console.log(`   Or delete user ${authData.user.id} and use SQL method`);
          // Delete the incorrectly created user
          await supabase.auth.admin.deleteUser(authData.user.id);
          console.log(`   Deleted incorrectly created user`);
          console.log('');
          continue;
        }
      }
      
      console.log(`✅ Created auth user: ${user.email}`);
      console.log(`   UUID: ${authData.user.id}`);
      console.log(`   Expected: ${user.uuid}`);
      
      if (authData.user.id !== user.uuid) {
        console.error(`   ⚠️  WARNING: UUID mismatch! Expected ${user.uuid}, got ${authData.user.id}`);
      }
      
      userMap[user.email] = { auth_id: authData.user.id, roles: user.roles };
      
      // Create user_roles (these will be in data-migration.sql, but creating here too)
      for (const role of user.roles) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({ user_id: authData.user.id, role });
        
        if (roleError) {
          if (roleError.message.includes('duplicate') || roleError.message.includes('unique')) {
            console.log(`   ℹ️  Role ${role} already exists`);
          } else {
            console.error(`   ⚠️  Failed to set role ${role}:`, roleError.message);
          }
        } else {
          console.log(`   ✅ Set role: ${role}`);
        }
      }
      
      console.log('');
      
    } catch (error) {
      console.error(`❌ Error with ${user.email}:`, error.message);
      console.log('');
    }
  }
  
  console.log('✅ User creation complete!');
  console.log('\n📋 User ID Mapping:');
  for (const [email, info] of Object.entries(userMap)) {
    console.log(`  ${email.padEnd(40)} ${info.auth_id} (${info.roles.join(', ')})`);
  }
  
  // Verify UUIDs match expected
  console.log('\n🔍 UUID Verification:');
  let allMatch = true;
  for (const user of users) {
    if (userMap[user.email]) {
      const matches = userMap[user.email].auth_id === user.uuid;
      if (matches) {
        console.log(`  ✅ ${user.email}: UUID matches`);
      } else {
        console.log(`  ❌ ${user.email}: UUID mismatch!`);
        console.log(`     Expected: ${user.uuid}`);
        console.log(`     Got:      ${userMap[user.email].auth_id}`);
        allMatch = false;
      }
    }
  }
  
  if (allMatch && Object.keys(userMap).length === users.filter(u => u.password !== 'SET_PASSWORD_HERE').length) {
    console.log('\n✨ All UUIDs match! Ready to run data-migration.sql');
  } else {
    console.log('\n⚠️  Some UUIDs may not match. Review before running data-migration.sql');
  }
  
  // Save mapping to file
  const mappingPath = join(__dirname, '..', 'supabase', 'export', 'user_id_mapping.json');
  fs.mkdirSync(join(__dirname, '..', 'supabase', 'export'), { recursive: true });
  fs.writeFileSync(mappingPath, JSON.stringify(userMap, null, 2));
  console.log(`\n💾 User mapping saved to: ${mappingPath}`);
}

recreateUsers().catch(console.error);
