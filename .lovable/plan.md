

## Upload Flow Verification — Current Status

### Client-Side Code: Correctly Configured

All upload-related client code routes to the external project:
- `SUPABASE_URL` → `https://esgpsapstljgsqpmezzf.supabase.co`
- `create-track-draft` call → `${SUPABASE_URL}/functions/v1/create-track-draft`
- `r2MultipartUpload` → calls `initiate-multipart-upload`, `sign-upload-part`, `complete-multipart-upload` via `${SUPABASE_URL}/functions/v1/...`
- localStorage fallback key → `sb-esgpsapstljgsqpmezzf-auth-token` (correct)

### Where the 401 Would Come From

Since the functions are deployed on your external project, the 401 depends on what code is running there. Two scenarios:

1. **If the external project has the original `Deno.env.get("SUPABASE_URL")` code**: JWT validation uses the external project's own env vars, which should match. This should work.

2. **If you deployed the updated code from this repo** (which imports `EXTERNAL_SUPABASE_URL`): The hardcoded URL also points to the external project, so it should also work.

### Recommended Next Steps (no code changes needed)

1. **Test the upload** by logging in as an artist and uploading a track in the preview.
2. **If 401 persists**, check the Edge Function logs on your external Supabase dashboard for `create-track-draft` — specifically what `getClaims()` returns.
3. **Verify** that `verify_jwt = false` is set in the external project's `config.toml` for all upload-related functions. If `verify_jwt = true`, the external project's gateway rejects the token before the function code even runs.

### No Code Changes Required

The Lovable codebase is correctly configured. The 401 diagnosis is now an external project deployment/configuration issue.

