# Security Risk Map (Critical / High / Medium)

This map reflects the current security hardening status for Music Exclusive and is based on the RLS audit, edge function review, and ledger integrity checks.

## Critical

- **Role escalation via client role assignment (fixed)**

  `user_roles` was writable by authenticated users. This enabled self‑assigning `admin`.

  **Mitigation:** client inserts removed; `user_roles` now service‑role only; trigger assigns default role.

- **Webhook double‑credit race condition (fixed)**

  Stripe events could be processed twice under concurrency.

  **Mitigation:** insert‑first idempotency in `stripe_events`; atomic credit+ledger via `apply_credit_purchase`.

## High

- **Public access to track metadata (fixed)**

  Tracks were publicly readable, enabling metadata leakage.

  **Mitigation:** restricted to service role, admins, artists, and vault‑active fans.

- **fan_invites token exposure (fixed)**

  Invites were readable by users, enabling token enumeration.

  **Mitigation:** read access restricted to service role only; unique token index added.

- **Vault member roster exposure (fixed)**

  Authenticated users could list vault member names.

  **Mitigation:** roster policy removed.

- **Duplicate payout transfers (mitigated)**

  Potential for duplicate Stripe transfers if the same payout re‑processed.

  **Mitigation:** unique index on `artist_payouts.stripe_transfer_id`.

## Medium

- **Non‑atomic stream charging (partial)**

  `charge-stream` performs multiple writes.

  **Mitigation:** idempotency key enforced on `stream_charges` to prevent duplicates.

  **Residual:** still not fully atomic; consider RPC/transaction.

- **Duplicate artist applications by email (fixed)**

  Multiple applications for same email.

  **Mitigation:** dedupe + unique index on `artist_applications.contact_email`.

- **Duplicate vault codes per email (fixed)**

  Multiple vault codes per user email.

  **Mitigation:** unique index on `vault_codes.email`.

## Low / Deferred

- **Payout concurrency simulation (deferred)**

  No approved payout existed to simulate.

  **Plan:** run concurrency simulation when at least one approved payout exists.
