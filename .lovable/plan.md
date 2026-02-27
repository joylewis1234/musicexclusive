

## Plan: Replace direct R2 uploads with edge function proxy

### Step 1: Create `supabase/functions/upload-part-proxy/index.ts`
New edge function that receives binary chunk data + metadata via query params, authenticates the caller, and uploads the part to R2 server-side using `UploadPartCommand`. Returns `{ etag }`.

### Step 2: Update `src/utils/r2MultipartUpload.ts`
- Replace `uploadPartWithRetry` to call `upload-part-proxy` instead of fetching a presigned URL and PUTting directly to R2
- Remove the `sign-upload-part` call in the upload loop — chunks go directly through the proxy
- Pass `uploadId`, `key`, `partNumber` as query params; send raw binary as POST body

### Step 3: Delete `supabase/functions/sign-upload-part/index.ts`
No longer needed since parts are uploaded through the proxy.

### Step 4: Update `supabase/config.toml`
- Add `[functions.upload-part-proxy]` with `verify_jwt = false`
- Remove `[functions.sign-upload-part]` entry

### Technical notes
- `initiate-multipart-upload` and `complete-multipart-upload` remain unchanged
- Resume support (localStorage) unchanged — same `completedParts` tracking
- Retry logic preserved with exponential backoff (250ms × attempt)
- Edge functions accept up to ~100MB bodies; 5MB chunks are safe

