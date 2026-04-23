

## Plan: Vault portal softening + fan context section

Two targeted UI improvements in `src/pages/Index.tsx`.

### 1. Vault portal — soften the blend further

Widen the radial gradient mask and extend the fade range so the glow bleeds further into the background with no visible edge. Also boost the surrounding glow orbs.

**Changes:**
- Lines 188–190: Increase blur amounts
  - `blur-[80px]` → `blur-[100px]` on line 188
  - `blur-[60px]` → `blur-[80px]` on line 189
- Lines 195–198: Update mask gradient
  - `ellipse 70% 70%` → `ellipse 85% 85%`
  - `black 50%, transparent 100%` → `black 30%, transparent 90%`

### 2. Add "Your Streams Make a Difference" section

Insert a new section just above `<CashBonusFeed />` (around line 282) to give fans context before they see the earnings feed.

**Add:**
```jsx
<section className="px-4 py-12">
  <div className="container max-w-lg md:max-w-2xl mx-auto text-center">
    <SectionHeader title="Your Streams Make a Difference" align="center" />
    <p className="text-muted-foreground text-sm font-body mt-4 max-w-md mx-auto leading-relaxed">
      Every time you stream on Music Exclusive, your support goes directly to the artist — not a faceless algorithm. 
      Real fans funding real music. Here's what that looks like:
    </p>
  </div>
</section>
```

**Keep** `<CashBonusFeed />` immediately after this new section.

### Scope confirmation
- Single file: `src/pages/Index.tsx`
- No new imports needed (`SectionHeader` already imported)
- No backend changes
- Mobile-first layout preserved

