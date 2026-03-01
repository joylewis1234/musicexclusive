# Player & Preview Behavior — Full Checklist

## 1) Paid Streaming (Core Behavior)
- [ ] Start a paid stream on an Artist Profile page.
- [ ] Navigate to Discovery → playback continues.
- [ ] Navigate to Inbox → playback continues.
- [ ] Navigate to Fan Profile → playback continues.
- [ ] Confirm stream once → exactly 1 credit charged.
- [ ] Pause the same track → no additional charge.
- [ ] Resume the same track → no additional charge.
- [ ] Let the track finish → session ends.
- [ ] Press play again after finish → confirmation required again.
- [ ] Confirm again → exactly 1 additional credit charged.

## 2) Discovery Preview Behavior
- [ ] Tap Preview on Discovery → plays immediately.
- [ ] Preview plays for exactly 25 seconds.
- [ ] Preview cannot be paused.
- [ ] Preview cannot be stopped.
- [ ] Preview cannot be resumed.
- [ ] At 25 seconds → playback stops automatically.
- [ ] “Want to stream this track?” modal appears after stop.
- [ ] Close modal → browsing continues, previews still work.

## 3) Preview → Stream Flow
- [ ] Click Stream in modal → navigates to Artist Profile.
- [ ] Stream confirmation modal opens automatically.
- [ ] Cancel stream confirmation → returns to Artist Profile without playback.
- [ ] Confirm stream → playback starts and 1 credit charged.

## 4) Playback Interaction Rules
- [ ] Starting a preview stops any currently playing paid stream.
- [ ] Starting a preview stops any currently playing preview.
- [ ] Starting a paid stream stops any preview immediately.

## 5) Error & UX Validation
- [ ] No playback errors in console.
- [ ] No stuck loading states.
- [ ] UI state matches playback state (play/pause indicators correct).

## 6) Regression Checks
- [ ] Fan playlist play/confirm flow still works.
- [ ] Artist profile stream confirm flow still works.
- [ ] Mini-player still reflects current playback.
