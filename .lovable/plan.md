

## Plan: Add Forgot Password link to Admin Login

**What changes:**

Add a "Forgot password?" link to the admin login form (between the password field and the submit button) that navigates to the existing `/forgot-password?type=admin` page. The existing `ForgotPassword` page already handles any user type and calls the `send-password-reset` edge function. The only change needed is a single `Link` component in `src/pages/auth/AdminLogin.tsx`.

**Technical details:**

1. **File: `src/pages/auth/AdminLogin.tsx`**
   - Import `Link` from `react-router-dom`
   - After the password field (line 157), add a "Forgot password?" link pointing to `/forgot-password?type=admin`
   - Style it consistently with the existing forgot-password links on fan/artist auth pages (right-aligned, small text, primary color)

No backend changes needed. No new pages or edge functions required.

