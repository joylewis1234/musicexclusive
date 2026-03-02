## Global Audio Engine — Implementation Plan

This is a large, multi-file refactor that centralizes all audio playback into a single engine, enforces strict preview/paid rules, and removes forbidden UI controls. Here is the step-by-step plan.

---

### **1) Update plan doc**

- **Replace** .lovable/[plan.md](http://plan.md) with the full 9‑step plan text.

---

### **2) useAudioPlayer enhancements**

File: src/hooks/useAudioPlayer.ts

- Ensure return includes:

- currentTrack (object: { trackId, fileType, trackTitle? })

- lastEndedTrackId

- lastEndedAt

- In audio ended event:

- set lastEndedTrackId

- set lastEndedAt = [Date.now](http://Date.now)()

- In loadTrack / loadPaidStream:

- clear lastEndedTrackId, lastEndedAt

- In play():

- if at end (currentTime >= duration - 0.1), reset to 0 before playing

---

### **3) Shared Audio Context**

File: src/contexts/AudioPlayerContext.tsx

- Wrap a single useAudioPlayer() instance.

- Expose:

- startPaidTrack(params) (uses loadTrack with fileType: "audio")

- startPreview(trackId, startSeconds?, onComplete?)

- stopPreview()

- previewState

- all useAudioPlayer fields

- **Rules enforced inside:**

- startPreview stops any paid stream first.

- startPaidTrack stops any preview first.

- Preview auto‑stops at 25 seconds and calls onComplete.

---

### **4) Wire provider in App**

File: src/App.tsx

<AuthProvider>

  <AudioPlayerProvider>

    <PlayerProvider>

      ...

---

### **5) useAudioPreview wraps shared context**

File: src/hooks/useAudioPreview.ts

- Remove its own audio element + Supabase calls.

- Use useSharedAudioPlayer() to:

- start preview

- stop preview

- read preview state

---

### **6) Discovery preview + modal**

File: src/pages/Discovery.tsx

- Tap Preview → play immediately (no pause/stop).

- After 25 seconds:

- stop playback

- show modal “Want to stream this track?”

- Modal:

- Stream → /artist/:id?track=:trackId&stream=1

- Not now → close modal only

File: src/components/discovery/DiscoveryTrackCard.tsx

- Preview button:

- disabled while previewing

- label = “Previewing”

- **icon = Play only** (no pause)

---

### **7) Artist Profile auto‑confirm**

File: src/pages/ArtistProfilePage.tsx

- If stream=1 param exists and track is selected:

- auto‑open StreamConfirmModal

- remove stream param so it fires once

---

### **8) Remove Stop + Seek controls (paid streams)**

**Important UI rule**

- **No stop button**

- **No seek/progress bar**

- **Only Play/Pause**

Apply to:

- src/components/player/VaultMusicPlayer.tsx

- src/components/playlist/PlaylistPlayerBar.tsx

---

### **9) Replay‑charge enforcement**

File: src/components/playlist/PlaylistSection.tsx

- If lastEndedTrackId === trackId, require StreamConfirmModal again.

File: src/pages/FanProfile.tsx

- Use lastEndedTrackId to enforce replay confirmation for player bar.

---

### **✅ Validation checklist**

- Paid stream persists across Discovery/Inbox/Profile

- Pause/resume doesn’t re‑charge

- Track end → replay requires confirmation + credit

- Preview always 25s with modal

- Preview UI has Play only

- Paid UI has Play/Pause only (no seek/stop)