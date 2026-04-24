

## Plan: Refine homepage typography & spacing hierarchy

Apply typographic hierarchy principles to `src/pages/Index.tsx` so sections breathe consistently and the eye flows naturally from primary → secondary → tertiary content. Replace ad-hoc `<br />` spacers with proper margin utilities.

### Principles applied
- **Vertical rhythm**: use consistent section padding (`py-16` / `py-20`) instead of stacked `<br />` tags.
- **Hierarchy gaps**: larger gap above a new H1/H2 (group separator), smaller gap between a heading and its supporting copy (group binding).
- **Proximity**: tie supporting text to its heading (`mt-2`/`mt-3`), separate unrelated blocks with `mt-12`+.
- **Scale steps**: keep one dominant element per section; reduce competing weights.

### Changes in `src/pages/Index.tsx`

1. **"TWO WAYS TO GET ACCESS" block** (currently uses `<br /><br />` for spacing)
   - Remove the two `<br />` before the text.
   - Wrap the block with `mt-16 md:mt-20` for separation from the hero copy above.
   - Tighten heading→subheading: change `mb-4` on the H1 to `mb-3`.
   - "ENTER THE VAULT / SUBMIT YOUR CODE…" H2: remove the leading `<br /><br />`, replace with `mt-2` on the element so it binds to the heading above. Keep `mb-8` before chevrons (was `mb-6`) for clearer separation from the portal.

2. **Vault portal area**
   - Add `mt-4` to the portal wrapper so the chevrons aren't crowding it.
   - Below portal: increase spacing before the "or" divider from `mt-8` to `mt-16` (it's a new conceptual section).

3. **"or" + Superfan CTA**
   - "or" paragraph: change to `text-2xl mb-3` and add `mt-2` to the chevron container so the eye flows: or → ↓ → heading.
   - "Become a superfan" H2: keep current size, but tighten supporting copy with `mt-2` instead of default and `mb-2` between the two paragraphs (currently `mb-1` / `mb-4`) → use `mb-2` then `mb-6` before the button for clearer CTA isolation.

4. **"MUSIC EXCLUSIVE" wordmark section**
   - Current `py-8` is too tight for a brand moment. Change to `py-20` and remove the `mt-4` on the H2 (let section padding do the work).

5. **Section padding normalization**
   - "How It Works": `py-16` → keep, but add `mt-8` above the steps grid (already has `mt-8` — keep).
   - "Benefits": match `py-16`.
   - "Cash Bonus" intro section: `py-12` → `pt-20 pb-8` (more space above heading, less below so it binds to the feed component).
   - Add `pt-4 pb-16` wrapper consistency around `<CashBonusFeed />` and `<ChartsTeaser />` if they lack it (verify only — no internal changes).

6. **Bottom CTA section**
   - Heading→subheading: change `mb-4`/`mb-8` to `mb-3`/`mb-10` (tighter binding, more separation before button stack).
   - Button stack: change `gap-3` to `gap-4` for clearer tap targets and rhythm.

7. **"Are you an artist?" footer prompt**
   - Change `py-8` to `pt-4 pb-16` so it sits closer to the CTA group above (related) and farther from the footer.

### Out of scope
- No copy changes.
- No color, font-family, or font-size token changes (only utility class adjustments where noted).
- No component file edits outside `src/pages/Index.tsx`.

