

## Update Plan: Discovery Preview Behavior

The current code in `Discovery.tsx` and `DiscoveryTrackCard.tsx` already implements these rules correctly:
- Tap preview → plays immediately, no pause/stop allowed, ignores re-taps on same track
- Auto-stops at 25s → shows "Want to stream?" modal
- Stream → navigates to artist profile with `stream=1`
- Dismiss → user continues browsing freely

**Only change needed:** Update `.lovable/plan.md` section 6 to spell out the exact rules as specified.

### What changes

**File:** `.lovable/plan.md` — Replace section 6 (lines 99-126) with:

```markdown
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
```

No code changes required — the implementation already enforces all these rules.

