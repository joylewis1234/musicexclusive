

## Plan: Isolate Admin Login from Public Login Page

### Changes

1. **`src/pages/Login.tsx`** — Remove the Admin Login card (lines 78–101) and the `Shield` icon import.

2. **`src/App.tsx`** — Wrap the `/admin/login` route with `<AdminProtectedRoute>` so only authenticated admins can access it. This means non-admins visiting `/admin/login` get redirected to `/access-restricted`.

3. **`src/pages/auth/AdminLogin.tsx`** — No changes needed. It already handles the login form and non-admin-user switching flow. Since it will be behind `AdminProtectedRoute`, only verified admins can reach it (useful for re-auth or session switching scenarios). 

**Wait — that creates a chicken-and-egg problem.** If the admin login page requires admin auth to access, admins can't log in at all.

**Revised approach:** Keep `/admin/login` as a public route (no guard), but simply remove it from the `/login` hub so it's not discoverable by regular users. Admins access it by navigating directly to `/admin/login`. The `AdminProtectedRoute` guard on `/admin/*` dashboard routes already prevents non-admins from accessing admin features after login.

### Final Changes

1. **`src/pages/Login.tsx`**
   - Remove the Admin Login `<button>` block (lines 78–101)
   - Remove `Shield` from the lucide imports

2. **No changes to `src/App.tsx`** — `/admin/login` stays as a public route, just not linked from the UI.

3. **`src/components/Header.tsx`** — No changes needed; the hamburger menu doesn't link to admin login.

