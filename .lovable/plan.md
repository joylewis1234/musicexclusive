

## Plan: Add Upgrade to Superfan Section on Fan Profile

### What changes

**`src/pages/FanProfile.tsx`** — single file:

Add a new section between the Wallet Balance Card (line 501) and the Cancel Membership button (line 503) that is **only visible when `!isSuperfan`**.

The section will use `GlowCard` with `glowColor="primary"` to match the existing design language and contain:
- A `Sparkles` icon + heading: "Upgrade to Superfan & Get More Perks"
- Two benefit lines with checkmark styling:
  - "✓ No more worrying about credits running out"
  - "✓ Monthly invite link to share with a friend"
- An "Upgrade to Superfan" button (variant `accent`) that navigates to `/subscribe`

The section renders only when `!isSuperfan` (meaning no active subscription and no cancellation scheduled), so it's hidden for current Superfans.

### No backend changes needed

This is purely a frontend UI addition — no new edge functions, database columns, or webhook changes required.

### Files changed

| File | Action |
|------|--------|
| `src/pages/FanProfile.tsx` | Add upgrade upsell section for non-Superfan fans |

