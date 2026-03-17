
Goal: Resolve persistent `initiate-multipart-upload failed (401): {"code":401,"message":"Invalid JWT"}` in the artist upload flow.

What I found
- The failure happens after `create-track-draft` succeeds (`200`) and before multipart begins.
- Response shape is gateway-style (`code/message`), which means the request is rejected before function logic runs.
- In this repo, `supabase/config.toml` is missing:
  - `[functions.initiate-multipart-upload]`
  - `verify_jwt = false`
- Other upload functions (`sign-upload-part`, `complete-multipart-upload`) are already set to `verify_jwt = false`.
- `supabase/export/config.toml` already includes `initiate-multipart-upload` with `verify_jwt = false`, so local/runtime config is out of sync.

Implementation plan
1. Fix function gateway auth config
- Add `[functions.initiate-multipart-upload] verify_jwt = false` to `supabase/config.toml`.
- Keep existing manual auth validation in function code (required when `verify_jwt = false`).

2. Normalize JWT validation across multipart functions
- Align `initiate-multipart-upload`, `sign-upload-part`, and `complete-multipart-upload` to the same explicit JWT validation style (`Authorization` extraction + claims/user validation) for consistent behavior and logs.
- Keep validation against the external project credentials currently used by these functions.

3. External deployment alignment (critical for your setup)
- Redeploy `initiate-multipart-upload` on the external project with JWT gateway verification disabled (matching config).
- Redeploy `sign-upload-part` and `complete-multipart-upload` only if auth logic is updated in step 2.

4. End-to-end verification checklist
- Re-run artist upload with cover + full audio + preview.
- Confirm network sequence:
  - `create-track-draft` → 200
  - 3x `initiate-multipart-upload` → 200 (each returns `uploadId`/`key`)
  - `sign-upload-part`/R2 PUT/`complete-multipart-upload` → 200
- Confirm track record updates to keys + `status=ready`.

Technical details
- No database schema/RLS changes required.
- Root cause is function gateway JWT verification mismatch for `initiate-multipart-upload` (config/deployment), not client token generation.
- Current console `ref` warning in `UploadProgressBar` is unrelated to this 401 and can be handled separately after upload is unblocked.
