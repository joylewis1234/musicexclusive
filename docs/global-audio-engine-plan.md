# Global Audio Engine — Implementation Specification

## 1. Architecture Overview

A **single global `PlayerContext`** wraps the entire fan-facing app, owning one shared `HTMLAudioElement` and optional `Hls.js` instance. This guarantees:

- **Mutual exclusion**: only one audio source plays at a time (preview OR paid stream, never both).
- **Persistent playback**: music continues across tab navigation (Discover → Inbox → Profile).
- **Centralized credit enforcement**: replay logic and charge gating live in one place.

```
┌─────────────────────────────────────┐
│           PlayerContext             │
│  ┌───────────┐  ┌───────────────┐   │
│  │ Audio el  │  │  Hls.js inst  │   │
│  └───────────┘  └───────────────┘   │
│  state: isPlaying, currentTime,     │
│         duration, currentTrack,     │
│         playbackMode, error         │
├─────────────────────────────────────┤
│  API:                               │
│   startPreview(trackId, startSec,   │
│                onComplete)          │
│   startPaidTrack(params)            │
│   play() / pause() / stop()        │
│   seek(time) / setVolume(vol)       │
└─────────────────────────────────────┘
        │               │
   ┌────┴────┐     ┌────┴────┐
   │MiniPlayer│    │FeatureUI│
   │(global)  │    │(pages)  │
   └──────────┘    └─────────┘
```

---

## 2. Playback Modes

| Mode | Source | Duration | User Controls | Credit Cost |
|------|--------|----------|---------------|-------------|
| `preview` | Signed URL from `mint-playback-url-public-preview` | 25 s max | **No pause/stop** — auto-completes | Free |
| `paid` | HLS URL from `mint-playback-url` after `charge-stream` | Full track | Play/pause/seek/stop | 1 credit per session |

---

## 3. Context API Surface

### State

```typescript
interface PlayerState {
  playbackMode: "idle" | "preview" | "paid";
  currentTrackId: string | null;
  currentTrackTitle: string | null;
  currentArtistName: string | null;
  artworkUrl: string | null;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  error: string | null;
  previewProgress: number;        // 0-100 for preview mode
  lastEndedTrackId: string | null; // guards replay credit
  lastEndedAt: number | null;      // timestamp ms
}
```

### Actions

```typescript
interface PlayerActions {
  /** Free 25s preview — no pause allowed, calls onComplete when done */
  startPreview: (
    trackId: string,
    startSeconds?: number,
    onComplete?: () => void
  ) => void;

  /** Paid full-track playback — requires prior charge-stream call */
  startPaidTrack: (params: {
    trackId: string;
    hlsUrl: string;
    sessionId?: string | null;
    trackTitle?: string;
    artistName?: string;
    artworkUrl?: string;
  }) => void;

  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
}
```

---

## 4. Preview Rules (25-Second Non-Stoppable)

1. `startPreview(trackId, startSeconds, onComplete)` is called.
2. Any active paid stream is **immediately stopped**.
3. Audio loads from `mint-playback-url-public-preview`.
4. A 25-second countdown timer starts on `canplaythrough`.
5. **UI hides pause/stop** — only a progress ring is shown.
6. At 25 s (or track end, whichever first):
   - Audio stops.
   - `playbackMode` → `"idle"`.
   - `onComplete()` fires → consumer shows upsell modal.
7. If user taps another preview while one is active, the current preview stops and the new one starts.

### Preview State Machine

```
idle ──startPreview──▶ loading ──canplaythrough──▶ playing
                                                     │
                                          25s timer / ended
                                                     │
                                                     ▼
                                                   idle
                                              (onComplete fires)
```

---

## 5. Paid Stream Rules (Credit Enforcement)

### First Play

1. Consumer calls `charge-stream` edge function (idempotent via `idempotency_key`).
2. On success, consumer calls `startPaidTrack({ hlsUrl, ... })`.
3. Any active preview is **immediately stopped**.
4. HLS loads via `hls.js` (or native Safari HLS).
5. Full playback controls available (play/pause/seek/stop).
6. On track end or stop:
   - `lastEndedTrackId` ← `currentTrackId`
   - `lastEndedAt` ← `Date.now()`
   - `playbackMode` → `"idle"`

### Replay (Same Track)

1. Consumer checks `lastEndedTrackId === trackId`.
2. If match → must call `charge-stream` again (new `idempotency_key`).
3. Fresh HLS URL required — old session expired.

### Replay Detection Flow

