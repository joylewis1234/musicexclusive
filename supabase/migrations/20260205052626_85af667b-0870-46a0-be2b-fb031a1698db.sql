-- Move pg_net extension out of public schema (linter warning)
BEGIN;

CREATE SCHEMA IF NOT EXISTS extensions;

-- Recreate pg_net with the correct extension namespace.
-- We drop/recreate because ALTER EXTENSION SET SCHEMA can be blocked in some managed environments.
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

NOTIFY pgrst, 'reload schema';

COMMIT;