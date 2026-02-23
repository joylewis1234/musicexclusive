# Invite System Validation Confirmation

## Scope

This document confirms the invite system behaviors for fan invites, including expiration, monthly Superfan resets, single-use enforcement, and issuer binding.

## Components Reviewed

- fan_invites table in Postgres
- Edge function: validate-fan-invite
- Edge function: generate-superfan-invite
- Edge function: generate-fan-invite

## Validations Performed

### Expiration

- Created an invite with expires_at in the past.
- Validation via the invite flow returned "expired".
- The invite status was updated to "expired" in the database.

### Monthly Superfan Invite Reset

- Invoked generate-superfan-invite with isRenewal true.
- A new invite row was created with a fresh token and expires_at about 30 days out.
- This confirms a new monthly invite is generated on renewal.

### Single-use Enforcement

- validate-fan-invite with action "consume" marks the invite as used.
- Subsequent validations return "already used".
- Database shows status "used" and used_at populated.

### Invites Tied to Issuing User

- Artist invites are tied to artist_profiles.id (inviter_id).
- Superfan invites are tied to vault_members.id (inviter_id).
- Queries show inviter_id matches the issuing user record.

## Evidence Notes

All checks were verified via app flows and SQL queries against fan_invites. The logic is implemented in:

- supabase/functions/validate-fan-invite/index.ts
- supabase/functions/generate-superfan-invite/index.ts
- supabase/functions/generate-fan-invite/index.ts
