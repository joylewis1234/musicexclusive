

## Plan: Equalize vertical spacing in hero CTA stack

Even out the vertical rhythm between the elements in the hero section on `/` (the homepage), so the micro-explainer, headline, supporting copy, and CTA stack are spaced consistently rather than having uneven gaps.

### Current state (`src/pages/Index.tsx`, hero section ~lines 108–147)

Each element uses its own ad-hoc bottom margin:
- Micro-explainer `<p>`: `mb-6`
- Headline `<h1>`: `mb-6`
- Copy block `<div>`: `mb-4` outer, `space-y-3` inner
- CTA stack `<div>`: `gap-4` between buttons, plus `my-2` on the "or" divider

This produces uneven visual gaps (24px, 24px, 16px, then mixed gaps inside the CTA stack).

### Change

Wrap the hero's inner content in a single flex column with one consistent gap, and remove the individual `mb-*` / `my-*` spacers so spacing is driven from one place.

**File:** `src/pages/Index.tsx` (hero section only, ~lines 107–148)

1. Change the inner `<div className="container max-w-lg md:max-w-2xl mx-auto">` to `<div className="container max-w-lg md:max-w-2xl mx-auto flex flex-col items-center gap-6">`.
2. Remove `mb-6` from the micro-explainer `<p>`.
3. Remove `mb-6` from the `<h1>`.
4. Remove `mb-4` from the supporting-copy `<div>` (keep inner `space-y-3` for the two paragraphs inside it).
5. Remove `my-2` from the "or" divider so it sits on the same 6-unit rhythm as the rest.
6. Keep the CTA inner stack's `gap-4` as-is (intentional tighter rhythm between the two buttons).

### Result
- Equal 24px (`gap-6`) vertical gap between: micro-explainer → headline → copy → CTA stack.
- No layout, color, animation, or copy changes.
- Buttons inside the CTA stack keep their existing internal spacing.

### Scope
- Single file: `src/pages/Index.tsx`
- ~5 className edits in the hero section. No new components, no backend.

