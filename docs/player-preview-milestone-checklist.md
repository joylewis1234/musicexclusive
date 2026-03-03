# Player & Preview Behavior — Full Checklist

## 1) Paid Streaming (Core Behavior)
- [ ] Start a paid stream on an Artist Profile page.
- [ ] Navigate to Discovery → playback continues.
- [ ] Navigate to Inbox → playback continues.
- [ ] Navigate to Fan Profile → playback continues.
- [x] Confirm stream once → exactly 1 credit charged.
- [ ] Pause the same track → no additional charge.
- [ ] Resume the same track → no additional charge.
- [ ] Let the track finish → session ends.
- [ ] Press play again after finish → confirmation required again.
- [ ] Confirm again → exactly 1 additional credit charged.
- [ ] Replaying from playlist bar after completion requires confirmation.

## 2) Discovery Preview Behavior
- [x] Tap Preview on Discovery → plays immediately.
- [x] Preview plays for exactly 25 seconds.
- [x] Preview cannot be paused.
- [x] Preview cannot be stopped.
- [x] Preview cannot be resumed.
- [x] At 25 seconds → playback stops automatically.
- [x] “Want to stream this track?” modal appears after stop.
- [x] Close modal → browsing continues, previews still work.
- [x] Preview button disables while preview is playing.

## 3) Preview → Stream Flow
- [x] Click Stream in modal → navigates to Artist Profile.
- [x] Stream confirmation modal opens automatically.
- [ ] Cancel stream confirmation → returns to Artist Profile without playback.
- [ ] Confirm stream → playback starts and 1 credit charged.
- [x] Stream auto-opens only once (query flag cleared).

## 4) Playback Interaction Rules
- [ ] Starting a preview stops any currently playing paid stream.
- [ ] Starting a preview stops any currently playing preview.
- [ ] Starting a paid stream stops any preview immediately.
- [ ] Starting a paid stream resets any active preview timers.

## 5) Error & UX Validation
- [ ] No playback errors in console.
- [ ] No stuck loading states.
- [ ] UI state matches playback state (play/pause indicators correct).
- [ ] Single audio engine persists across routes.

## 6) Regression Checks
- [x] Fan playlist play/confirm flow still works.
- [ ] Artist profile stream confirm flow still works.
- [ ] Mini-player still reflects current playback.
