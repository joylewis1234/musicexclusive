

## Implementation Plan: Signed URL Playback for ExclusiveSongCard

All changes are in **`src/components/artist/ExclusiveSongCard.tsx`**. The 8 modifications you specified will be applied exactly as described:

### Changes

1. **Interface** — `full_audio_key` and `artwork_key` already exist in the interface (added in prior edit). No change needed.

2. **`isFinalizing`** — Already uses `full_audio_key`/`artwork_key` from prior edit. No change needed.

3. **Add `getSignedAudioUrl` helper** — New `useCallback` that calls `mint-playback-url` edge function to get a signed URL for the track.

4. **Replace audio readiness `useEffect`** — Instead of the simple key-presence check, perform a HEAD request against a signed URL with 5s timeout to verify audio is actually accessible.

5. **`canPlay`** — Already uses `full_audio_key` from prior edit. No change needed.

6. **`handlePlayFull`** — Make `async`, create `Audio()` element immediately (user gesture), then fetch signed URL and set `audio.src`.

7. **`handlePlayHook`** — Same pattern as handlePlayFull but seeks to `preview_start_seconds` and auto-stops after 15s.

8. **Duration detection `useEffect`** — Change dependency from `song.full_audio_url` to `song.full_audio_key`, fetch signed URL before calling `getAudioDurationFromUrl`.

9. **Add `previewAudioUrl` state + effect** — New state variable and effect that fetches a signed URL when the hook edit dialog opens, passed to `<PreviewTimeSelector>`.

10. **Artwork condition** — Change `song.artwork_url` to `song.artwork_key` for the cover art rendering conditional.

11. **Debug panel** — Update to show `artwork_key` and `full_audio_key` instead of the legacy URL fields.

### Technical Details
- File: `src/components/artist/ExclusiveSongCard.tsx`
- No new dependencies
- The `mint-playback-url` edge function is already deployed and handles `fileType: "audio"` requests
- Audio element is created before the async signed URL fetch to satisfy browser user-gesture requirements (especially iOS)

