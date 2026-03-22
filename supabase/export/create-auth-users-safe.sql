-- ============================================================
-- Create Auth Users with Specific UUIDs (Safe Version)
-- Run this in Supabase SQL Editor AFTER running full-schema.sql
-- AND after running fix-trigger.sql
-- ============================================================
-- This version checks if users exist first and handles conflicts
-- ============================================================

-- First, fix the trigger to handle conflicts
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Check if users already exist
DO $$
BEGIN
  RAISE NOTICE 'Checking for existing users...';
END $$;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = '558ee15a-a018-4bdb-9ab0-d071444d168f') 
    THEN 'User support@musicexclusive.co already exists'
    ELSE 'User support@musicexclusive.co does not exist'
  END as status
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = 'db9c713b-df72-4dc2-b535-6ebfdc1cce45') 
    THEN 'User demo-fan@test.com already exists'
    ELSE 'User demo-fan@test.com does not exist'
  END
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = 'ba5df0b2-8bb9-41f2-b1ad-4e2c97868448') 
    THEN 'User joylewismusic+testdemo1@gmail.com already exists'
    ELSE 'User joylewismusic+testdemo1@gmail.com does not exist'
  END
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = 'b429eeb1-88c3-48df-a023-f345fee49912') 
    THEN 'User test-artist+validation@example.com already exists'
    ELSE 'User test-artist+validation@example.com does not exist'
  END;

-- Create auth users with specific UUIDs (from data-migration.sql)
-- Update passwords before running!

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
  crypt('SET_PASSWORD_HERE', gen_salt('bf')), -- ⚠️ UPDATE THIS PASSWORD
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
  crypt('SET_PASSWORD_HERE', gen_salt('bf')), -- ⚠️ UPDATE THIS PASSWORD
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
  crypt('SET_PASSWORD_HERE', gen_salt('bf')), -- ⚠️ UPDATE THIS PASSWORD
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

-- Verify profiles exist (should be created by trigger)
SELECT user_id, display_name 
FROM public.profiles 
WHERE user_id IN (
  '558ee15a-a018-4bdb-9ab0-d071444d168f',
  'db9c713b-df72-4dc2-b535-6ebfdc1cce45',
  'ba5df0b2-8bb9-41f2-b1ad-4e2c97868448',
  'b429eeb1-88c3-48df-a023-f345fee49912'
)
ORDER BY display_name;
