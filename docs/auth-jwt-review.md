# Auth + JWT Review

## Scope
This document summarizes the client authentication lifecycle, edge function JWT validation patterns, the admin enforcement model, and the intended public endpoints.

## Client Auth Lifecycle
- Supabase Auth is used for sign-up and sign-in.
- The app loads the current session via `getSession` on startup.
- Auth state changes are tracked via `onAuthStateChange` to keep `session` and `user` in sync.
- Roles are resolved from `user_roles` and an active role is selected with admin > artist > fan priority.
- The resolved role is cached in sessionStorage and re-used when valid.

## Edge Function JWT Validation Patterns

### Pattern A: `auth.getUser()` (full user verification)
Used for endpoints that need the full user object or stricter validation.
- Example: `charge-stream`
- Example: `mint-playback-url`

### Pattern B: `auth.getClaims()` (claims-only)
Used when only `sub` and/or email claims are needed.
- Example: `create-connect-account`
- Example: `upload-fan-avatar`

### Common Guardrails
- Sensitive endpoints require `Authorization: Bearer <token>` and return 401 on missing/invalid tokens.
- Input validation returns 400 with explicit error messages.

## Admin Enforcement Model
- Admin access requires BOTH:
  1) `user_roles` contains `role = admin`
  2) `is_admin_email` allowlist returns true
- Admin verification is performed server-side using service role and the `verify-admin` helper.
- This prevents escalation even if a rogue role row exists.

## Intended Public Endpoints
Public endpoints are limited to flows that explicitly accept unauthenticated access:
- `validate-fan-invite` (token validation)
- `validate-vault-code` (lookup with email + code)

Other edge functions are expected to require a valid JWT.
