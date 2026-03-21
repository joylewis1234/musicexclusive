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
- [ ] Audit for any remaining Lovable URLs, SDK usage, or fallback logic in the codebase

## Supabase Auth Only
- [x] Confirm fan sign-up uses Supabase only
- [x] Confirm fan sign-in uses Supabase only
- [x] Confirm artist sign-in uses Supabase only
- [x] Confirm Google OAuth uses Supabase only
- [ ] Confirm Supabase redirect URLs are configured for `musicexclusive.co`
- [x] Confirm auth flows do not depend on preview/staging domains
- [ ] Decide whether vault entry should create a Supabase auth user immediately
- [ ] Decide whether winners should create accounts only after winning
- [ ] Confirm whether Supabase confirmation emails should remain enabled
- [ ] Align final auth behavior with the intended branded email flow

## Resend Email Only
- [x] Audit all vault-related emails and confirm they are sent through Resend
- [x] Remove Lovable preview fallback URLs from vault email functions
- [x] Verify all vault email CTAs point to `musicexclusive.co`
- [x] Verify all winner, loser, resend, and recovery emails use the correct live domain
- [ ] Confirm deployed edge functions match the intended local email code
- [ ] Confirm no Lovable-hosted email links remain anywhere in production

## Winner Flow Cleanup
- [x] Choose one fan agreement route to keep
- [x] Remove duplicate routing between `/agreements/fan` and `/fan/agreements`
- [x] Make vault winner flow use one consistent agreement path
- [x] Make returning fan flow use that same path
- [x] Make invite-based fan flow use that same path where appropriate

## Legal Updates
- [ ] Add watermark protection wording to fan agreements
- [ ] Update Terms of Use copy
- [ ] Replace placeholder legal text if `src/pages/Agreements.tsx` remains in use
- [ ] Confirm legal copy is consistent across all fan agreement and onboarding screens

## Payment Flow Fixes
- [ ] Verify Superfan path opens Stripe checkout from `src/pages/Subscribe.tsx`
- [ ] Verify Pay-as-you-go path opens Stripe checkout from `src/pages/LoadCredits.tsx`
- [x] Standardize Stripe success return through `src/pages/CheckoutReturn.tsx`
- [x] Make Stripe cancel return to the same page the user started from
- [x] Fix any mismatched cancel URL paths
- [x] Confirm payment flows use the live domain in success/cancel URLs

## Failed-To-Load Investigation
- [ ] Test `/login` on deployed app
- [ ] Test `/auth/fan` on deployed app
- [ ] Test `/auth/artist` on deployed app
- [ ] Test `/subscribe` on deployed app
- [ ] Test `/onboarding/listen` on deployed app
- [ ] Check browser console for auth, chunk, and runtime errors
- [ ] Check network tab for failed JS chunk requests
- [ ] Confirm route chunks are available in the deployed build
- [ ] Confirm no route crashes are caused by leftover Lovable imports

## End-to-End QA
- [ ] Enter vault and generate code
- [ ] Submit code and confirm winner path works
- [ ] Open winner email and verify CTA works
- [ ] Complete agreement flow
- [ ] Test Superfan checkout
- [ ] Test Pay-as-you-go checkout
- [ ] Test fan login from home page
- [ ] Test fan Google OAuth
- [ ] Test returning fan flow with existing vault code
- [ ] Confirm no unexpected Supabase auth emails are sent
- [ ] Confirm no Lovable URLs appear anywhere in the user journey

## Deployment Verification
- [ ] Verify production env vars are correct for Supabase
- [ ] Verify production env vars are correct for Resend
- [ ] Verify Supabase Auth redirect settings include `musicexclusive.co`
- [ ] Verify production build no longer depends on Lovable auth
- [ ] Verify production emails and redirects behave correctly end to end
