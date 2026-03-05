

## Analysis

Both changes you requested are already present in the codebase:

1. **`mint-playback-url` edge function** (lines 187-217): Already has the `if (requestedFileType !== "preview")` guard that skips vault access checks for preview requests. The code matches your snippet exactly.

2. **`DiscoveryTrackCard`** (lines 32-34): Already checks only `preview_audio_url` and `preview_audio_key` — not `full_audio_url` or `full_audio_key`.

## What needs to happen

The only action is to **deploy the edge function** so the live version matches the code. No code changes are needed.

### Implementation
- Deploy `mint-playback-url` edge function using the deploy tool.

