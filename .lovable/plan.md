

## Plan: Switch back to presigned PUT uploads

The `sign-upload-part` edge function was fully deleted previously. It needs to be recreated from scratch.

### Step 1: Create `supabase/functions/sign-upload-part/index.ts`
New edge function that:
- Authenticates the caller via Supabase JWT
- Accepts JSON body: `{ uploadId, key, partNumber }`
- Uses `@aws-sdk/s3-request-presigner` + `UploadPartCommand` to generate a presigned PUT URL (expires in 600s)
- Returns `{ presignedUrl }` to the client
- Uses same imports/patterns as `initiate-multipart-upload` (`@supabase/supabase-js@2.49.1`, `npm:@aws-sdk/client-s3@3.700.0`)

### Step 2: Update `supabase/config.toml`
- Add `[functions.sign-upload-part]` with `verify_jwt = false`
- Keep `[functions.upload-part-proxy]` (still deployed, just unused)

### Step 3: Revert `src/utils/r2MultipartUpload.ts` `uploadPartWithRetry`
Change from proxy POST to:
1. Call `sign-upload-part` edge function with `{ uploadId, key, partNumber }` to get `presignedUrl`
2. `fetch(presignedUrl, { method: "PUT", body: chunk })` directly to R2
3. Extract `ETag` from response headers
4. Same retry logic preserved

### Technical notes
- `initiate-multipart-upload` and `complete-multipart-upload` unchanged
- Resume support unchanged
- `upload-part-proxy` stays deployed but dormant — no code deleted

