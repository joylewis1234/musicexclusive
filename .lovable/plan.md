

# Add Watermark Protection Statement to Artist Benefits Page

## What
A new section at the bottom of the page (between the CTA and the spacer) with a Shield/Lock icon, a bold statement that all releases are watermarked and protected, and a brief plain-language explanation of what forensic watermarking means for the artist.

## Design
- Subtle, trust-building footer-style section with muted styling
- Shield icon + bold title: "Every Release Is Watermarked & Protected"
- Short explanation: each stream is tagged with an invisible, unique identifier tied to the listener's session — if audio leaks, it can be traced back to the source. Masters are never modified; protection is applied dynamically at playback.
- Small reassuring closer line

## File Change
- `src/pages/ArtistBenefits.tsx` — Insert new section between line 607 (end of CTA section) and line 610 (spacer). Uses existing `Shield` icon import.

