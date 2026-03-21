# Fan Auth Email Migration Plan

## Goal

Move fan vault onboarding to a fully branded Resend-led email flow while keeping Supabase as the authentication system underneath.

This plan fixes:
- Supabase-branded signup emails in the vault flow
- signup links landing on `/#access_token=...`
- premature auth account creation during vault entry
- mixed onboarding between vault entry, vault winner email, fan auth, and agreements

This plan preserves:
- Supabase sessions and password auth
- existing fan login for users who already have accounts
- existing vault code generation and winner selection logic

## Current State

### Current vault entry flow

`src/pages/EnterVault.tsx`
- generates a vault code via `generate-vault-code`
- immediately calls `signUp(...)` from `src/contexts/AuthContext.tsx`
- creates a Supabase auth user too early and can trigger Supabase signup mail

### Current winner flow

`supabase/functions/validate-vault-code/index.ts`
- marks the vault code as won
- sends the winner email via `send-vault-win-email`

`supabase/functions/send-vault-win-email/index.ts`
- winner CTA goes to `/vault/congrats?email=...&code=...`

`src/pages/VaultWinCongrats.tsx`
- currently sends the user into `/auth/fan?flow=vault`

`src/pages/auth/FanAuth.tsx`
- currently defaults vault flow to signup
- can create another Supabase auth email event instead of a branded claim flow

### Current agreement flow

`src/pages/FanAgreementStep.tsx`
- stores acceptance in session storage only
- does not finalize the new vault winner account in one branded backend step

## Target Architecture

### Principle

- Supabase manages auth users, sessions, and passwords
- Resend sends all user-facing onboarding emails
- vault entry does not create a Supabase auth user
- a winner creates or claims the account only after clicking the branded winner CTA

## Target Winner Journey

1. Fan enters the vault with name + email only
2. App generates or returns a permanent vault code
3. No auth account is created during vault entry
4. Fan submits the code
5. Winner email is sent via Resend
6. Winner CTA lands on a branded claim page
7. Claim page verifies winner status and account state
8. If no auth account exists, the fan sets a password and accepts terms there
9. Backend creates the Supabase auth user with `email_confirm: true`
10. Backend persists agreement acceptance and links `vault_members.user_id`
11. App signs the user in
12. Fan continues to `Choose Your Access`

## Exact Flow Changes

### Flow A: Vault entry

#### Replace
Current behavior in `src/pages/EnterVault.tsx`
- keep code generation
- remove immediate `signUp(...)`

#### New behavior
- collect name + email only
- generate or return existing code
- show code immediately
- do not create an auth account yet

### Flow B: Winner email CTA

#### Replace
Current winner CTA concept:
- “continue to login”

#### New behavior
- `/vault/congrats` becomes the branded account-claim page
- winner email CTA still points to `/vault/congrats?email=...&code=...`
- the page creates the account only when the winner claims access

### Flow C: Winner claim page

#### Route
Reuse `src/pages/VaultWinCongrats.tsx`

#### New responsibilities
- inspect winner claim status
- if account already exists:
  - offer sign-in
  - offer password reset
- if account does not exist:
  - collect password
  - collect agreement acceptance
  - call backend claim function
  - sign in immediately
  - continue to `/onboarding/listen`

### Flow D: Backend claim function

#### New function
`supabase/functions/claim-vault-access/index.ts`

#### Responsibilities
- verify email + vault code belong to a won vault entry
- detect whether an auth account already exists
- if account exists:
  - return `account_exists`
- if account does not exist:
  - create auth user with service role admin API
  - mark email confirmed (`email_confirm: true`)
  - ensure `fan` role exists
  - upsert `vault_members`
  - persist agreement acceptance
  - return success

### Flow E: Existing account winners

#### New behavior
- winners with an existing auth account do not create a duplicate user
- they are directed to sign in and continue

## Files and Functions To Change

### Frontend

#### `src/pages/EnterVault.tsx`
- remove password fields
- remove immediate vault signup
- keep code generation and existing-code handling

#### `src/pages/VaultWinCongrats.tsx`
- convert from “continue to login” page into the branded account claim page

#### `src/pages/auth/FanAuth.tsx`
- vault flow should default to sign-in only
- vault flow should no longer be a signup path

#### `src/components/vault/VaultWinScreen.tsx`
- winner CTA should route to `/vault/congrats?email=...&code=...`

#### `src/components/vault/ReturningFanLogin.tsx`
- returning winners should route to the same claim page

#### `src/pages/VaultStatus.tsx`
- remove duplicate win-email / lose-email side effects that are already handled by backend validation

### Backend

#### `supabase/functions/claim-vault-access/index.ts`
- new function

#### `supabase/functions/send-vault-win-email/index.ts`
- update copy so it reflects account claim instead of generic “Supabase-style login”

#### `supabase/functions/send-vault-retry-win-email/index.ts`
- update copy to match claim flow

#### `supabase/functions/validate-vault-code/index.ts`
- keep winner detection and winner email trigger
- do not create auth accounts here

## Data Behavior

### `vault_codes`
Keep using:
- email
- name
- code
- status
- used_at

### `vault_members`
Ensure on claim:
- `email`
- `display_name`
- `user_id`
- `vault_access_active = false`
- `credits = 0`

### Agreement persistence

Persist during claim:
- `agreement_acceptances`
- `fan_terms_acceptances`

## Safest Migration Path

### Phase 1
Stop vault entry from creating Supabase auth users.

Safe because:
- existing fan login remains untouched
- vault code generation remains untouched

### Phase 2
Add the winner claim function and move `/vault/congrats` to branded claim behavior.

Safe because:
- existing email CTA URL remains the same
- new winners and already-sent winner emails both land on the same upgraded page

### Phase 3
Make vault flow in `FanAuth` sign-in only.

Safe because:
- existing auth users still sign in normally
- new winners now claim their account on `/vault/congrats`

### Phase 4
Remove duplicate winner/loser email side effects from `VaultStatus`.

Safe because:
- `validate-vault-code` already performs authoritative win/lose updates and email sends

## Existing Users: No-Break Strategy

### Existing fans with auth accounts
- keep `signInWithPassword`
- keep current fan login page
- keep current reset-password flow

### Winners who already got old emails
- email CTA still lands on `/vault/congrats`
- page now detects account state and routes appropriately

### Returning fans with won codes
- returning lookup route now lands on the same claim page
- existing users sign in
- new unclaimed winners create an account there

## QA After Implementation

### New winner with no account
- enter vault
- get code
- submit code
- receive Resend winner email
- click CTA
- set password
- accept terms
- sign in automatically
- land on `Choose Your Access`
- no Supabase-branded signup email arrives

### Existing account winner
- open winner CTA
- app detects existing account
- app shows sign-in / reset path
- no duplicate user is created

### Returning winner
- use existing code
- status check routes to claim page
- continue through account claim or sign-in path

### Existing login users
- login remains unchanged

## Summary

### Replace now
- vault-entry auth creation
- vault-flow signup in `FanAuth`
- winner CTA behavior on `/vault/congrats`

### Add now
- `claim-vault-access` edge function
- branded winner claim flow

### Preserve
- Supabase as auth engine
- Resend as branded email sender
- existing user login and reset behavior
