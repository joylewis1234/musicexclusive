

## Plan: Move Vault Portal under hero copy (keep "MUSIC EXCLUSIVE™" in place)

Reorder the homepage so the animated Vault Portal appears under the hero supporting copy, but leave the **"MUSIC EXCLUSIVE™"** wordmark where it currently sits (in its original section, after the portal's old location).

### File
`src/pages/Index.tsx`

### Change

Split the existing **Vault Portal Section** into two pieces:

**Move into the hero `<section>`** (insert between the supporting-copy `<div>` and the CTA `<div className="flex flex-col gap-4 items-center …">`):
- The "GET ACCESS NOW" header + chevrons
- The animated portal block (all glow orbs, vault ring, lightning layers, vault image, centered "Enter the Vault" button overlay)

**Leave in place** (stays in its current section, in current position on the page):
- The `<h2>` "MUSIC EXCLUSIVE™" wordmark

The now-emptied outer `<section>` keeps its container wrapper so the wordmark renders in the same spot with the same spacing as today.

### Result
New homepage order:
1. Header
2. Artist Preview Strip
3. Hero: micro-explainer → headline → supporting copy → **GET ACCESS NOW + Vault Portal animation** → CTA stack
4. Section containing only the **MUSIC EXCLUSIVE™** wordmark (unchanged position)
5. Artists carousel
6. How It Works
7. … (rest unchanged)

### Scope
- Single file edit, pure reordering. No style, copy, animation, or logic changes.
- Hero's `flex flex-col items-center gap-6` rhythm spaces the portal consistently with the rest of the hero.
- "MUSIC EXCLUSIVE™" wordmark stays exactly where it is today.

