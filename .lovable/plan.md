

## Diagnosis: `upload-part-proxy` is NOT deployed

The function code exists at `supabase/functions/upload-part-proxy/index.ts` and the client correctly calls it, but a direct test confirms it returns **404 "Requested function was not found"**.

The earlier boot logs were from a transient deployment that didn't persist.

## Fix

**Step 1: Deploy `upload-part-proxy`**
- Trigger a deployment of the edge function so it becomes reachable at `/functions/v1/upload-part-proxy`.

**Step 2: Verify deployment**
- Curl the function to confirm it returns a non-404 response (e.g., 401 Unauthorized without a valid token is fine — it means the function is live).

**Step 3: Re-test upload**
- Retry the track upload from the artist upload page to confirm chunks flow through the proxy successfully.

