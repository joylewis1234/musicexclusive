

# Fix: "LOAD ERROR — Request cancelled" on Edit Artist Profile

## Root Cause
When navigating to `/artist/profile/edit`, React's cleanup cycle (or Strict Mode double-mount) aborts the in-flight `fetchProfile` request via the `AbortController`. The `getAuthedUserOrFail` helper returns `{ ok: false, error: "Request cancelled" }`, but the code at line 97 does not check `signal.aborted` before setting `loadError`. This causes the error screen to display.

The catch block at line 174 correctly handles this (`if (err?.name === "AbortError" || signal.aborted) return`), but the early-return path at line 97-100 does not.

## Fix (single file: `src/pages/artist/EditArtistProfile.tsx`)

Add a `signal.aborted` check immediately after the `withTimeout` call (after line 95, before the `authResult.ok` check):

```typescript
const authResult = await withTimeout(getAuthedUserOrFail(signal), 10000);

if (signal.aborted) return;  // ← ADD THIS LINE

if (authResult.ok === false) {
```

This ensures that if the request was cancelled due to unmount/navigation, the function silently returns instead of displaying a load error.

No other files, logic, or UI changes needed.

