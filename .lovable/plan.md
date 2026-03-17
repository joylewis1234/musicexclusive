

## Plan: Fix `create-connect-account` Auth Method

### Root Cause

The `create-connect-account` edge function uses `supabaseClient.auth.getClaims(token)` (line 51), which **does not exist** in the Supabase JS client SDK. This causes a runtime error, returning a 401/500 before any Stripe logic runs. The sister function `verify-connect-status` correctly uses `auth.getUser(token)`.

### Fix

**`supabase/functions/create-connect-account/index.ts`**

Replace the `getClaims`-based auth block (lines 43-67) with the standard `getUser(token)` pattern:

- Use `supabaseClient.auth.getUser(token)` to authenticate
- Extract `user.id` and `user.email` from the result
- Keep all downstream logic (Stripe account creation, profile update, account link) unchanged

This is a one-file, ~10-line change that aligns the function with the working pattern used in `verify-connect-status` and all other edge functions.

