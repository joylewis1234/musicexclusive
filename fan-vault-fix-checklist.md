# Fan Vault Fix Checklist

## Architecture Rules
- [x] Supabase is the only authentication system
- [ ] Resend is the only email delivery system for branded/auth-related emails
- [ ] `musicexclusive.co` is the canonical app domain for all user-facing links and redirects
- [x] Remove all remaining Lovable auth/email dependencies from the fan vault flow

## Remove Lovable Dependencies
- [x] Remove remaining Lovable auth usage from `src/pages/auth/FanAuth.tsx`
- [x] Remove remaining Lovable auth usage from `src/pages/auth/ArtistAuth.tsx`
- [x] Replace Lovable Google OAuth calls with `supabase.auth.signInWithOAuth(...)`
- [x] Remove `src/integrations/lovable/index.ts` once no longer referenced
- [x] Audit for any remaining Lovable URLs, SDK usage, or fallback logic in the codebase

## Supabase Auth Only
- [x] Confirm fan sign-up uses Supabase only
- [x] Confirm fan sign-in uses Supabase only
- [x] Confirm artist sign-in uses Supabase only
- [x] Confirm Google OAuth uses Supabase only
- [x] Confirm Supabase redirect URLs are configured for `musicexclusive.co` (live `signUp(..., emailRedirectTo: "https://musicexclusive.co")` accepted without redirect-URL errors)
- [x] Confirm auth flows do not depend on preview/staging domains
- [x] Decide whether vault entry should create a Supabase auth user immediately
- [x] Decide whether winners should create accounts only after winning
- [ ] Confirm whether Supabase confirmation emails should remain enabled
- [x] Align final auth behavior with the intended branded email flow

## Resend Email Only
- [x] Audit all vault-related emails and confirm they are sent through Resend
- [x] Remove Lovable preview fallback URLs from vault email functions
- [x] Verify all vault email CTAs point to `musicexclusive.co`
- [x] Verify all winner, loser, resend, and recovery emails use the correct live domain
- [x] Confirm deployed edge functions match the intended local email code
- [x] Confirm no Lovable-hosted email links remain anywhere in production

## Signup Verification via Resend
- [x] Replace fan sign-up's immediate account creation flow with a Resend verification-email flow
- [x] Replace public artist sign-up's direct `supabase.auth.signUp(...)` flow with a Resend verification-email flow
- [x] Replace approved artist setup's immediate account creation flow with a Resend verification-email flow
- [x] Keep vault winner claim flow separate from generic signup verification
- [x] Keep password reset flow separate from generic signup verification
- [x] Add a shared `/auth/confirm` page that consumes Supabase verification links and establishes a real session
- [x] Make `/auth/confirm` support the Supabase signup link shape actually returned by `auth.admin.generateLink(...)`
- [x] Route verified fan signups to the correct post-confirmation destination
- [x] Route verified public artist signups to the correct post-confirmation destination
- [x] Route verified approved artist setup users through `finalize-artist-setup`
- [x] Preserve invite / superfan context through fan signup verification
- [x] Ensure invite tokens are only consumed after the verification link establishes a session
- [x] Add a resend-verification path for fan signup
- [x] Add a resend-verification path for public artist signup
- [x] Add a resend-verification path for approved artist setup
- [ ] Handle expired verification links with a recoverable retry path
- [ ] Handle already-used verification links without trapping the user
- [ ] Handle existing verified accounts by redirecting users to sign in instead of generating duplicate signups
- [x] Handle existing unverified accounts by resending verification instead of creating duplicate auth users
- [ ] Ensure all verification emails are sent through Resend with `musicexclusive.co` CTA URLs
- [ ] Add explicit QA coverage for fan signup verification end to end
- [ ] Add explicit QA coverage for public artist signup verification end to end
- [ ] Add explicit QA coverage for approved artist setup verification end to end

### Suggested Implementation Order
1. Build the shared verification foundation
   - [x] Add a shared `/auth/confirm` page that consumes Supabase verification links and establishes a real session
   - [x] Make `/auth/confirm` support the Supabase signup link shape actually returned by `auth.admin.generateLink(...)`
   - [x] Keep vault winner claim flow separate from generic signup verification
   - [x] Keep password reset flow separate from generic signup verification
2. Add backend signup-start and resend flows
   - [x] Replace fan sign-up's immediate account creation flow with a Resend verification-email flow
   - [x] Replace public artist sign-up's direct `supabase.auth.signUp(...)` flow with a Resend verification-email flow
   - [x] Replace approved artist setup's immediate account creation flow with a Resend verification-email flow
   - [x] Add a resend-verification path for fan signup
   - [x] Add a resend-verification path for public artist signup
   - [x] Add a resend-verification path for approved artist setup
   - [ ] Ensure all verification emails are sent through Resend with `musicexclusive.co` CTA URLs
