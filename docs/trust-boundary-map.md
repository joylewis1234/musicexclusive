# Trust Boundary Map

## Scope

This document maps the trust boundaries between Supabase, Edge Functions, Cloudflare R2, and Stripe for the Music Exclusive application.

## System Actors

- Client (browser / React app)

- Supabase Auth + Postgres (RLS + constraints)

- Supabase Edge Functions (service role)

- Cloudflare R2 (private object storage)

- Stripe (payments + webhooks)

## Trust Boundaries & Data Flows

### 1) Client → Supabase Auth

**Boundary:** Public, untrusted client to authentication service.  

**Controls:** JWT issuance, HTTPS transport, server-side token validation.  

**Risk:** Token theft or replay.  

**Mitigation:** Short-lived tokens and server-side verification before privileged operations.

### 2) Client → Supabase Postgres (RLS)

**Boundary:** Untrusted client to RLS-protected data.  

**Controls:** RLS policies enforce tenant isolation and least privilege.  

**Risk:** Unauthorized data access via query manipulation.  

**Mitigation:** Hardened RLS and removal of public reads on sensitive tables.

### 3) Client → Supabase Edge Functions

**Boundary:** Untrusted client to privileged compute.  

**Controls:** Authorization header required, JWT validation, input validation.  

**Risk:** Privilege escalation or input abuse.  

**Mitigation:** Explicit access checks for role/ownership/membership before service-role queries.

### 4) Edge Functions → Supabase Postgres (Service Role)

**Boundary:** Privileged compute to full DB access.  

**Controls:** Service role used only server-side; idempotency and constraints enforce integrity.  

**Risk:** Logic bugs bypass RLS.  

**Mitigation:** Defense in depth via unique indexes, CHECK constraints, and optimistic concurrency.

### 5) Edge Functions → Cloudflare R2 (Private Storage)

**Boundary:** Privileged compute to private object store.  

**Controls:** No public bucket access; signed URLs minted after access validation.  

**Risk:** Over-broad access or URL leakage.  

**Mitigation:** Short TTLs, access checks, and track status gating.

### 6) Client → Cloudflare R2 (Signed URL)

**Boundary:** Untrusted client to private content via temporary URL.  

**Controls:** Signed URL TTLs enforce expiry.  

**Risk:** URL sharing or replay.  

**Mitigation:** Short TTLs and session tracking for playback. Client components (`useAudioPlayer`, `ExclusiveSongCard`) never store or cache public URLs; R2 object keys are resolved to signed URLs on demand with short TTLs (90s audio, 300s artwork).

### 7) Stripe → Edge Functions (Webhooks)

**Boundary:** External payment provider to privileged compute.  

**Controls:** Webhook signature validation and idempotency.  

**Risk:** Forged webhook or replay.  

**Mitigation:** Signature verification and dedupe via DB constraints.

### 8) Edge Functions → Stripe (API Calls)

**Boundary:** Privileged compute to external payment system.  

**Controls:** Server-side API keys only; payout uniqueness enforced.  

**Risk:** Misconfiguration or duplicate payouts.  

**Mitigation:** Unique constraints on payout batches and transfers.

## Trust Zones Summary

- **Untrusted:** Client/browser, internet.

- **Trusted compute:** Supabase Edge Functions (service role).

- **Trusted data:** Supabase Postgres with RLS + constraints.

- **External trusted services:** Stripe (validated), Cloudflare R2 (private storage).
