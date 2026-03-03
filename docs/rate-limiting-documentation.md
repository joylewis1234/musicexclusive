# Rate Limiting Documentation

## Scope
This document summarizes rate limiting controls on sensitive endpoints.

## Controls by Endpoint

### generate-vault-code
File: supabase/functions/generate-vault-code/index.ts
- Limit: one code issuance per email per 60 seconds.
- Mechanism: checks vault_codes.issued_at for the same email within the last minute.
- Response: HTTP 429 with message "Please wait before requesting another code".

### validate-vault-code
File: supabase/functions/validate-vault-code/index.ts
- Limit: max 5 attempts per 10 minutes per email.
- Mechanism: tracks attempts_count and last_attempt_at in vault_codes.
- Response: HTTP 429 with error "rate_limited" and retryAfterSeconds.

### elevenlabs-sfx
File: supabase/functions/elevenlabs-sfx/index.ts
- Limit: max 10 requests per 10 minutes per user.
- Mechanism: in-memory map keyed by user id, sliding window.
- Response: HTTP 429 with error "Rate limit exceeded. Try again later."

## Notes and Limitations
- elevenlabs-sfx rate limiting is in-memory and resets on cold start; it is best-effort.
- Vault code limits are persisted in the database and survive restarts.
