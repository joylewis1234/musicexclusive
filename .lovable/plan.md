
Goal: verify whether this is (A) JS/chunk delivery problem, (B) SPA fallback misrouting, or (C) runtime boot failure, then apply the smallest safe fix.

What I already confirmed in this repo
1) `/preview` route is correctly wired in `src/App.tsx` (public route).
2) `PreviewDiscovery` correctly calls `get_public_preview_tracks` and renders empty state safely.
3) Public preview audio path is correctly coded in `usePublicAudioPreview` and uses:
   - `VITE_SUPABASE_PROJECT_ID`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
4) Preview migrations exist in `supabase/migrations`:
   - `is_preview_public` column on `tracks`
   - `get_public_preview_tracks()`
   - `get_public_preview_audio_key()`
5) No custom hosting config files are present in repo (`vercel.json`, `netlify.toml`, `_redirects`, etc.), so routing behavior is platform-managed.

Important observed signal
- Published `/` and `/preview` both render as black screens in screenshots.
- The available “fetch website” tool strips script/head details, so we cannot treat its HTML output as definitive for asset/script presence.
- Snapshot console/network from your preview had no captured entries at message time.

Implementation plan
1) Gather authoritative runtime evidence from the published domain
   - Check console specifically for:
     - `Failed to load module script`
     - `Unexpected token <`
     - `ChunkLoadError` / dynamic import failures
   - Check network for `assets/*.js`:
     - status must be `200`
     - `Content-Type` must be `text/javascript` (or valid JS MIME)
     - response body must be JS, not HTML
   - Test both:
     - `https://musicexclusive.lovable.app/`
     - `https://musicexclusive.lovable.app/preview`

2) Branch by outcome
   - If JS asset requests return HTML (or wrong MIME): classify as hosting/routing delivery issue (platform-level), not app logic.
   - If JS assets load correctly but app is blank: classify as runtime boot failure (likely env/init/import crash).
   - If only direct `/preview` fails while `/` works: classify as SPA fallback route handling issue.

3) Apply code hardening only for runtime-class failures
   - Add explicit startup env guard with user-visible fail message (instead of silent blank screen).
   - Add robust lazy-chunk recovery handler (reload prompt/retry on chunk load failure).
   - Replace `Suspense fallback={null}` with visible loading/error shell to avoid “pure black” ambiguity.

4) Keep preview feature path untouched
   - No behavior changes to:
     - `get_public_preview_tracks`
     - `is_preview_public` filtering
     - `mint-playback-url-public-preview`
   - This remains a deployment/runtime stabilization pass only.

5) Verification matrix after changes
   - Published `/` loads UI.
   - Direct deep link `/preview` loads UI.
   - `assets/*.js` respond 200 + JS MIME.
   - No module/chunk parse errors in console.
   - Preview track list still loads (including empty-state safety).

What to avoid
- Do not assume this is DB/migration-related (those paths are already present and correctly wired).
- Do not “fix” SPA fallback in app code if platform is serving incorrect asset responses.
- Do not rely on stripped scrape HTML alone to conclude missing `<head>`/`<script>`.

Technical details
- Current architecture is valid for client routing (`BrowserRouter`) and route registration.
- Primary risk area is deployment asset delivery + startup fault visibility.
- The highest-value fix in-code is defensive boot/error UX; the highest-value non-code action is proving JS MIME/body correctness on published assets.
