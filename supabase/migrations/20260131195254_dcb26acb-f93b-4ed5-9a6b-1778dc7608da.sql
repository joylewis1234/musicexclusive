-- Create function to check if email should be admin
CREATE OR REPLACE FUNCTION public.is_admin_email(email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email IN ('support@musicexclusive.co', 'tinytunesmusic@gmail.com')
$$;

-- Create function to auto-assign admin role on user creation/login
CREATE OR REPLACE FUNCTION public.ensure_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if this user should be admin
  IF public.is_admin_email(NEW.email) THEN
    -- Insert admin role if not exists
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users for new signups
DROP TRIGGER IF EXISTS on_auth_user_created_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_admin_role();

-- Also grant admin role to existing admin emails
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email IN ('support@musicexclusive.co', 'tinytunesmusic@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;