```
User taps "Play" on track X
        │
        ▼
lastEndedTrackId === X?
   ├── NO  → check if already charged (idempotency)
   │         → charge-stream → startPaidTrack
   └── YES → show "Re-listen costs 1 credit" confirm
              → charge-stream (new key) → startPaidTrack
```

---

## 6. Mutual Exclusion Logic

```typescript
function startPreview(trackId, startSeconds, onComplete) {
  // 1. Kill any active paid stream
  if (state.playbackMode === "paid") {
    hls?.destroy();
    audio.pause();
    audio.src = "";
  }
  // 2. Kill any active preview
  clearPreviewTimer();
  // 3. Load preview URL & start
  ...
}

function startPaidTrack(params) {
  // 1. Kill any active preview
  if (state.playbackMode === "preview") {
    clearPreviewTimer();
    audio.pause();
    audio.src = "";
  }
  // 2. Kill any active paid stream
  hls?.destroy();
  // 3. Load HLS & start
  ...
}
```

---

## 7. File-by-File Implementation Plan

### New Files

| File | Purpose |
|------|---------|
| `src/contexts/PlayerContext.tsx` | Global audio engine provider + hook |

### Modified Files

| File | Changes |
|------|---------|
| `src/App.tsx` | Wrap fan routes in `<PlayerProvider>` |
| `src/layouts/FanLayout.tsx` | Consume `usePlayer()` for MiniPlayer |
| `src/components/MiniPlayer.tsx` | Read from `usePlayer()` instead of local state |
| `src/hooks/useAudioPlayer.ts` | **Deprecate or gut** — logic moves to PlayerContext |
| `src/hooks/usePublicAudioPreview.ts` | **Deprecate** — replaced by `startPreview()` |
| `src/hooks/useAudioPreview.ts` | **Deprecate** — replaced by `startPreview()` |
| `src/pages/Discovery.tsx` | Use `startPreview()` from context |
| `src/pages/PreviewDiscovery.tsx` | Use `startPreview()` from context |
| `src/components/player/VaultMusicPlayer.tsx` | Use `startPaidTrack()` from context |
| `src/pages/FanDashboard.tsx` | Use context for playback state |

### Migration Strategy

1. **Phase 1**: Create `PlayerContext.tsx` with full API.
2. **Phase 2**: Wire `App.tsx` + `FanLayout.tsx` + `MiniPlayer.tsx`.
3. **Phase 3**: Migrate preview consumers (Discovery, PreviewDiscovery).
4. **Phase 4**: Migrate paid consumers (VaultMusicPlayer, StreamConfirmModal).
5. **Phase 5**: Remove deprecated hooks.

---

## 8. MiniPlayer Integration

The `MiniPlayer` component (persistent bottom bar in `FanLayout`) reads directly from `usePlayer()`:

```tsx
const {
  playbackMode, currentTrackTitle, currentArtistName,
  artworkUrl, isPlaying, currentTime, duration,
  previewProgress, play, pause
} = usePlayer();

// Hide when idle
if (playbackMode === "idle") return null;

// Preview mode: show progress ring, no pause button
// Paid mode: show play/pause, seek bar, track info
```

---

## 9. Edge Function Dependencies

| Function | Used By | Purpose |
|----------|---------|---------|
| `mint-playback-url-public-preview` | `startPreview()` | Returns signed preview URL |
| `mint-playback-url` | `startPaidTrack()` | Returns signed HLS URL |
| `charge-stream` | Consumer (before `startPaidTrack`) | Deducts 1 credit, returns stream ID |
| `playback-telemetry` | Context (on play/pause/end) | Reports usage metrics |

---

## 10. Error Handling

| Scenario | Behavior |
|----------|----------|
| Preview URL fetch fails | Set `error`, stay in `idle`, toast message |
| HLS load fails | Fallback to direct URL, if that fails → `error` state |
| Insufficient credits | Consumer blocks `startPaidTrack` call, shows "Add Credits" |
| Network interruption mid-stream | HLS retry (built-in), surface error after 3 retries |
| Audio element `error` event | Capture in diagnostics, reset to `idle` |

---

## 11. Testing Checklist

- [ ] Preview plays for exactly 25s, no pause available
- [ ] Preview auto-triggers `onComplete` callback
- [ ] Starting a preview kills active paid stream
- [ ] Starting a paid stream kills active preview
- [ ] Replay of same track requires new credit charge
- [ ] Navigation between tabs doesn't interrupt playback
- [ ] MiniPlayer reflects correct mode (preview vs paid)
- [ ] Volume persists across track changes
- [ ] HLS fallback to direct URL works on Safari
- [ ] Error states display toast and reset to idle
