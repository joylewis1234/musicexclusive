

## Plan: Add neon line divider under hero statement

Add a neon gradient line (matching the SectionHeader underline style) beneath the "Exclusive music from your favorite artists, only on Music Exclusive." text in the hero section.

### File
`src/pages/Index.tsx`

### Change
After the second `<p>` element on line 121 (the one containing "Exclusive music from your favorite artists..."), insert a centered neon divider span with the same styling as SectionHeader's underline:
- `h-0.5` height
- `rounded-full` ends
- `bg-gradient-to-r from-primary to-purple-500` gradient
- `shadow-neon-sm` glow effect
- `w-1/2 mx-auto` centered at half width

### Scope
- Single file: `src/pages/Index.tsx`
- One new element inserted after the target paragraph
- Matches existing SectionHeader neon underline aesthetic
- No other layout or styling changes

