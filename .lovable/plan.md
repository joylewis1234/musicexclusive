

# Show Benefits First on /subscribe, Then Prompt Login

## Problem
The `/subscribe` page immediately redirects unauthenticated users to `/auth/fan`, so they never see the benefits or pricing. Users should see what they're getting before being asked to create an account.

## File: `src/pages/Subscribe.tsx`

### 1. Remove the auto-redirect (lines 42-52)
Delete the `useEffect` that redirects to `/auth/fan` when no user is present. This lets anyone view the page.

### 2. Gate only the subscribe action, not the page
In `handleSubscribe`, if `!user`, navigate to `/auth/fan` with `{ state: { flow: "superfan" } }` instead of calling Stripe. The user sees benefits first, clicks "Subscribe", and only then gets sent to login/signup. After auth, they return to `/subscribe` to complete checkout.

### 3. Update CTA button text for logged-out state
When `!user`, show "Sign Up & Subscribe — $5/month" instead of "Subscribe $5/month". When logged in, keep the current text.

### 4. Disable terms checkbox requirement awareness
The button is already disabled when `!termsAccepted`. Keep this — users must accept terms whether logged in or not. The terms acceptance + click triggers either auth redirect (logged out) or Stripe checkout (logged in).

## No backend, auth, payment, or route changes
The only change is removing the redirect and moving the auth gate into the button handler.

