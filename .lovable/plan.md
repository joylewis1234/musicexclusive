

# Fix: Share Feature Querying Wrong Database

## Problem
All sharing and inbox components import `supabase` from `@/integrations/supabase/client` (Lovable Cloud project), but all vault member data lives on the **external** Supabase project (`esgpsapstljgsqpmezzf`). The Lovable Cloud `vault_members` table only has 2 active members (`support@musicexclusive.co` and `demo-fan@test.com`), so after excluding the current user, the list appears empty.

## Root Cause
Four files use the wrong Supabase client import:

1. `src/components/profile/ShareExclusiveTrackModal.tsx` — line 13
2. `src/components/ShareTrackModal.tsx` — line 13
3. `src/components/profile/ShareArtistProfileModal.tsx` — line 12
4. `src/hooks/useUnreadInboxCount.ts` — line 2
5. `src/pages/FanInbox.tsx` — line 7

## Fix
In all five files, change the import from:
```ts
import { supabase } from "@/integrations/supabase/client";
```
to:
```ts
import { supabase } from "@/integrations/supabase/custom-client";
```

This is a one-line change per file. No backend changes needed. The custom client points to the external project where all real vault member, shared track, and shared artist profile data lives.

## Impact
- Share modals will query the correct database and show real vault members
- Inbox will load shared tracks/artists from the correct database
- Unread badge count will reflect actual data
- No effect on any other components or backend functions