3. Wire post-verification routing and edge cases
   - [x] Route verified fan signups to the correct post-confirmation destination
   - [x] Route verified public artist signups to the correct post-confirmation destination
   - [x] Route verified approved artist setup users through `finalize-artist-setup`
   - [x] Preserve invite / superfan context through fan signup verification
   - [x] Ensure invite tokens are only consumed after the verification link establishes a session
   - [ ] Handle expired verification links with a recoverable retry path
   - [ ] Handle already-used verification links without trapping the user
   - [ ] Handle existing verified accounts by redirecting users to sign in instead of generating duplicate signups
   - [x] Handle existing unverified accounts by resending verification instead of creating duplicate auth users
4. Prove it in QA
   - [ ] Add explicit QA coverage for fan signup verification end to end
   - [ ] Add explicit QA coverage for public artist signup verification end to end
   - [ ] Add explicit QA coverage for approved artist setup verification end to end

## Winner Flow Cleanup
- [x] Choose one fan agreement route to keep
- [x] Remove duplicate routing between `/agreements/fan` and `/fan/agreements`
- [x] Make vault winner flow use one consistent claim path
- [x] Make returning fan flow use that same claim path
- [x] Make invite-based fan flow use that same path where appropriate

## Legal Updates
- [x] Add watermark protection wording to fan agreements
- [x] Update Terms of Use copy
- [x] Replace placeholder legal text if `src/pages/Agreements.tsx` remains in use
- [x] Confirm legal copy is consistent across all fan agreement and onboarding screens

## Payment Flow Fixes
- [x] Verify Superfan path opens Stripe checkout from `src/pages/Subscribe.tsx`
- [x] Verify Pay-as-you-go path opens Stripe checkout from `src/pages/LoadCredits.tsx`
- [x] Standardize Stripe success return through `src/pages/CheckoutReturn.tsx`
- [x] Make Stripe cancel return to the same page the user started from
- [x] Fix any mismatched cancel URL paths
- [x] Confirm payment flows use the live domain in success/cancel URLs

## Failed-To-Load Investigation
- [x] Test `/login` on deployed app
- [x] Test `/auth/fan` on deployed app
- [x] Test `/auth/artist` on deployed app
- [x] Test `/subscribe` on deployed app
- [x] Test `/onboarding/listen` on deployed app
- [x] Check browser console for auth, chunk, and runtime errors
- [x] Check network tab for failed JS chunk requests
- [x] Confirm route chunks are available in the deployed build
- [x] Confirm no route crashes are caused by leftover Lovable imports

## End-to-End QA
- [x] Enter vault and generate code
- [x] Submit code and confirm winner path works
- [x] Open winner email and verify CTA works (real email reached spam, but CTA opened the live `musicexclusive.co` claim page)
- [x] Complete winner claim flow into `Choose Your Access`
- [x] Test Superfan checkout
- [x] Test Pay-as-you-go checkout
- [x] Test fan login from home page
- [ ] Test fan Google OAuth (`Unsupported provider: provider is not enabled` in current production Supabase Auth)
- [x] Test returning fan flow with existing vault code
- [x] Confirm no unexpected Supabase auth emails are sent (vault winner claim flow uses `auth.admin.createUser({ email_confirm: true })`, not `supabase.auth.signUp`)
- [x] Confirm no Lovable URLs appear anywhere in the user journey

## Deployment Verification
- [ ] Verify production env vars are correct for Supabase
- [ ] Verify production env vars are correct for Resend
- [ ] Verify Supabase Auth redirect settings include `musicexclusive.co`
- [x] Verify production build no longer depends on Lovable auth
- [ ] Verify production emails and redirects behave correctly end to end (current live issue: winner email can land in spam)

## Deliverability Follow-Up
- [ ] Rewrite vault winner email copy to be more transactional and less promotional
- [ ] Rewrite retry winner email copy to be more transactional and less promotional
- [ ] Rewrite resend email copy to be more transactional and less promotional
- [ ] Add explicit plain-text bodies for vault winner, retry, and resend emails
- [ ] Reduce emoji-heavy subject lines and celebratory header copy in vault emails
- [ ] Simplify vault email HTML design for better inbox placement
- [ ] Re-test Gmail inbox placement after the copy/design rewrite
- [ ] Confirm CTA behavior still works after the email rewrite
