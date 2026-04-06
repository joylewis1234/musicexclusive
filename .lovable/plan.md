

# Update CTA Buttons & Vault Animation Text

## Changes

### 1. `src/pages/Index.tsx` — Shorten all 4 CTA buttons to "Enter the Vault"
- **Line 157**: `"Enter the Vault for Access to Exclusive Music"` → `"Enter the Vault"`
- **Line 225**: same change
- **Line 310**: same change
- **Line 405**: same change

Also remove `whitespace-normal h-auto py-3` from line 154's button className since the shorter text will fit in one line.

### 2. `src/components/vault/VaultDoorAnimation.tsx` — No changes needed
The vault animation header text already says "The Vault Awaits" / "The Vault Has Opened" — these are status labels, not CTAs. If you want these changed too, let me know.

## Files modified
1. `src/pages/Index.tsx` — 4 text changes + cleanup button class on line 154

