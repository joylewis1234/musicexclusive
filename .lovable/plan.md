

# Add Song Timer to Music Players

## What changes
Add a current time / duration timer display to the two main player components where fans listen to music:

1. **CompactVaultPlayer** (Artist Profile page) — replace the static duration badge with a live `currentTime / duration` timer when a track is loaded
2. **MiniPlayer** (bottom bar on fan pages) — add a small timer next to the track info showing elapsed time / total duration

Both components already have access to `currentTime` and `duration` via `useSharedAudioPlayer()`.

## Technical details

### Helper
A shared `formatTime(seconds)` function: `M:SS` format (e.g. `3:42`). Already exists in `MusicPlayer.tsx` — will extract or duplicate inline.

### CompactVaultPlayer.tsx
- Destructure `currentTime` from `useSharedAudioPlayer()` (already has `duration`)
- Replace the static duration-only badge (lines 255-263) with a live timer showing `currentTime / duration` when playing/paused, falling back to just duration when idle
- Add a thin progress bar below the track info area for visual feedback

### MiniPlayer.tsx
- Destructure `currentTime` and `duration` from `useSharedAudioPlayer()`
- Add a small `currentTime / duration` text below the artist name
- Add a thin progress bar at the bottom of the mini player container

### Visual style
- Timer text: `text-[10px] font-mono text-muted-foreground/70` (matches existing duration badge style)
- Progress bar: 2px height, primary color fill, placed at the bottom edge of each player container

## Files modified
1. `src/components/profile/CompactVaultPlayer.tsx`
2. `src/components/MiniPlayer.tsx`

No backend changes. No new dependencies.

