

# Upgrade ChartsEligibilityCard to Match Spec

## Current State
`ChartsEligibilityCard` already exists at `src/components/artist/ChartsEligibilityCard.tsx` and is already rendered on the ArtistDashboard at line 793. It works but uses `useEffect`/`useState` instead of React Query, lacks a skeleton loading state, has no error state, no "Total bonus earned" summary, no "View Charts" button on the progress card, and doesn't use shadcn Card.

## DB Schema Note
The user's requested column names (`milestone_streams`, `bonus_amount`, `cash_bonus_complete`) don't exist. The actual columns are `milestone`, `prize_usd`, and `status`. There is no `cash_bonus_complete` column — eligibility is determined by all 4 milestones having `status = 'paid'`. The implementation will use the real column names.

## Changes (single file: `src/components/artist/ChartsEligibilityCard.tsx`)

### 1. Switch to React Query
- Replace `useEffect`/`useState` with `useQuery` from `@tanstack/react-query`
- `queryKey: ['bonus-milestones', artistProfileId]`
- Query selects `milestone, prize_usd, status` from `bonus_milestones`

### 2. Use shadcn Card
- Wrap content in `Card` component for consistency with `AgreementStatusCard`

### 3. Add skeleton loading state
- Use `Skeleton` component to show placeholder matching card height

### 4. Add error state
- Show muted text: "Unable to load bonus progress. Contact support@musicexclusive.co"

### 5. Add "Total bonus earned" summary
- Below milestone rows: "Total bonus earned: $X of $300" (sum of `prize_usd` where `status = 'paid'`)

### 6. Add "View Charts" button to progress card
- Same style as the eligible card's button but muted/outline variant

### 7. Keep existing visual styles
- Gold border for eligible state, muted purple for progress state
- Green checkmark for paid, amber for reached, gray circle for pending

No changes to `ArtistDashboard.tsx` — the card is already placed correctly after `AgreementStatusCard`.

