

## Connect to External Supabase

Since `src/integrations/supabase/client.ts` and `.env` are auto-managed by Lovable Cloud and cannot be edited, the cleanest approach is to **hardcode your external Supabase credentials as overrides** in the client file's import chain.

### Approach

Create a config file `src/config/supabase.ts` that exports your external Supabase URL, key, and project ID. Then update the ~17 files that reference `import.meta.env.VITE_SUPABASE_*` to import from this config instead. The auto-generated `client.ts` cannot be changed, so we'll also create a **new client wrapper** that the rest of the app imports.

### Changes

**1. Create `src/config/supabase.ts`** — Central config with your credentials:
```ts
export const SUPABASE_URL = "https://esgpsapstljgsqpmezzf.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_ProQ__HUKwiZsW4xQWKCZQ_GiEjQBFy";
export const SUPABASE_PROJECT_ID = "esgpsapstljgsqpmezzf";
```

**2. Create `src/integrations/supabase/custom-client.ts`** — New client pointing at your project:
```ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/config/supabase';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { storage: localStorage, persistSession: true, autoRefreshToken: true }
});
```

**3. Update all imports across ~17 files** — Change:
- `import { supabase } from "@/integrations/supabase/client"` → `from "@/integrations/supabase/custom-client"`
- `import.meta.env.VITE_SUPABASE_URL` → `SUPABASE_URL` (from config)
- `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY` → `SUPABASE_ANON_KEY` (from config)
- `import.meta.env.VITE_SUPABASE_PROJECT_ID` → `SUPABASE_PROJECT_ID` (from config)

### Files to update (imports)

Every file importing from `@/integrations/supabase/client` (contexts, hooks, pages, components — roughly 40+ files) plus the 17 files that directly reference `import.meta.env.VITE_SUPABASE_*`.

### Note on anon key

The anon key `sb_publishable_ProQ__...` is a **public/publishable** key by design — it's safe to include in source code. Security is enforced by RLS policies on the database side.

