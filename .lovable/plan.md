

# Route "Skip the Vault — Enter Now" Buttons Through /subscribe

## Overview
Change all "Skip the Vault" CTA buttons so they navigate to `/subscribe` instead of `/founding-superfan`. This lets users see the Superfan benefits page (which we just updated to show benefits before requiring login) rather than going directly to the founding superfan page.

## Changes (4 files, frontend only)

### 1. `src/pages/Index.tsx`
- **Line 172**: Change `navigate("/founding-superfan")` → `navigate("/subscribe")`
- **Line 340**: Change `navigate("/founding-superfan")` → `navigate("/subscribe")`

### 2. `src/pages/EnterVault.tsx`
- **Line 478**: Change `navigate("/founding-superfan")` → `navigate("/subscribe")`

### 3. `src/components/preview/PreviewHeader.tsx`
- **Line 61**: Change `navigate("/founding-superfan")` → `navigate("/subscribe")`

No backend, auth, payment, or route changes. Only updating navigation targets.

