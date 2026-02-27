

## Diagnosis

The `upload-part-proxy` function is **persistently failing to register** despite reporting successful deployment. Evidence:
- Deploy tool says "Successfully deployed" but curl consistently returns 404
- Edge function logs show repeated boot/shutdown cycles with **zero handler execution logs**
- The `initiate-multipart-upload` function (same `npm:@aws-sdk/client-s3@3.700.0` import) works perfectly

The critical difference: `upload-part-proxy` imports `@supabase/supabase-js@2.91.1` via esm.sh, while all working S3 functions use `@2.49.1`. This version mismatch likely causes a module resolution conflict during registration that silently fails.

## Fix

### Step 1: Align esm.sh import version
Change line 1 of `supabase/functions/upload-part-proxy/index.ts`:
```
- import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";
+ import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
```
This matches the working `initiate-multipart-upload` function exactly.

### Step 2: Deploy and verify
- Deploy `upload-part-proxy`
- Curl the endpoint to confirm it returns a non-404 response (e.g., 401 or 400)

### Step 3: If Step 1 fails, simplify further
Remove the Supabase auth check entirely and rely on the raw JWT Bearer token validation using a lightweight approach (just decode the JWT), eliminating the `esm.sh` import altogether. This would make the function boot faster and avoid any esm.sh-related registration issues.

