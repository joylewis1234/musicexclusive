# HLS Transcoder Safeguards

The external HLS transcoder includes basic safeguards to keep processing stable:

- **Max request size**: reject overly large payloads early.
- **Configurable HLS settings**: segment length and audio bitrate are env-driven.
- **Temp isolation**: each job runs in its own temp directory.
# Extra: HLS WASM Safeguards

This file documents the guardrails added to the Cloudflare HLS WASM transcode worker.

## Safeguards

### 1) Max duration guard
- Env: `HLS_MAX_SECONDS`
- If set (>0), FFmpeg runs with `-t <seconds>` to avoid long CPU runs.

### 2) Lower bitrate retry
- First attempt: 128 kbps, 6s HLS segments.
- Retry attempt: 96 kbps, 10s HLS segments.
- Purpose: reduce CPU usage if the first run fails.

### 3) Large input guard
- Env: `HLS_MAX_INPUT_BYTES`
- If input bytes exceed this, the worker throws and the job is retried.

## Why
FFmpeg WASM in Workers is CPU/memory constrained. These safeguards reduce timeouts and queue backlogs while keeping Cloudflare-only execution.
