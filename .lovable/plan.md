

## Fix: Eliminate Double `mint-playback-url` Calls

### Root Cause

The `CompactVaultPlayer` component creates its own `useAudioPlayer()` instance (not the shared context one). When a track is selected on the Artist Profile page:

1. **Call #1**: `CompactVaultPlayer`'s `useEffect` (line 62) fires on `track.id` change, calling `loadTrack({ fileType: "audio" })` which invokes `mint-playback-url`
2. **Call #2**: After stream confirmation succeeds, the `autoPlay` effect (line 80) calls `play()`, which may re-mint the URL if it detects expiry, or the race between the two calls causes an `AbortError` when the second `play()` interrupts the first

Meanwhile, `charge-stream` already returns an `hlsUrl` and `sessionId` in its response, but these are completely ignored — the player independently mints its own URL.

### Solution

**Stop eagerly loading the full audio track on selection.** The `CompactVaultPlayer` should only load artwork/metadata on track selection, not call `mint-playback-url` for audio until playback is actually confirmed and paid for. Then, use the `hlsUrl` returned by `charge-stream` directly instead of minting a separate one.

### Changes

#### 1. `src/components/profile/CompactVaultPlayer.tsx`
- Remove the `useEffect` that calls `loadTrack({ fileType: "audio" })` on every `track.id` change (lines 62-67)
- Instead, only load the track when playback is actually triggered (after charge confirmation)
- Accept the `hlsUrl` and `sessionId` from the parent (returned by `charge-stream`) and use `loadPaidStream()` directly

#### 2. `src/pages/ArtistProfilePage.tsx`
- After `handleStreamConfirm` succeeds, pass the `hlsUrl`/`sessionId` from `chargeStream()` result down to trigger playback
- Store the charge result's `hlsUrl` and `sessionId` in state, pass to `CompactVaultPlayer`
- Remove the `shouldAutoPlay` → `play()` indirection; instead directly call `loadPaidStream` with the charge result

#### 3. `src/hooks/useAudioPlayer.ts` (no changes needed)
- `loadPaidStream` already accepts `hlsUrl` and handles HLS setup — it just needs to be called instead of the redundant `loadTrack` + `play` path

### Technical Details

```text
Current flow (2 mint calls):
  select track → loadTrack("audio") → mint-playback-url #1
  confirm stream → charge-stream (returns hlsUrl, ignored)
  autoPlay → play() → possibly mint-playback-url #2

Fixed flow (0 mint calls for audio):
  select track → no audio loading (just UI selection)
  confirm stream → charge-stream → returns hlsUrl
  use hlsUrl → loadPaidStream(hlsUrl) → direct HLS playback
```

The `skipPlayConfirm` path (replay after already charged) will need its own `mint-playback-url` call via `loadTrack`, but that's a single call — not a double.

