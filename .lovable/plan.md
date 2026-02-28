

## Remove Progress Bar and Stop Button from Vault Player

Remove two UI elements from the `CompactVaultPlayer` component used on the fan-facing artist profile page:

1. **Progress bar** -- the `Slider` element and time labels (currentTime / duration)
2. **Stop button** -- the square icon button in the bottom-left controls area

### Changes

**File: `src/components/profile/CompactVaultPlayer.tsx`**

- Delete the entire "Progress bar" section (lines ~224-237): the `Slider`, the time display `div` with `formatTime(currentTime)` and `formatTime(duration)`.
- Delete the "Stop button" (lines ~242-250): the `<button>` wrapping the `<Square>` icon.
- Remove unused imports: `Square` from lucide-react, `Slider` from ui/slider.
- Remove the now-unused `handleSeek`, `handleStop`, `formatTime`, and `progressPercent` helpers since nothing references them after the deletion.

No other files are affected. The play/pause, like, share, and vault-access-gate behaviors remain unchanged.

