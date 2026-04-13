

## Plan: Fix ExclusivityBanner Supabase import

**File: `src/components/artist/ExclusivityBanner.tsx` (line 15)**

Change:
```typescript
import { supabase } from "@/integrations/supabase/client";
```
To:
```typescript
import { supabase } from "@/integrations/supabase/custom-client";
```

This ensures "Keep on Platform" and "Remove Track" actions write `exclusivity_decision` to the production database, stopping the `check-exclusivity` edge function from re-sending emails for tracks already decided.

