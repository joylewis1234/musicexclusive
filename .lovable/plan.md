

## Add Playback Session JWT to `mint-playback-url`

### Overview
Extend the existing edge function to mint a short-lived playback session JWT alongside the signed R2 URL. This JWT will be used by the Cloudflare Worker gate to validate playback requests.

### Step 1 -- Add `PLAYBACK_JWT_SECRET` secret
Use the secrets tool to prompt you to enter a secret value for `PLAYBACK_JWT_SECRET`. This should be a random string (32+ chars) shared between the edge function and the Cloudflare Worker.

### Step 2 -- Update `supabase/functions/mint-playback-url/index.ts`

**Add constants and helpers after the existing presign helpers (after line 73):**
- `SESSION_TTL_SECONDS = 300`
- `base64url()` helper for URL-safe base64 encoding
- `signJwtHS256()` to create an HS256-signed JWT using Web Crypto

**Add session minting logic after access checks (after line 174, before "Resolve key"):**
- Generate a `sessionId` via `crypto.randomUUID()`
- Compute `sessionExpiresAt` from `SESSION_TTL_SECONDS`
- Read `PLAYBACK_JWT_SECRET` from env (return 500 if missing)
- Sign a JWT containing `track_id`, `user_id`, `session_id`, `expires_at`, `exp`, `iat`

**Update the success response (line 194):**
- Add `sessionToken` and `session` object (`track_id`, `user_id`, `session_id`, `expires_at`) to the JSON response
- Existing `url` and `expiresAt` fields remain unchanged

### Step 3 -- Deploy the edge function

### What does NOT change
- All existing access checks, signed URL logic, and error handling remain intact
- Client hooks (`useAudioPlayer`, `useSignedArtworkUrl`) are not modified in this step -- they will simply receive extra fields in the response that they can ignore for now
- No database changes

### Technical details

The session JWT payload:
```json
{
  "track_id": "<uuid>",
  "user_id": "<uuid>",
  "session_id": "<uuid>",
  "expires_at": 1234567890,
  "exp": 1234567890,
  "iat": 1234567890
}
```

The updated response shape:
```json
{
  "url": "https://...",
  "expiresAt": "2025-...",
  "sessionToken": "eyJ...",
  "session": {
    "track_id": "...",
    "user_id": "...",
    "session_id": "...",
    "expires_at": "2025-..."
  }
}
```

