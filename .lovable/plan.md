## Plan: Add "or" and "Become a superfan" above Superfan CTA

Insert two new lines above the "Superfans don't wait." text in the Superfan CTA section on the homepage.

### File

`src/pages/Index.tsx`

### Change

In the Superfan CTA `<div>` (lines 194-208), add before the existing `<p className="text-lg font-display font-bold text-foreground mb-1">`:

1. An "or" divider element (centered text with muted styling)
2. A "Become a superfan" headline (styled as an H3 with display font, centered)

The new order inside the Superfan CTA block:

- "or" (muted, medium, centered)
- "Become a superfan" (H3, display font, centered)
- "Superfans don't wait." (existing, kept as-is)
- "Unlimited access..." (existing)
- Button (existing)

### Implementation specifics

- "or": use `text-muted-foreground text-sm font-body text-center mb-2`
- "Become a superfan": use `<h3>` with `text-foreground text-xl font-display font-bold text-center mb-3`

No other changes to copy, styling, or functionality.