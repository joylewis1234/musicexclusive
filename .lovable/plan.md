

## Plan: Fix Discovery Preview Loop + Verify Full Flow

### Problem
The cleanup `useEffect` in `Discovery.tsx` (lines 168-172) depends on `[stopPreview]`, which changes on every render because `stopPreview` is recreated when `previewId` changes. This causes the effect to fire cleanup → call `stopPreview()` → reset state → re-render → loop, preventing the 25s preview from completing and the upsell modal from firing.

### Changes

**1. Fix render loop in `src/pages/Discovery.tsx`**
- Add `useRef` to imports (line 1)
- Add a `stopPreviewRef` that tracks the latest `stopPreview` function
- Replace the `useEffect(() => { return () => { stopPreview(); }; }, [stopPreview])` with a stable cleanup that uses the ref and has `[]` deps

**2. Verify remaining files — no changes needed**
All other files already match the spec:
- **`DiscoveryTrackCard.tsx`**: Preview button disabled during preview, Play icon only, no pause — ✅
- **`useAudioPreview.ts`**: Thin wrapper over shared context — ✅
- **`AudioPlayerContext.tsx`**: 25s timer with `setInterval`, auto-stops, fires `onComplete` callback — ✅
- **`ArtistProfilePage.tsx`**: `autoStream` + `selectedTrack` triggers `showStreamConfirm` modal, cleans up `stream` param — ✅
- **`CompactVaultPlayer.tsx`**: `handlePlayPause` calls `onPlay()` and returns without playing when `!skipPlayConfirm` — ✅

### Technical Detail

The only code change is in `Discovery.tsx`:

```typescript
// Line 1: add useRef to import
import { useState, useMemo, useCallback, useEffect, useRef } from "react";

// Replace lines 168-172 with:
const stopPreviewRef = useRef(stopPreview);
useEffect(() => {
  stopPreviewRef.current = stopPreview;
}, [stopPreview]);

useEffect(() => {
  return () => {
    stopPreviewRef.current();
  };
}, []);
```

This is the sole root cause — all other pieces are correctly wired.

