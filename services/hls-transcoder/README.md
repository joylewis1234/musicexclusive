# HLS Transcoder Service

Minimal external FFmpeg service that downloads raw audio from R2 and writes HLS outputs to `hls/{trackId}/...` in R2.

## Environment Variables

- `PORT` (default: 8788)
- `R2_ACCOUNT_ID`
- `R2_BUCKET_NAME`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `TRANSCODE_AUTH_TOKEN` (optional bearer token)
- `MAX_BODY_BYTES` (default: 1048576)
- `HLS_SEGMENT_SECONDS` (default: 6)
- `HLS_AUDIO_BITRATE` (default: 128k)

## Run (Docker)

```bash
docker build -t hls-transcoder .
docker run -p 8788:8788 --env-file .env hls-transcoder
```

## Request Example

```bash
curl -X POST http://localhost:8788/transcode \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"trackId":"<trackId>","artistId":"<artistId>","inputKey":"artists/<artistId>/audio/<trackId>.mp3"}'
```
