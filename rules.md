# Music Exclusive — Lovable AI Guardrails

> Canonical reference: [`docs/lovable-guardrails.md`](docs/lovable-guardrails.md)

## Absolute bans

- **Never add** `@lovable.dev/*`, Lovable Cloud Auth, `lovable-tagger`, or any Lovable runtime SDK.
- **Never** wire auth or data through Lovable-hosted backends. **Supabase** (`esgpsapstljgsqpmezzf`) is the only backend.
- **Never** add mock APIs, placeholder backends, or fallback auth/email providers without explicit product-owner approval.

## Canonical URLs

- **Production:** `https://musicexclusive.co` via `getAppBaseUrl()` in `src/config/app.ts`.
- **Local dev:** `localhost:8080`. No other domains.

## Supabase only

- **Project ref:** `esgpsapstljgsqpmezzf`
- **API URL:** `https://esgpsapstljgsqpmezzf.supabase.co`
- **Config:** `src/config/supabase.ts` — never point at a different project.
- **Client import:** `import { supabase } from "@/integrations/supabase/client"`

## Stack (do not replace)

Vite · React 18 · TypeScript · react-router-dom v6 · @tanstack/react-query · shadcn/ui + Radix · Tailwind · lucide-react · sonner · react-hook-form + zod

## Backend logic → Edge Functions

Business rules, payments (Stripe), email (Resend), webhooks, privileged DB operations → `supabase/functions/`. Client calls via `supabase.functions.invoke()`.

## Auth & roles

Supabase Auth only. Roles (`fan | artist | admin`) in `user_roles` table. No client-side `signUp()` for production — use Edge Function verification flow.

## Media

Cloudflare R2 multipart uploads + signed URLs/HLS via Edge Functions and Cloudflare Workers. No long-lived public R2 URLs.

## Pre-commit checklist

1. No Lovable-specific npm packages added.
2. Supabase project = `esgpsapstljgsqpmezzf`.
3. URLs use `musicexclusive.co` (prod) or `localhost:8080` (local).
4. Server logic in Edge Functions + migrations, not React.
5. No unapproved mocks or fallback providers.

#Edge Functions
When I ask you to implement something that involves Supabase, add the edge function's code to the answer so that I can add it manually.
