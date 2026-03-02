

# Founding Superfan Lifetime Access Funnel

This plan adds a complete fan waitlist funnel: a lock modal on "Enter the Vault", a landing page, a form, a confirmation screen, a backend table, an edge function with emails, and admin visibility.

---

## 1. Database

Create a new `fan_waitlist` table:

| Column          | Type        | Notes                       |
|-----------------|-------------|-----------------------------|
| id              | uuid (PK)   | default gen_random_uuid()   |
| first_name      | text        | NOT NULL                    |
| email           | text        | NOT NULL, UNIQUE            |
| favorite_genre  | text        | nullable                    |
| favorite_artist | text        | nullable                    |
| status          | text        | default 'lifetime_reserved' |
| created_at      | timestamptz | default now()               |

RLS policies:
- SELECT: admin + service_role
- INSERT: service_role only
- UPDATE: admin + service_role
- No DELETE

---

## 2. Edge Function: `submit-fan-waitlist`

- Public endpoint (no JWT)
- Validates required fields (first_name, email)
- Rate-limits by email+IP using existing `request_rate_limits` pattern
- Inserts into `fan_waitlist` (duplicate email returns 409)
- Sends **confirmation email** to the fan via Resend from `noreply@themusicisexclusive.com`:
  - Subject: "You've Secured Lifetime Access to Music Exclusive"
  - Body: Founding Superfan welcome with lifetime benefits list
- Sends **admin notification email** to `support@musicexclusive.co`:
  - Subject: "New Founding Superfan Signup"
  - Body: Name, email, genre, artist, timestamp

---

## 3. Frontend Changes

### A. Vault Lock Modal (new component)

`src/components/vault/VaultLockedModal.tsx`

A modal overlay triggered when clicking "Enter the Vault" on the homepage. Contains:
- "The Vault Is Locked." headline
- 2026 launch messaging and exclusivity copy (as specified)
- "Secure Lifetime Access" button navigates to `/founding-superfan`
- "Not Now" button closes the modal

### B. Modify Index.tsx

Replace the "Enter the Vault" button's `onClick` so it opens the VaultLockedModal instead of navigating to `/vault/enter`.

### C. Founding Superfan Landing Page

`src/pages/FoundingSuperfan.tsx` at route `/founding-superfan`

Four sections matching the spec:
1. **Hero** -- "Become a Founding Superfan" with CTA scrolling to form
2. **What Makes This Different** -- Artist-first messaging, bullet points
3. **Lifetime Access Benefits** -- Benefits list with "You'll already be inside" subtext
4. **Form Section** -- First Name, Email, optional Genre/Artist, "Reserve My Lifetime Access" button

Submits via `supabase.functions.invoke("submit-fan-waitlist")`.

On success, navigates to `/founding-superfan/confirmed`.

### D. Confirmation Page

`src/pages/FoundingSuperfanConfirmed.tsx` at route `/founding-superfan/confirmed`

Displays the post-submission copy:
- "You're On the Founding Superfan List."
- Benefits recap
- "The Vault opens soon."
- Back to Home button

### E. Admin Visibility

Add a "Fan Waitlist" card to `AdminDashboard.tsx` and create `src/pages/admin/AdminFanWaitlist.tsx` at route `/admin/fan-waitlist` (admin-protected) with a table showing Name, Email, Genre, Artist, Status, Date.

---

## 4. Routing (App.tsx)

Add three public routes:
- `/founding-superfan`
- `/founding-superfan/confirmed`

Add one admin route:
- `/admin/fan-waitlist`

---

## 5. Summary of Changes

- 1 new database table with migration
- 1 new edge function (`submit-fan-waitlist`)
- 1 new modal component (`VaultLockedModal`)
- 3 new page components (landing, confirmation, admin)
- 3 existing files modified (Index.tsx, App.tsx, AdminDashboard.tsx)
- Follows existing patterns: GlowCard, SectionHeader, rate limiting, Resend emails, dark luxury aesthetic

