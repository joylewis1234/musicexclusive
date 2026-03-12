

# Fix Cash Bonus Milestone Prize Amounts

## Files to Update (4 total)

### 1. `src/components/artist/ChartsEligibilityCard.tsx` (line 16-17)
Change 5k from $75→$100, 10k from $150→$125

### 2. `supabase/functions/check-bonus-milestones/index.ts` (line 11-12)
Change 5k from $75→$100, 10k from $150→$125

### 3. `src/pages/admin/AdminCashBonusTracker.tsx` (line 53-54)
Change 5k from $75→$100, 10k from $150→$125

### 4. `docs/cash-bonus-exclusive-charts-blueprint.md` (lines 26-27, 581, 685)
Update blueprint documentation to reflect correct amounts

### 5. `src/components/artist/agreement/AgreementTextContent.tsx`
Already correct ($25/$50/$100/$125/$300) — no changes needed.

## Confirmation After Fix
- 1k = $25 ✓
- 2.5k = $50 ✓
- 5k = $100 ✓
- 10k = $125 ✓
- Total = $300 ✓

