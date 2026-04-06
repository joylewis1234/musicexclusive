

# Update Step 3 Text on Homepage

## Change
In `src/pages/Index.tsx`, update the `steps` array entry for step 3:

- **Title**: `"TRY AGAIN TOMORROW"` → `"GET INSIDE"`
- **Description**: Replace with `"When your code is triggered, the Vault opens — revealing exclusive music and artist experiences. If not yet activated, you'll be notified by email as soon as your access is ready."`

Single file, single array entry change. The StepCard component already handles long descriptions with wrapping text — no layout changes needed.

## File modified
`src/pages/Index.tsx` — lines ~73-77 (step 3 object in the `steps` array)

