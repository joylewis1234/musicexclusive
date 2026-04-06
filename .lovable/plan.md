# Add "Test Out Music Exclusive" Button to Bottom CTA

## Change

In `src/pages/Index.tsx`, add a new button above the "Enter the Vault" button (line 392) that reads **"Test Out Music Exclusive"** and navigates to `/preview`. Use `variant="outline"` with `size="lg"` and `w-full` to match the other buttons in the section.

## File modified

`**src/pages/Index.tsx**` — Insert a new `<Button>` block between lines 392 and 393:

```tsx
<Button 
  variant="outline" 
  size="lg" 
  className="w-full"
  onClick={() => navigate("/preview")}
>
  Test Out Music Exclusive
</Button>
```

Single file, single insertion. No backend changes.