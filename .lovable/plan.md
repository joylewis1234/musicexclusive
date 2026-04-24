## Create ME Monogram Favicon

**Goal:** Replace the current favicon with the circled "ME" badge design from the header.

**Current State:**
- Header has an 18px circular ME badge with:
  - Border: `border-primary/50` (teal at 50% opacity)
  - Background: `hsla(var(--primary) / 0.15)` (teal at 15% opacity)
  - Glow: `box-shadow: 0 0 6px hsla(var(--primary) / 0.4)`
  - Text: "ME" in primary color (teal), 7px font, bold
- Current favicon path: `/favicon.png`

**Implementation Plan:**

1. **Generate Favicon Image**
   - Create a Python script using PIL/Pillow to generate a 512x512 PNG (high-res for modern browsers)
   - Match the ME badge aesthetic:
     - Circular badge design
     - Teal (#3B82F6 or primary color from CSS)
     - "ME" text centered
     - Semi-transparent fill with glow effect
   - Save to: `public/favicon.png`

2. **Verify Favicon Link**
   - `index.html` already references `/favicon.png` on line 9
   - No HTML changes needed

**Technical Details:**
- The primary color from CSS `hsl(var(--primary))` maps to approximately #3B82F6 (Tailwind blue-500/teal)
- Will create a clean, scalable version suitable for all device sizes (favicon, Apple touch icon, etc.)

**Files to Modify:**
- `public/favicon.png` (replace with new ME design)

**Approvals Needed:** None — this is a pure frontend asset update.