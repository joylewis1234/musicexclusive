
-- Trigger: sync profiles.display_name → vault_members.display_name
CREATE OR REPLACE FUNCTION public.sync_profile_name_to_vault()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE vault_members
  SET display_name = NEW.display_name
  WHERE email = (
    SELECT email FROM auth.users WHERE id = NEW.user_id LIMIT 1
  )
  AND NEW.display_name IS NOT NULL
  AND NEW.display_name <> '';
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_profile_display_name
AFTER UPDATE OF display_name ON public.profiles
FOR EACH ROW
WHEN (OLD.display_name IS DISTINCT FROM NEW.display_name)
EXECUTE FUNCTION public.sync_profile_name_to_vault();

-- One-time sync of existing data
UPDATE vault_members vm
SET display_name = p.display_name
FROM profiles p
JOIN auth.users u ON u.id = p.user_id
WHERE u.email = vm.email
AND p.display_name IS NOT NULL
AND p.display_name <> ''
AND p.display_name <> vm.display_name;
