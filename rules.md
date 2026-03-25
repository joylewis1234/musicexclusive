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

## Backend modification policy

- **AI may edit backend code** (Edge Functions, migrations, config.toml) but **must request explicit approval** before every change.
- Each proposed backend change must include:
  1. **What** is changing (file, function, lines).
  2. **Why** the change is needed.
  3. **Impact analysis** — which parts of the app (frontend pages, other Edge Functions, database tables, auth flows, payments, emails) are affected and how.
- **No backend change may be applied until the product owner approves.**

## Auth & roles
