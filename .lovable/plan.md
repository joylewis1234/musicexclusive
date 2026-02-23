
## Update Worker Binding Name to Match Cloudflare Config

### What Changed
Your Cloudflare Worker has the R2 bucket bound as `R2_BUCKET`, but the reference implementation in `docs/cloudflare-workers/playback-guard.ts` uses `HLS_BUCKET`. This needs to align.

### Changes

**1. `docs/cloudflare-workers/playback-guard.ts`**
- Rename the `Env` interface field from `HLS_BUCKET` to `R2_BUCKET`
- Update the `env.HLS_BUCKET.get(key)` call to `env.R2_BUCKET.get(key)`
- Update the `wrangler.toml` comment to show `binding = "R2_BUCKET"`

Everything else is already correct:
- `HLS_PREFIX = "hls"` correctly prepends `hls/` to the R2 key path
- `mint-playback-url` builds `hlsUrl` as `{workerBase}/{trackId}/master.m3u8` (no `hls/` prefix, since the Worker adds it)
- The Worker constructs the final key as `hls/{trackId}/master.m3u8`, matching R2 storage layout

### Technical Details

```text
Request URL:  https://r2-playback-gate.../abc123/master.m3u8?token=...
Worker path:  abc123/master.m3u8
R2 key:       hls/abc123/master.m3u8   (HLS_PREFIX + "/" + path)
R2 object:    hls/abc123/master.m3u8   (matches actual R2 layout)
```

This is a documentation-only change. No edge function or client code changes needed.
