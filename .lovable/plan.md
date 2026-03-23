## Plan: Update VaultWinCongrats Page

### Changes to `src/pages/VaultWinCongrats.tsx`

1. **Remove the "No extra auth email" info text** (lines 283) — delete the entire `div` with the `ShieldCheck` icon.  
2. **Make the Vault Code display bigger** (lines 191-199) — increase padding, make the "Your Vault Code" label larger, and increase the code font size:
  - Change `px-8 py-4` → `px-10 py-6`
  - Change label from `text-sm` → `text-base`
  - Change code from `text-3xl` → `text-4xl`

### Files changed


| File                             | Action                                                        |
| -------------------------------- | ------------------------------------------------------------- |
| `src/pages/VaultWinCongrats.tsx` | Remove "No extra auth email" text; enlarge Vault Code display |
