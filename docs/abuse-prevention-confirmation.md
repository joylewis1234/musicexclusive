# Abuse Prevention Confirmation

## Scope

This document confirms abuse prevention controls that reduce spam, brute force, and data exposure risks.

## Implemented Controls

### Invite System Protections

- Expiration enforced via validate-fan-invite.
- Single-use enforcement via status "used".
- Invites bound to issuer (artist_profiles.id or vault_members.id).
- Tokens are unique via database constraints.

### Vault Code Protections

- Email format validation in generate-vault-code.
- One code issuance per email per minute.
- Rate limiting on validation attempts (5 per 10 minutes).
- Code format validation on submit.

### Edge Function Input Validation

- elevenlabs-sfx validates prompt length, allowed characters, and duration bounds.
- All sensitive edge functions require proper auth headers where applicable.

### Data Integrity Guardrails

- Unique indexes on fan_invites.token, vault_codes.email, and artist_applications.contact_email.
- RLS hardening applied to reduce anonymous or public access to sensitive tables.

### Playback Access Control

- mint-playback-url enforces access checks and short-lived URLs to prevent raw asset scraping.

## Files Referenced

- supabase/functions/validate-fan-invite/index.ts
- supabase/functions/generate-fan-invite/index.ts
- supabase/functions/generate-superfan-invite/index.ts
- supabase/functions/generate-vault-code/index.ts
- supabase/functions/validate-vault-code/index.ts
- supabase/functions/elevenlabs-sfx/index.ts
- supabase/functions/mint-playback-url/index.ts
