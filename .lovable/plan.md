

## Root Cause

The `ExclusiveSongCard` component determines if a track is still "finalizing" (shown as Processing) using this check:

```typescript
const isFinalizing = (!isFailed && !isProcessing) && 
  (song.status !== "ready" || !song.full_audio_url || !song.artwork_url);
```

Since the R2 migration, `full_audio_url` and `artwork_url` are **always null**. The app now stores `full_audio_key` and `artwork_key` instead. So `!song.full_audio_url` is always `true`, making every `ready` track appear as "Processing".

The same stale check exists in the dashboard polling logic.

## Fix

### 1. Update `ExclusiveSongCard.tsx` line 69
Change the `isFinalizing` check to use keys instead of URLs:

```typescript
const isFinalizing = (!isFailed && !isProcessing) && 
  (song.status !== "ready" || !song.full_audio_key || !song.artwork_key);
```

Also update the audio readiness check (line 78-79) since it depends on `full_audio_url` which is now always null — it should use the key-based playback system instead.

### 2. Update dashboard polling `hasFinalizing` check
In `ArtistDashboard.tsx`, the polling condition at line 98-100 also references `full_audio_url`/`artwork_url` indirectly. Confirm the filtered check at line 178-180 only uses `status`, which it already does — no change needed there.

### 3. Clean up orphaned `uploading` draft
Delete the remaining orphaned draft `65771175` that was missed by the earlier cleanup (it's now >30 min old with no keys).

### Technical Details
- **Files changed**: `src/components/artist/ExclusiveSongCard.tsx`
- **Database**: Delete 1 orphaned row from `tracks` table
- The `ExclusiveSong` type interface needs `full_audio_key` and `artwork_key` if not already present — verify and add to the type.

