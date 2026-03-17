
Goal
- Fix the “Go to Your Dashboard” button loop on `/access-restricted` when the user is already signed in as `admin`.

What’s actually happening
- The button does navigate to `/admin`.
- `AdminProtectedRoute` immediately redirects back to `/access-restricted` on first render because `useIsAdmin()` starts as `isAdmin=false` and `isLoading=false` before its async check runs.
- Result: user sees the same page and thinks the button is broken.

Implementation plan
1) Make admin verification tri-state (unknown / verified / denied)
- Update `src/hooks/useIsAdmin.ts` to track whether admin verification has completed for the current user.
- Keep `isLoading=true` until the first verification finishes for that user.
- Return a new flag (e.g. `isResolved`) so route guards can distinguish “not checked yet” vs “checked and not admin”.

2) Harden route guard against premature redirect
- Update `src/components/auth/AdminProtectedRoute.tsx` to wait until admin verification is resolved before evaluating `!isAdmin`.
- Guard flow after change:
  - if auth/admin check still resolving → spinner
  - if not authenticated → `/login`
  - if authenticated but verified non-admin → `/access-restricted`
  - if verified admin → render admin pages

3) Keep Access Restricted CTA behavior but prevent UX dead-loop
- Keep `Go to Your Dashboard` target as `/admin`.
- Optional micro-improvement in `src/pages/AccessRestricted.tsx`: when `role==="admin"`, route directly to `/admin` (already done) and include a fallback path to `/admin/login?next=/admin` only if session is missing.

Technical details
- Files to update:
  - `src/hooks/useIsAdmin.ts`
  - `src/components/auth/AdminProtectedRoute.tsx`
  - (optional minor fallback) `src/pages/AccessRestricted.tsx`
- No backend, RLS, schema, or function changes required.
- This is a frontend state-timing fix; external database/admin records are already valid per your logs (`user_roles` has admin, `is_admin_email` returns true).

Validation checklist
1) Login as `support@musicexclusive.co` and confirm `/admin` opens directly.
2) From `/access-restricted` (admin session), click “Go to Your Dashboard” and confirm it reaches admin dashboard (no bounce back).
3) Verify non-admin users are still redirected to `/access-restricted`.
4) Confirm spinner appears briefly during admin verification instead of immediate deny.
5) Check end-to-end on desktop + current viewport to ensure no regressions in auth routing.
