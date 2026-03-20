

## Add Artist Application Confirmation Email

**What's missing:** When an artist submits their application, only admins are notified. The applicant receives no email confirmation.

**What's already working:** Denial emails are sent via `handle-application-action` when an admin denies an application. No changes needed there.

### Plan

**Modify `supabase/functions/notify-new-application/index.ts`**

After the existing admin notification email is sent (around line ~250), add a second Resend email send to `application.contact_email` with:

- **From:** `Music Exclusive <noreply@themusicisexclusive.com>`
- **Subject:** "We Received Your Application, [artist_name]!"
- **HTML body:** Branded confirmation email matching the existing email style, containing:
  - Thank-you message using their artist name
  - Confirmation that the application is under review
  - Expected review timeline (3-5 business days)
  - Note that they'll receive an email with their approval status
  - Link to check application status
- Fire-and-forget (don't fail the response if this email fails)
- Log the result to `email_logs` with `email_type: "artist_application_confirmation"`

No frontend changes needed — the `ArtistApplicationSubmitted` page already tells the user to check their inbox.

