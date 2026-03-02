

## Discovery Preview Behavior

### **6) Discovery Preview Behavior**

File: src/pages/Discovery.tsx

When a user taps Preview:
- The track plays immediately.
- It plays for exactly 25 seconds.
- It cannot be paused.
- It cannot be stopped.
- It cannot be resumed (re-tapping the same track is ignored).

After 25 seconds:
- Playback stops automatically.
- A modal appears: "Want to stream this track?"
  - If they click **Stream**: Navigate to Artist Profile (`/artist/:id?track=:trackId&stream=1`) and open the stream confirmation modal.
  - If they close the modal: They can continue browsing and previewing other tracks.

File: src/components/discovery/DiscoveryTrackCard.tsx

- Preview button:
  - Disabled while previewing
  - Label = "Previewing"
  - **Icon = Play only** (no pause icon anywhere)
