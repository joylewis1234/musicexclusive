Issue reframe:
- Published domains are no longer failing on “no JS”; they are now failing at runtime with `Uncaught Error: supabaseUrl is required` from `app.js`.
- Preview works, so this is a publish artifact/caching/env-injection mismatch, not an app logic bug.

Do I know what the issue is?
- Yes. The likely break is in deployment artifact strategy, not React routes/components.
- Most likely trigger: custom build/output hardening changes (`vite.config.ts` fixed `assets/app.js` + manual `index.html` preload/version tweaks) interacting badly with CDN cache/versioning, causing an outdated or improperly injected entry bundle to run in production.

Files isolated:
- `vite.config.ts` (custom `entryFileNames/chunkFileNames/assetFileNames`)
- `index.html` (manual modulepreload + `?v=12`)
- `src/integrations/supabase/client.ts` (throws immediately when URL missing; auto-generated, do not edit)

Implementation plan (hotfix + escalation):
1) Revert publish-risky frontend build customizations
- Restore `vite.config.ts` build output to default Vite behavior (remove forced stable output filenames).
- Restore `index.html` to standard Vite entry pattern (remove manual `/assets/app.js` preload and forced query versioning).
- Keep app/runtime code as-is otherwise.

2) Republish a clean frontend build
- Publish once after rollback.
- Validate both:
  - `https://musicexclusive.lovable.app/?cb=<timestamp>`
  - `https://www.themusicisexclusive.com/?cb=<timestamp>`
- Confirm app boot and that no `supabaseUrl is required` error appears.

3) Escalate to Lovable support in parallel (since this is a repeated production incident)
- Send a support report with:
  - Project ID: `09644822-430a-4a4e-a068-bdf812a2aedf`
  - Affected URLs: staging + custom domain
  - Exact runtime error stack (`supabaseUrl is required` in `app.js`)
  - Statement that preview works while published fails
  - Note that issue persisted across multiple Publish → Update attempts
  - Request: CDN purge + build artifact/env injection verification for latest publish

4) If rollback publish still fails
- Ask support for a forced full redeploy/invalidation of HTML + JS edge cache for both domains.
- Then retest with fresh cache-busting URLs and incognito.

Technical details:
- `createClient(...)` in `src/integrations/supabase/client.ts` is evaluated at module init; if URL is absent in the published bundle, app fails before normal UI recovery.
- This is consistent with a production bundle/env mismatch and inconsistent CDN artifact serving, not a route/component render bug.
- Console warning about `Footer` ref is unrelated to the black-screen incident and can be fixed after production is stable.