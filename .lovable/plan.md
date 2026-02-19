

## Update Stream Confirmation Modal Text

### What Changes
Update the `StreamConfirmModal` component (`src/components/player/StreamConfirmModal.tsx`) to replace the current friendly messaging with formal copyright/legal language.

### Specific Text Changes

**Title:** "Stream this song?" → "Exclusive Pre-Release. Protected Content." (with lock emoji prefix)

**Body text** (replaces "Cost: 1 credit..." and "Thank you for supporting..."): 
- "This track is made available exclusively through Music Exclusive."
- "Unauthorized copying, recording, or redistribution of this content may constitute copyright infringement and may result in account termination and legal action by rights holders."
- "Playback sessions are monitored for abuse." (with shield emoji)
- "By continuing, you agree to stream for personal use only in accordance with our Terms of Service."

**Balance section, buttons, footer** — all remain unchanged.

**Insufficient credits state** — remains unchanged ("Not Enough Credits" title and messaging).

### Technical Details

**File:** `src/components/player/StreamConfirmModal.tsx`
- Replace the `DialogTitle` text for the `hasEnoughCredits` branch
- Replace the `DialogDescription` content for the `hasEnoughCredits` branch with the new multi-paragraph legal copy
- Remove the "Cost: 1 credit ($0.20)" line (the button still says "Stream Now (1 Credit)")
- Keep all existing balance display logic, button handlers, and insufficient-credits flow intact

