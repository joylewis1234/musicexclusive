

# Remove "Lottery" from Entire App

## Overview
Replace every instance of the word "lottery" across the app with appropriate alternatives. The specific subtext change requested: "Skip the lottery — guaranteed access" → "Skip the Vault — Guaranteed access". All other occurrences will be reworded to remove "lottery" while preserving meaning.

## Files and Changes

### 1. `src/pages/EnterVault.tsx`
- Line 248: `"Vault Lottery access system is Patent Pending"` → `"Vault access system is Patent Pending"`
- Line 470 (comment): `"Skip the lottery option"` → `"Skip the Vault option"`
- Line 483: `"✨ Skip the lottery — guaranteed access"` → `"✨ Skip the Vault — Guaranteed access"`

### 2. `src/components/preview/PreviewUpsellModal.tsx`
- Line 114: `"Unlock full access through the Vault Lottery or skip straight in as a Superfan."` → `"Unlock full access through the Vault or skip straight in as a Superfan."`
- Line 146 (comment): `"Vault Lottery"` → `"Vault Access"`
- Line 166: `"Enter the Vault Lottery"` → `"Enter the Vault"`

### 3. `src/components/preview/PreviewHeader.tsx`
- Line 41 (comment): `"Vault Lottery"` → `"Vault Access"`
- Line 49: `"Enter the Vault Lottery"` → `"Enter the Vault"`
- Line 54: `"Skip the lottery — get access now"` → `"Skip the Vault — get access now"`

### 4. `src/pages/InviteLanding.tsx`
- Line 114: `"Skip the lottery — create your account..."` → `"Skip the Vault — create your account and start listening to exclusive music."`

### 5. `src/pages/ArtistWaitlist.tsx`
- Line 91: `"no algorithm lottery"` → `"no algorithm games"`

### 6. `src/pages/Agreements.tsx`
- Line 28: `"VAULT ACCESS & LOTTERY SYSTEM"` → `"VAULT ACCESS SYSTEM"`
- Lines 30-35: Replace all "Lottery" references with "Vault" (e.g. "Vault Lottery System" → "Vault Access System", "win the Lottery" → "win access", "Lottery mechanics" → "Access mechanics")

### 7. `src/pages/Terms.tsx`
- Line 36: `"Vault Lottery System"` → `"Vault Access System"`
- Line 138: Section title `"Vault Lottery System"` → `"Vault Access System"`
- Lines 140-147: Replace all "Lottery" with "Vault" or "Access" as appropriate

### 8. `src/pages/FoundingSuperfan.tsx`
- Benefits list: `"Permanent Vault Lottery bypass"` → `"Permanent Vault bypass"`

### 9. `src/pages/FoundingSuperfanConfirmed.tsx`
- Line 10: `"Permanent Vault Lottery bypass"` → `"Permanent Vault bypass"`

### 10. `src/pages/Index.tsx`
- Search for any remaining "lottery" text and replace

### 11. `src/pages/Subscribe.tsx`
- Search for any "lottery" references and replace

### 12. Edge Functions (4 files)
- **`supabase/functions/send-superfan-welcome-email/index.ts`**: `"no lottery needed"` → `"no Vault entry needed"`, `"No lottery required"` → `"No Vault entry required"`
- **`supabase/functions/generate-superfan-invite/index.ts`**: `"no lottery needed"` → `"no Vault entry needed"`
- **`supabase/functions/submit-fan-waitlist/index.ts`**: `"Permanent Vault Lottery bypass"` → `"Permanent Vault bypass"`
- **`supabase/functions/validate-vault-code/index.ts`**: Comments only — `"lottery attempt"` → `"vault attempt"`, `"lottery outcome"` → `"vault outcome"`

## No structural or backend changes — text replacements only.

