

## Fix forwardRef Warnings + Investigate Signup Issue

### Problem 1: forwardRef Warnings (Cosmetic)
React Router v6 tries to pass a `ref` to `Login` and `FanAuth` components. Since they are plain function components (not wrapped in `React.forwardRef`), React logs a warning. This does NOT block functionality but clutters the console.

**Fix:** Wrap both components with `React.forwardRef`.

| File | Change |
|------|--------|
| `src/pages/Login.tsx` | Wrap component with `React.forwardRef` |
| `src/pages/auth/FanAuth.tsx` | Wrap component with `React.forwardRef` |

### Problem 2: Signup Not Working
The ref warning itself does not prevent signup. Possible causes to investigate:
- Email confirmation may be required (user signs up but can't sign in until email is verified)
- Password too short (minimum 6 characters enforced)
- Network/backend error not surfacing properly

**Action:** After fixing the ref warnings, test the full signup flow in the browser to see the actual error response.

### Technical Details

For each affected component, change the export pattern from:

```typescript
const Login = () => { ... };
export default Login;
```

To:

```typescript
import { forwardRef } from "react";
const Login = forwardRef<HTMLDivElement>((_, ref) => { ... });
Login.displayName = "Login";
export default Login;
```

The outer `div` gets the forwarded `ref`. Same pattern for `FanAuth`.

