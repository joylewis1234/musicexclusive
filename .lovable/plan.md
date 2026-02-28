

## Discovery Preview → "Stream This Track?" Modal

### What This Does
After 25 seconds of cumulative preview playback on the Discovery page, pause the audio and show a modal asking the fan if they want to stream the full track. "Stream this track" navigates to the artist profile with the track preselected and the charge confirmation modal ready.

### Changes (4 files)

---

**1. New file: `src/components/discovery/PreviewStreamModal.tsx`**

A modal component with:
- Title: "Want to stream this track?"
- Track title + artist name displayed
- "Stream this track" button -> calls `onStream()`
- "X" / "Not now" button -> calls `onDismiss()`
- Styled consistently with the existing `PreviewUpsellModal` pattern (Dialog + DialogContent)

---

**2. `src/hooks/useAudioPreview.ts` -- Change preview duration to 25s + add onLimitReached callback**

- Change `PREVIEW_DURATION` from `15` to `25`
- Add an optional `onPreviewLimitReached` callback parameter (or return a ref the caller can set)
- When the 25s timer fires (or the interval detects 25s elapsed), instead of just calling `stopPreview()`, also call `onPreviewLimitReached?.(trackId)` so Discovery knows which track hit the limit
- The hook still stops/pauses the audio when the limit is reached

---

**3. `src/pages/Discovery.tsx` -- Wire up the modal**

- Import the new `PreviewStreamModal`
- Add state: `showStreamModal` (boolean), `streamModalTrack` (the DbTrack that hit the 25s limit)
- Create a `previewLimitReachedRef` that the `useAudioPreview` hook calls when 25s is reached:
  - Set `streamModalTrack` to the track that was playing
  - Set `showStreamModal = true`
  - Call `stopPreview()` to pause audio
- "Stream this track" handler: `navigate(\`/artist/\${track.artist_id}\`, { state: { autoplayTrackId: track.id } })`
- "Not now" handler: close modal, allow more previews (no reset of cumulative time needed since the hook already stopped)

---

**4. `src/pages/ArtistProfilePage.tsx` -- Read `autoplayTrackId` from location state**

- Import `useLocation` from react-router-dom
- Read `location.state?.autoplayTrackId` on mount
- In the existing data fetch effect, after tracks are loaded: if `autoplayTrackId` matches a track, call `handleSelectTrack(matchedTrack)` to preselect it
- Then open the charge confirmation modal: `setPendingPlayTrack(playerTrack)` + `setShowStreamConfirm(true)`
- This reuses the existing `StreamConfirmModal` -- no auto-charge, the fan must confirm
- Clear the location state after consuming it (via `navigate(location.pathname, { replace: true, state: {} })`) to prevent re-triggering on refresh

### Technical Details

**useAudioPreview changes:**
The hook will accept a ref-based callback. Discovery sets `onLimitRef.current = (trackId) => { ... }`. When the 25s interval/timeout fires, the hook calls `onLimitRef.current?.(trackId)` before stopping. This avoids adding the callback to the hook's dependency array.

**Why not fire on takeover:**
When a user switches previews (clicks a different track), `stopPreview()` is called first which clears timers. The limit callback is only triggered by the timeout/interval reaching 25s, not by `stopPreview()`. So switching previews never shows the modal.

**ArtistProfilePage autoplay flow:**
1. Fan clicks "Stream this track" in modal
2. Navigation: `/artist/{artistId}` with `state: { autoplayTrackId: trackId }`
3. Page loads, fetches tracks
4. Finds matching track, calls `handleSelectTrack` (preselects in UI)
5. Opens `StreamConfirmModal` (fan sees "Stream Now (1 Credit)" button)
6. Fan confirms -> `chargeStream` runs -> playback begins via existing `shouldAutoPlay` flow

