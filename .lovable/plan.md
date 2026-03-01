# Artist Waitlist System for Music Exclusive

A controlled pre-launch intake funnel to collect, manage, and approve Founding Artist applications ahead of the 2026 launch.

---

## Overview

This system creates a separate waitlist pipeline that sits in front of the existing artist onboarding flow. Artists apply via a public form, admins review and approve/reject from a new admin section, and approved artists receive an email linking them into the existing onboarding flow.

---

## 1. Database

### New table: `artist_waitlist`


| Column                             | Type        | Notes                       |
| ---------------------------------- | ----------- | --------------------------- |
| id                                 | uuid (PK)   | default `gen_random_uuid()` |
| artist_name                        | text        | NOT NULL                    |
| email                              | text        | NOT NULL                    |
| instagram                          | text        | nullable                    |
| other_social                       | text        | nullable                    |
| genre                              | text        | nullable                    |
| monthly_listeners                  | text        | nullable                    |
| What State/Country do you live?    | text        | NOT NULL                    |
| Where can we listen to your music? | text        | NOT NULL                    |
| status                             | text        | default `'pending'`         |
| created_at                         | timestamptz | default `now()`             |
| approved_at                        | timestamptz | nullable                    |
| approved_by                        | uuid        | nullable                    |


### RLS Policies

- **SELECT**: admin only (`has_role(auth.uid(), 'admin')`) + service_role
- **INSERT**: service_role only (submissions go through edge function)
- **UPDATE**: admin + service_role
- No DELETE

---

## 2. Edge Functions

### A. `submit-waitlist-application`

- Public endpoint (no JWT required)
- Validates required fields (artist_name, email)
- Rate-limits by email+IP (reuses `request_rate_limits` pattern)
- Inserts into `artist_waitlist` with `status = 'pending'`
- Sends admin notification email via Resend (to `support@musicexclusive.co`)
- Sends artist confirmation email via Resend with Founding Artist messaging and earnings scenarios

### B. `approve-waitlist-artist`

- Admin-only (uses shared `verify-admin` utility)
- Updates `artist_waitlist` row to `status = 'approved'`, sets `approved_at` and `approved_by`
- Sends approval email via Resend with link to `/artist/apply` (existing onboarding)

### C. `reject-waitlist-artist`

- Admin-only
- Updates status to `'rejected'`
- Sends polite decline email via Resend

---

## 3. Frontend Pages

### A. Landing Page Button (`src/pages/Index.tsx`)

- Add "Join the Artist Waitlist" button in the bottom CTA section (alongside existing artist CTA)
- Routes to `/artist-waitlist`

### B. Waitlist Landing Page (`src/pages/ArtistWaitlist.tsx`)

New page at `/artist-waitlist` with these sections:

1. **Hero**: "Become a Founding Artist" -- premium messaging about the platform
2. **What Is Music Exclusive**: Artist-first model, exclusive music streaming platform (pre- release), $0.20 per stream, artist earns $0.10, no ads, direct fan monetization
3. **Earnings Visual** (matching ArtistBenefits typography):
  - Scenario 1: 100 fans x 10 streams/week = $100/week = $400/month
  - Scenario 2: 600 fans x 10 streams/week = $600/week = $2,400/month
  - Uses same `GlowCard`, `SectionHeader`, large number styling, green dollar highlights
4. **Founding Artist Benefits**: Early access, badge, priority discovery, early monetization, exclusive release opportunities
5. **CTA**: "Apply to Join the Waitlist" button scrolls to or navigates to form

### C. Waitlist Application Form (`src/pages/ArtistWaitlistForm.tsx`)

New page at `/artist-waitlist/apply` with simplified form:

- Artist Name, Email, Instagram, Other Social Links, Genre, Monthly Listener Estimate, Short Bio, "Why do you want to join?"
- Terms checkbox
- Submits via `submit-waitlist-application` edge function
- On success, navigates to a confirmation page

### D. Waitlist Confirmation Page (`src/pages/ArtistWaitlistSubmitted.tsx`)

- Thank you message with Founding Artist positioning
- "We review applications in waves" messaging

### E. Admin Waitlist Dashboard (`src/pages/admin/AdminWaitlist.tsx`)

- New admin page at `/admin/waitlist`
- Table view: Artist Name, Email, Instagram, Genre, Date Applied, Status
- Approve / Reject buttons per row
- Calls `approve-waitlist-artist` or `reject-waitlist-artist` edge functions

### F. Admin Dashboard Link (`src/pages/admin/AdminDashboard.tsx`)

- Add "Artist Waitlist" card to the admin dashboard grid

---

## 4. Routing (`src/App.tsx`)

Add routes:

- `/artist-waitlist` -- public
- `/artist-waitlist/apply` -- public
- `/artist-waitlist/submitted` -- public
- `/admin/waitlist` -- AdminProtectedRoute

---

## 5. Emails (via Resend)

All three emails use the existing `RESEND_API_KEY` secret.

**Admin Notification**: New application details (name, email, socials, genre, date)

**Artist Confirmation**: Founding Artist positioning, earnings math ($100/week and $600/week scenarios), "launching 2026", "reviewed in waves", "founding spots are limited"

**Approval Email**: Congratulations, selected as Founding Artist, link to `/artist/apply` to complete full onboarding

**Rejection Email**: Polite decline, encouragement to reapply in the future

---

## 6. What Is NOT Modified

- Existing artist onboarding flow (apply, application form, approval, setup)
- Pricing structure
- Payment architecture
- Existing database tables

---

## Technical Details

- 1 new database table with migration
- 3 new edge functions
- 5 new page components
- 2 existing files modified (Index.tsx, AdminDashboard.tsx, App.tsx)
- Follows existing patterns: GlowCard, SectionHeader, verify-admin, rate limiting, Resend emails
- Dark luxury aesthetic matching current branding
- Mobile responsive using existing max-w-lg/md:max-w-2xl patterns