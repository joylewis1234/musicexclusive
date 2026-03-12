

# Fix Charts Page Back Button

## Root Cause
`ChartsEligibilityCard.tsx` opens `/charts` via `window.open("/charts", "_blank")` — a new tab with no history. So `navigate(-1)` does nothing.

## Fix (two parts)

### 1. `src/components/artist/ChartsEligibilityCard.tsx`
Change both `window.open("/charts", "_blank")` calls to `navigate("/charts")` so it stays in the same tab and preserves history.

### 2. `src/pages/ChartsPage.tsx`
Add a fallback so the back button still works if someone lands directly on `/charts`:
```tsx
onClick={() => {
  if (window.history.length > 1) {
    navigate(-1);
  } else {
    navigate("/");
  }
}}
```

