-- ============================================================
-- Create Auth Users with Specific UUIDs
-- Run this in Supabase SQL Editor AFTER running full-schema.sql
-- ============================================================
-- IMPORTANT: This requires super admin access to auth.users
-- If this doesn't work, you may need to use Supabase's admin API
-- or contact Supabase support
-- ============================================================

-- Create auth users with specific UUIDs (from data-migration.sql)
-- Note: You'll need to set passwords after creation or use Supabase Admin API

-- User 1: support@musicexclusive.co (admin)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '558ee15a-a018-4bdb-9ab0-d071444d168f',
  '00000000-0000-0000-0000-000000000000',
  'support@musicexclusive.co',
  crypt('SET_PASSWORD_HERE', gen_salt('bf')), -- You'll need to set this
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"display_name":"support@musicexclusive.co"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- User 2: demo-fan@test.com (fan)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  'db9c713b-df72-4dc2-b535-6ebfdc1cce45',
  '00000000-0000-0000-0000-000000000000',
  'demo-fan@test.com',
  crypt('FanTest2026!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"display_name":"Demo Fan"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- User 3: joylewismusic+testdemo1@gmail.com (artist + fan)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  'ba5df0b2-8bb9-41f2-b1ad-4e2c97868448',
  '00000000-0000-0000-0000-000000000000',
  'joylewismusic+testdemo1@gmail.com',
  crypt('SET_PASSWORD_HERE', gen_salt('bf')), -- You'll need to set this
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"display_name":"joylewismusic+testdemo1"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- User 4: test-artist+validation@example.com (artist + fan)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  'b429eeb1-88c3-48df-a023-f345fee49912',
  '00000000-0000-0000-0000-000000000000',
  'test-artist+validation@example.com',
  crypt('SET_PASSWORD_HERE', gen_salt('bf')), -- You'll need to set this
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"display_name":"test-artist+validation"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- Verify users were created
SELECT id, email, email_confirmed_at, created_at 
FROM auth.users 
WHERE id IN (
  '558ee15a-a018-4bdb-9ab0-d071444d168f',
  'db9c713b-df72-4dc2-b535-6ebfdc1cce45',
  'ba5df0b2-8bb9-41f2-b1ad-4e2c97868448',
  'b429eeb1-88c3-48df-a023-f345fee49912'
)
ORDER BY email;
