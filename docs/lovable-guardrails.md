# Music Exclusive — Lovable AI Guardrails

## Absolute bans (do not regress)

- **Never add** Lovable runtime dependencies: `@lovable.dev/*`, Lovable Cloud Auth, `lovable-tagger`, or any "Lovable auth" SDK.
- **Never** wire auth or data through Lovable-hosted backends. **Supabase** is the only production database and auth provider.
- **Never** add mock APIs, placeholder backends, or "fallback" auth/email providers unless the product owner explicitly approves in writing.

---

## Canonical domains & URLs

- **Production site:** `https://musicexclusive.co` (see `src/config/app.ts`: `APP_URL`).
- **Local dev:** Vite serves on **port 8080** — `http://localhost:8080` and `http://127.0.0.1:8080` are treated as local via `getAppBaseUrl()` / `getAuthRedirectBaseUrl()` in `src/config/app.ts`.
- **All user-facing links, Stripe return URLs, email CTAs, OAuth redirect targets, and marketing copy** must use `getAppBaseUrl()` behavior conceptually: production → `musicexclusive.co`, local → current origin. Do **not** use old domains (`themusicisexclusive.com`, Lovable preview hosts, `localhost:3000` unless explicitly for a non-frontend tool).

---

## Supabase (single source of truth)

- **Project ref:** `esgpsapstljgsqpmezzf`
- **API URL:** `https://esgpsapstljgsqpmezzf.supabase.co`
- **Client credentials in this repo:** `src/config/supabase.ts` exports `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_PROJECT_ID`. Any env work in Lovable must stay **consistent** with that file (do not point at old Supabase projects).
- **Imports:** Application code uses `import { supabase } from "@/integrations/supabase/client"`. Vite aliases that import to `src/integrations/supabase/custom-client.ts`, which builds the client from `@/config/supabase`.
- **Database types:** `src/integrations/supabase/types.ts` — prefer typed queries when touching tables.

---

## Frontend stack (do not replace)

- **Build:** Vite + React 18 + TypeScript.
- **Routing:** `react-router-dom` v6 — routes live in `src/App.tsx` (lazy routes, etc.).
- **Server state:** `@tanstack/react-query` for data fetching patterns where applicable.
- **UI:** shadcn-style components under `src/components/ui`, Radix primitives, Tailwind, `lucide-react`, toasts via `sonner` (and sometimes `use-toast`).
- **Forms:** `react-hook-form` + `zod` where the codebase already does.
- **Aliases:** `@/` → `src/` (see `vite.config.ts`).

---

## Backend logic placement

- **Business rules, payments, email sending, webhooks, privileged DB** belong in **Supabase Edge Functions** under `supabase/functions/<name>/index.ts`, not in the browser.
- **Client calls Edge Functions** via:
  `await supabase.functions.invoke("<kebab-case-name>", { body: { ... } })`
- Do **not** duplicate payment, signup, vault, or stream-charge logic in the React app beyond thin UI + invoke.

Examples of existing function names (non-exhaustive):
`charge-stream`, `mint-playback-url`, `create-checkout`, `create-subscription-checkout`, `verify-checkout`, `stripe-webhook` (server-only), `start-signup-verification`, `complete-signup-verification`, `send-password-reset`, `submit-artist-application`, `generate-fan-invite`, `validate-fan-invite`, `claim-vault-access`, `check-bonus-milestones`, `approve-bonus-payout`, `disqualify-bonus`, `update-charts-standings`, `close-annual-cycle`, `disqualify-charts-artist`, multipart/R2 upload helpers, etc.

---

## Authentication & roles

- **Supabase Auth** only (`AuthContext` in `src/contexts/AuthContext.tsx`).
- App roles: **`fan` | `artist` | `admin`** stored in `user_roles` — never trust client-only role; RLS + Edge Functions enforce access.
- **Do not** reintroduce a client-side `signUp()` for production fan/artist flows; signup verification is handled via Edge Functions + `/auth/confirm` (see `src/lib/signupVerification.ts`, `src/pages/AuthConfirm.tsx`).
- **Google OAuth** (if used) must use Supabase provider config and redirect URLs aligned with `getAuthRedirectBaseUrl()`.

---

## Email

- **Resend** sends branded/transactional email from Edge Functions (e.g. password reset, signup verification, vault emails). Sender domain aligns with **musicexclusive.co** (e.g. `noreply@musicexclusive.co` patterns in functions).
- **Do not** turn Supabase's built-in email templates back on for flows already migrated to Resend unless explicitly requested.

---

## Payments & money

- **Stripe** Checkout / subscriptions via Edge Functions; return URLs should use **`getAppBaseUrl()`** / `APP_URL` patterns, not raw `window.location` for production.
- **Webhook** processing is server-side only (`stripe-webhook`); never validate Stripe secrets in the client.

---

## Media & uploads

- **Audio/artwork** use **Cloudflare R2** with multipart upload flows and Edge Functions (`initiate-multipart-upload`, `sign-upload-part`, `complete-multipart-upload`, etc.). **CORS** must allow `https://musicexclusive.co` and local `8080` for browser PUTs.
- **Playback:** signed URLs / HLS via `mint-playback-url` and Cloudflare Worker (`worker/`). Do not expose long-lived public R2 URLs for tracks.

---

## Config modules to respect

- `src/config/app.ts` — canonical URL.
- `src/config/supabase.ts` — Supabase URL + anon key + project id.
- `src/config/passwordPolicy.ts` — minimum password length messaging (8 chars) for new-password flows.
- `src/config/artistEntry.ts` — feature flag `ARTIST_APPLICATION_ENTRY_ENABLED` toggles `/artist/apply` vs waitlist CTAs.

---

## Testing & quality

- **Unit tests:** Vitest (`npm run test`).
- **E2E:** Playwright (`npm run test:e2e`), specs under `e2e/`.
- **Documentation** for product/security lives under `docs/` (e.g. cash bonus blueprint, backend audit, watermarking). Prefer aligning new behavior with those docs.

---

## When generating new UI or pages

- Match existing admin patterns (`src/pages/admin/*`) and public pages (`src/pages/*`).
- Use **React Query** where the surrounding feature already does.
- For charts, use existing RPC/patterns (`get_public_charts`, `charts_bonus_cycles`) — do not invent parallel tables.
- **Do not** add dependencies that duplicate what `@supabase/supabase-js`, Stripe server SDKs (Edge), or existing workers already solve.

---

## Summary checklist before finishing any change

1. No Lovable-specific npm packages added.
2. Supabase project remains **`esgpsapstljgsqpmezzf`** / URL above.
3. Links and redirects use **musicexclusive.co** (or localhost:8080 when local).
4. New server behavior goes to **Edge Functions** + migrations, not only React.
5. No unapproved mocks or fallback auth/email providers.
