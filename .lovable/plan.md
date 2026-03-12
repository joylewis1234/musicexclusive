
Issue recap based on your answers + investigation:
- It fails on the published site across all browsers/devices.
- Browser refresh keeps landing on the same Loading state.
- Root URL and query-string URL are serving different fallback variants, which strongly points to stale/corrupt edge-cached HTML for `/` plus a broken bootstrap path.
- I also found a secondary client issue: repeated admin/auth checks (request storm) that can worsen stability.

Do I know what the issue is? Yes.
Primary issue: published bootstrap is not reliably loading the app bundle (cache/deployment mismatch at root path).
Secondary issue: auth/admin checks are re-triggering too aggressively.

Plan to implement:

1) Rebuild bootstrap path to a known-good minimal setup
- File: `index.html`
- Remove custom inline watchdog logic from HTML.
- Keep a minimal Vite-style document (`head`, `#root`, module entry script).
- Keep a static non-JS recovery link in fallback (so users can force a fresh URL even if JS never runs).

2) Move watchdog logic into bundled runtime (not inline HTML)
- File: `src/main.tsx`
- Keep `BootErrorBoundary`.
- Start a boot timer in JS and render a visible recovery UI if app mount never completes.
- Set boot-complete flag only after App actually mounts (not immediately after `render()` call).

3) Simplify and harden global error handling
- Files: `src/main.tsx`, `src/App.tsx`, `src/components/ErrorBoundary.tsx`
- Keep one global unhandled rejection logger at boot layer.
- Stop suppressing non-benign errors in `ErrorBoundary` so real startup failures surface.

4) Reduce publish-time asset mismatch risk
- File: `vite.config.ts`
- Make entry output more cache-resilient (stable bootstrap asset naming strategy) so stale HTML is less likely to point to missing hashed files.
- Keep lazy-route resilience for secondary chunks.

5) Fix auth/admin request storm (stability follow-up)
- Files: `src/contexts/AuthContext.tsx`, `src/hooks/useIsAdmin.ts`
- Refactor `onAuthStateChange` callback to avoid awaited async logic directly in the callback.
- Add duplicate-check guards/in-flight guards in `useIsAdmin` to prevent burst rechecks.

6) Verification checklist
- Preview: confirm boot logs appear and landing page renders.
- Network: confirm admin checks happen once per auth state change (not burst loops).
- Published: test both `https://musicexclusive.lovable.app/` and custom domain root in incognito.
- Confirm fallback now offers a working non-JS recovery path if boot fails.

Technical details:
- Root cause pattern matches “HTML/asset bootstrap mismatch under cache” (classic module script loading HTML fallback).
- Moving watchdog from inline HTML to bundled runtime avoids relying on inline script execution/CSP/sanitization behavior.
- Fixing auth callback patterns removes a known source of deadlocks/re-renders that can amplify perceived loading hangs.
