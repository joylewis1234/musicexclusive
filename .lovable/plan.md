

# Vault Entry Redesign: Bank-Style Vault Animation

## Overview

Replace the current spinning prize wheel with a cinematic bank vault door animation that feels premium, immersive, and on-brand. The uploaded Pika-generated video of a futuristic vault door opening becomes the centerpiece of the reveal experience.

---

## 1. Proposed Vault-Style UX

### The Flow (replacing SpinWheel)

```text
Fan submits code
       |
       v
+------------------------------+
|  VAULT DOOR (closed, idle)   |
|  Subtle glow + ambient hum   |
|  "Determining your fate..."  |
+------------------------------+
       |  (2-3 second suspense)
       v
+------------------------------+
|  LOCK MECHANISM SPINS        |
|  Video plays: dial turning,  |
|  tumblers clicking            |
+------------------------------+
       |
   WIN?  /  LOSE?
      /        \
     v          v
+----------+  +----------+
| Door      |  | Door     |
| OPENS     |  | STAYS    |
| (video    |  | LOCKED   |
|  plays    |  | (stops   |
|  through) |  |  mid-    |
| Glow +    |  |  turn,   |
| reveal    |  |  red     |
+----------+  |  flash)  |
               +----------+
```

### Interaction Details

- **Idle State**: Static vault door frame (CSS/image) with a soft neon pulse. Text: "The Vault is deciding..."
- **Unlock Sequence**: The Pika video plays. The lock dial spins, tumblers click. Audio: metallic clicks generated via Web Audio API (reusing the existing `useWheelSounds` pattern).
- **Win Reveal**: Video plays fully -- door swings open. Screen floods with primary-color light. Transitions to existing `VaultWinScreen`.
- **Lose Reveal**: Video pauses/freezes at ~50% (before the door opens). A brief red pulse and a "lock snap" sound. Door stays shut. Transitions to existing `VaultLoseScreen`.

### Component Structure

- New: `VaultDoorAnimation.tsx` -- replaces `SpinWheel` as the reveal component
- Same interface: `{ result: "winner" | "not_selected", onComplete: () => void }`
- Drop-in replacement -- `VaultStatus.tsx` swaps one component, all other logic untouched

---

## 2. How the Pika Video Would Be Used

The uploaded MP4 (vault door opening) serves as the core animation asset:

- **Format**: MP4 video element, inline playback, muted by default (audio handled separately via Web Audio API for precise sync)
- **Storage**: Placed in `src/assets/vault-door-animation.mp4` and imported as an ES module
- **Win path**: Video plays from start to end (~3-4 seconds). On the final frame, a CSS transition fades to the result screen.
- **Lose path**: Video plays to approximately the midpoint (lock spinning but door not yet opening), then freezes. A CSS overlay (red-tinted pulse) indicates rejection before transitioning out.
- **Playback control**: Using an HTML `<video>` element with `ref` for programmatic `play()`, `pause()`, and `currentTime` control. The `timeupdate` event determines when to freeze for the lose state.

---

## 3. Win vs Lose Visual Differences

| Aspect | WIN | LOSE |
|--------|-----|------|
| Video playback | Plays to completion (door opens) | Freezes at ~50% (lock still turning) |
| Color overlay | Primary/cyan burst flood | Brief red/orange pulse |
| Sound | Triumphant chord (existing pattern) | Metallic clank + descending tone |
| Glow | Expanding radial glow outward | Glow contracts and dims |
| Text | "The Vault has opened for you" | "Not this time... but you're getting closer" |
| Transition | Fade to VaultWinScreen | Fade to VaultLoseScreen |
| Haptic | Unlock vibration (existing) | Short buzz |

---

## 4. Performance Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Video file size** | Medium | Compress MP4 to under 1MB using H.264 baseline profile. The current clip is short (~3-4s) so this is achievable. |
| **Mobile autoplay** | High | iOS and Android require `muted` + `playsinline` attributes. Since we handle audio separately via Web Audio API, the video stays muted -- autoplay works. |
| **Load time on slow connections** | Medium | Preload the video on the previous page (`SubmitVaultCode`) using a hidden `<link rel="preload">` tag. Show CSS-only vault door frame as immediate fallback while video buffers. |
| **Older devices / low RAM** | Low | The video is short and small. Fallback to a CSS-only animation (pulsing vault image + lock icon rotation) if video fails to load. |
| **Battery drain** | Low | Single short video, not looped. Minimal impact. |

---

## 5. Recommendation: Implementation Strategy

**Recommended: Premium animation layer (Option B)**

- Keep the existing `SpinWheel` as the default animation
- Add `VaultDoorAnimation` as an alternative that can be toggled
- Use a feature flag or a simple prop on `VaultStatus`: `animationStyle: "wheel" | "vault-door"`
- This lets you A/B test which animation converts better (higher engagement, more Superfan upsells)
- Once validated, promote vault-door to default and deprecate the wheel

### Why not a full replacement right now?
- The wheel is battle-tested and works
- The video asset may need iteration (different angles, branding overlays)
- A/B testing gives you data before committing

### Why not "future enhancement"?
- The video asset already exists and is high quality
- Implementation is straightforward (one new component, same interface)
- It can ship alongside the wheel with zero risk to existing users

---

## 6. Fallback Plan

```text
Video loads? ──YES──> Play vault door animation
     |
     NO (timeout 3s or error event)
     |
     v
Show CSS-only fallback:
  - Static vault door image (vault-portal.png, already in assets)
  - CSS keyframe: lock icon rotates 720deg over 3s
  - Pulsing neon glow rings (reuse existing GlowCard patterns)
  - Same timing: 3-4s total, then reveal result
     |
     v
Transition to VaultWinScreen / VaultLoseScreen (unchanged)
```

Implementation detail:
- `<video>` element gets an `onCanPlayThrough` handler to confirm readiness
- A 3-second timeout races against video load
- If timeout wins, swap to CSS fallback seamlessly
- The `onComplete` callback fires at the same timing regardless of which animation played

---

## 7. Safe Preview Strategy

### Route: `/vault-preview`

- A dev-only route (gated behind `import.meta.env.DEV`) that renders the `VaultDoorAnimation` component in isolation
- Two buttons: "Preview WIN" and "Preview LOSE" -- same pattern as the existing dev controls on `VaultStatus`
- No database calls, no email triggers, no Supabase interaction
- Does not appear in production builds

### Alternative: Storybook-style preview
- Render the component directly inside the existing `VaultStatus` dev controls panel
- Add a third button: "Use Vault Door Animation" that toggles between wheel and vault-door
- Zero new routes needed, contained within existing dev tooling

### Recommended approach: Add toggle to existing dev controls
- Least invasive, reuses the yellow "Developer Test Controls" panel already on `VaultStatus`
- Add a toggle: `Animation: [Wheel] [Vault Door]`
- Preview both win and lose with either animation style

---

## Technical Summary

### Files to create
- `src/components/vault/VaultDoorAnimation.tsx` -- new component, same interface as SpinWheel

### Files to modify
- `src/pages/VaultStatus.tsx` -- add animation style toggle (dev controls) and conditional rendering
- Copy video asset to `src/assets/vault-door-animation.mp4`

### Files NOT touched
- All backend logic (Supabase, edge functions, vault_codes table)
- `VaultWinScreen.tsx`, `VaultLoseScreen.tsx`, `VaultPendingScreen.tsx`
- `SpinWheel.tsx` (preserved as-is)
- Auth flow, payment flow, streaming logic
- No new routes in production

