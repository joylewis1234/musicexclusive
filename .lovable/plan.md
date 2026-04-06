

# Polish Superfan CTA — Larger, Tighter, More Premium

## File: `src/pages/Index.tsx` — Two identical blocks (hero ~lines 153-178, second vault ~lines 320-345)

### Changes to both Superfan blocks:

1. **Tighten divider spacing & enlarge "or"**
   - Change `my-4` → `my-2` on the divider wrapper
   - Change `text-[10px]` → `text-sm` on the "or" text
   - Change `opacity-70` → `opacity-80`

2. **Enlarge "Instant Access" badge**
   - Change `text-[10px]` → `text-xs` and add slightly more padding `px-4 py-1`

3. **Enlarge headline**
   - Change `text-sm` → `text-base` on "Want instant access?"

4. **Make button larger**
   - Change `size="lg"` → `size="xl"` on the Superfan button

5. **Make "Instant access. No waiting." glow**
   - Change from `text-primary/80 text-xs` to `text-primary text-sm` with inline `textShadow` for neon glow effect:
   ```tsx
   <p className="text-primary text-sm font-body mt-2 text-center animate-glow-pulse"
     style={{ textShadow: '0 0 8px hsl(var(--primary) / 0.6), 0 0 20px hsl(var(--primary) / 0.3)' }}>
     Instant access. No waiting.
   </p>
   ```

No backend, auth, payment, or route changes.

