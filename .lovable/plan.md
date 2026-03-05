

## Update `playback-guard.ts` with CORS Headers

Add a CORS headers object and apply it to every response path in the Cloudflare Worker, plus an OPTIONS preflight handler.

### Changes to `docs/cloudflare-workers/playback-guard.ts`

1. Add a `corsHeaders` constant after the `HLS_PREFIX` declaration:
   - `Access-Control-Allow-Origin: *`
   - `Access-Control-Allow-Methods: GET, OPTIONS`
   - `Access-Control-Allow-Headers: authorization, content-type, range`
   - `Access-Control-Expose-Headers: Content-Length, Content-Range`

2. Add OPTIONS preflight handling at the top of the `fetch` handler (before the token check):
   - Return `204` with `corsHeaders`

3. Spread `corsHeaders` into all existing `Response` constructors:
   - "Missing token" 401
   - "Invalid token" 401
   - "Not found" 404
   - HLS playlist 200
   - Raw segment 200

