

## Investigation: 401/Invalid Token on Song Upload

### Root Cause

The upload flow has a **JWT issuer mismatch** between the client and the Edge Functions:

1. **Client auth** connects to the **external Supabase** (`esgpsapstljgsqpmezzf.supabase.co`) via the Vite alias redirecting all imports to `custom-client.ts`. The user's JWT is signed by the external project's JWT secret.

2. **Edge Functions** are deployed on **Lovable Cloud** (`yjytuglxpvdkyvjsdyfk.supabase.co`). When the upload code calls `${SUPABASE_URL}/functions/v1/create-track-draft`, it correctly hits the external project's URL. However, the Edge Functions themselves run on Lovable Cloud and use `Deno.env.get("SUPABASE_URL")` / `Deno.env.get("SUPABASE_ANON_KEY")` which point to the Lovable Cloud instance.

3. The `create-track-draft` function creates a Supabase client with `SUPABASE_URL` + `SUPABASE_ANON_KEY` from Deno env (Lovable Cloud), then calls `supabaseAuth.auth.getClaims(token)` — but the token was issued by the **external** project. The JWT secret doesn't match, so validation fails with 401.

**In short:** The client sends JWTs signed by the external project, but the Edge Functions validate them against Lovable Cloud's JWT secret.

### Secondary Issue

Line 228 of `useTrackUpload.ts` has a hardcoded localStorage key `sb-yjytuglxpvdkyvjsdyfk-auth-token` (Lovable Cloud project ID) instead of the external project ID `esgpsapstljgsqpmezzf`. This localStorage fallback will never find a token.

### Fix Options

**Option A: Update Edge Function secrets** (recommended)
- Set the `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` secrets on Lovable Cloud to point to the **external** project. This way the Edge Functions validate JWTs against the correct issuer and query the correct database.
- This affects ALL 48 Edge Functions, so it must be done carefully.

**Option B: Proxy auth in Edge Functions**
- Modify upload-related Edge Functions (`create-track-draft`, `initiate-multipart-upload`, `sign-upload-part`, `complete-multipart-upload`) to use the external project's credentials (hardcoded or via separate secrets like `EXTERNAL_SUPABASE_URL`, `EXTERNAL_SUPABASE_ANON_KEY`, `EXTERNAL_SUPABASE_SERVICE_ROLE_KEY`) for JWT validation and DB queries.

**Option C: Route Edge Function calls to Lovable Cloud**
- Change the upload code to call Edge Functions on Lovable Cloud's URL instead of the external project, and have users authenticate against Lovable Cloud for uploads. This contradicts the current architecture.

### Recommended Plan (Option B — surgical fix)

1. **Add 3 new secrets** to Lovable Cloud:
   - `EXTERNAL_SUPABASE_URL` = `https://esgpsapstljgsqpmezzf.supabase.co`
   - `EXTERNAL_SUPABASE_ANON_KEY` = the external anon key
   - `EXTERNAL_SUPABASE_SERVICE_ROLE_KEY` = the external service role key

2. **Update these Edge Functions** to use the external credentials for auth validation and DB queries:
   - `create-track-draft`
   - `initiate-multipart-upload`
   - `sign-upload-part`
   - `complete-multipart-upload`

3. **Fix localStorage fallback** in `useTrackUpload.ts` line 228:
   - Change `sb-yjytuglxpvdkyvjsdyfk-auth-token` to `sb-esgpsapstljgsqpmezzf-auth-token`

### Important Consideration

Before proceeding, we need to decide: **Are the existing Lovable Cloud secrets (`SUPABASE_URL`, etc.) already pointing to the external project?** If they were updated during the migration, Option A would already work and no Edge Function changes are needed — the 401 would be caused by something else (like a stale/expired token). We should verify the current secret values first.

