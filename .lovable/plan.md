

## Plan: Increase "or" font size

Update the "or" divider text in the Superfan CTA section to use a larger font size.

### File
`src/pages/Index.tsx`

### Change
On line 195, change the "or" text from `text-sm` to `text-base`:

```tsx
- <p className="text-muted-foreground text-sm font-body text-center mb-2">or</p>
+ <p className="text-muted-foreground text-base font-body text-center mb-2">or</p>
```

### Scope
- Single class change: `text-sm` → `text-base`
- No other styling or copy changes

