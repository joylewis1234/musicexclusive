

## Plan: Add Vault explanation text under "TWO WAYS TO GET ACCESS"

Insert descriptive text explaining the Vault access mechanism under the "TWO WAYS TO GET ACCESS" header, matching the font and size of the "Become a superfan" heading.

### File
`src/pages/Index.tsx`

### Change
After the chevron arrows in the "Get Access Now Header" section (line 136), add a new paragraph that uses the same typography as "Become a superfan":

```tsx
{/* Get Access Now Header */}
<div className="text-center mb-8">
  <p className="text-3xl md:text-4xl font-display font-black tracking-wider text-foreground mb-4 text-glow">
    TWO WAYS TO GET ACCESS
  </p>
  
  {/* New descriptive text matching "Become a superfan" styling */}
  <h2 className="text-foreground text-center mb-6 max-w-md mx-auto">
    Submit your code for a chance at free access. Didn't win? You're automatically entered for the next draw.
  </h2>
  
  <div className="flex justify-center items-center gap-3">
    <ChevronDown className="w-8 h-8 text-primary animate-bounce" />
    <ChevronDown className="w-8 h-8 text-primary animate-bounce [animation-delay:150ms]" />
    <ChevronDown className="w-8 h-8 text-primary animate-bounce [animation-delay:300ms]" />
  </div>
</div>
```

The new `<h2>` uses the same classes as the "Become a superfan" heading (`text-foreground text-center`) with an added `max-w-md mx-auto` for readable line length and `mb-6` for proper spacing before the chevrons.

### Scope
- Single file: `src/pages/Index.tsx`
- One new element inserted
- Typography matches existing "Become a superfan" h2 styling
- No other layout or styling changes

