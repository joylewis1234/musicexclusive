

## Improve the Preview Upsell Modal

Redesign `PreviewUpsellModal` to feel more cinematic and premium, matching the Vault aesthetic used throughout the app (glowing portals, neon gradients, sparkle effects).

### Current State

The modal is a basic `Dialog` with a lock icon, plain text, and flat buttons. It works but feels generic compared to the rich Vault visuals elsewhere in the app.

### Changes

**File: `src/components/preview/PreviewUpsellModal.tsx`** (full rewrite of the component interior)

**Visual upgrades:**
- Add the vault portal image (`vault-portal.png`) with animated glow rings (same pattern as VaultWinScreen)
- Sparkle accents around the portal using Lucide `Sparkles` icons with staggered pulse animations
- Glowing neon text shadow on the headline ("The Vault Is Calling")
- Gradient divider line between copy and CTAs (cyan-to-transparent, same as VaultWinScreen)
- Primary CTA button gets a stronger neon glow shadow and pulse effect
- Backdrop gets a slightly stronger blur and primary-tinted border glow

**Copy refinements:**
- Title: "The Vault Is Calling" (keep)
- Subtitle: "You've just heard a taste. The full experience lives inside." (keep)
- Body: tighten to emphasize exclusivity and urgency
- Vault Lottery button label: "Enter the Vault Lottery" with a key/unlock icon
- Superfan button: "Become a Superfan -- Instant Access" with crown/zap icon
- Sub-label below Superfan: "Skip the lottery. Listen now."

**Animation:**
- Portal image fades/scales in on mount using existing `animate-fade-in` class
- Glow rings use existing `animate-pulse` from Tailwind
- No new CSS keyframes needed -- reuses existing vault animation classes

**No database changes, no new files, no new dependencies.**

### Technical Details

**Modified file:** `src/components/preview/PreviewUpsellModal.tsx`

Changes:
1. Import `vault-portal.png`, `Sparkles`, `Unlock`, `Zap` from lucide-react
2. Replace the simple lock-icon header with a centered vault portal image block (same glow-ring pattern from `VaultWinScreen`)
3. Add text-shadow styling on the title for neon glow effect
4. Add gradient divider between description and buttons
5. Update button styling: primary CTA gets `shadow-[0_0_20px_hsl(var(--primary)/0.4)]` and pulse-glow class, secondary gets an icon
6. Tighten the body copy and button labels

No other files need changes. The modal's `open`/`onDismiss` API stays identical so `PreviewDiscovery.tsx` requires no updates.

