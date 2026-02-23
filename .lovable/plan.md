

## Add HLS Playback with hls.js

### Overview
Integrate `hls.js` into the audio player so it prefers HLS streaming (via the Worker-guarded `hlsUrl`) when available, falling back to the existing signed R2 URL for direct playback.

### Steps

**1. Add `hls.js` dependency**
- Install `hls.js` (latest stable, ~1.5.x)

**2. Update `src/hooks/useAudioPlayer.ts`**

The `mintSignedUrl` function already receives `hlsUrl` from the edge function but currently ignores it. Changes:

- Import `Hls` from `hls.js`
- Add an `hlsRef = useRef<Hls | null>(null)` to track the HLS instance
- Update `mintSignedUrl` to also return `hlsUrl` from the response
- Update the signed-URL cache to store `hlsUrl` alongside `url` and `expiresAt`
- In `loadTrack`:
  - Destroy any existing `hlsRef.current` before loading a new track
  - After minting, check if `hlsUrl` exists:
    - If `Hls.isSupported()`: create `new Hls()`, call `hls.loadSource(hlsUrl)`, `hls.attachMedia(audioElement)`, listen for `Hls.Events.ERROR` to surface fatal errors
    - Else if the browser supports HLS natively (Safari — check `audio.canPlayType('application/vnd.apple.mpegurl')`): set `audio.src = hlsUrl` directly
    - Else: fall back to the existing signed R2 URL (current behavior)
- In `play`: when HLS is active, skip the signed-URL refresh logic (the Worker handles token-gated segments)
- In `stop`: call `hlsRef.current?.stopLoad()` before pausing
- In the cleanup effect: call `hlsRef.current?.destroy()` to release resources
- Add `hlsActive: boolean` to `PlaybackDiagnostics` so the debug panel shows which path is in use

**3. Update `src/components/player/VaultMusicPlayer.tsx` debug panel**
- Show the new `hlsActive` diagnostic field so developers can confirm HLS is being used

**4. Verification**
- After deployment, open DevTools Network tab
- Play a track that has HLS assets in R2 (`hls/{trackId}/master.m3u8`)
- Confirm `.m3u8` and `.ts` requests load from the Worker URL with `?token=` appended
- For tracks without HLS assets, confirm graceful fallback to signed R2 URL

### Technical Details

```text
loadTrack flow:
  mint-playback-url
       |
       v
  { url (signed R2), hlsUrl (Worker) }
       |
       v
  hlsUrl exists?
    YES --> Hls.isSupported()?
              YES --> new Hls() + loadSource + attachMedia
              NO  --> canPlayType('application/...mpegurl')?
                        YES --> audio.src = hlsUrl (Safari native)
                        NO  --> audio.src = url (signed R2 fallback)
    NO  --> audio.src = url (signed R2 fallback)
```

Key considerations:
- `hls.js` only needs to be imported/used in this one hook — no other files require changes
- The HLS instance must be destroyed before creating a new one (track change) or on unmount
- Fatal HLS errors should trigger a fallback to the signed URL so playback is never completely blocked
- The `play()` function skips URL refresh when HLS is active since segment tokens are baked into the playlist by the Worker

