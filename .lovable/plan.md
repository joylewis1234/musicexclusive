

## Diagnosis

**The root cause is now clear**: The published site at `musicexclusive.lovable.app` is serving **stale HTML** from a previous build. The served HTML contains a `boot-fallback` div (removed from source several edits ago) and **no `<script>` tag at all** — meaning the browser never loads any JavaScript. The app is permanently stuck on "Loading..." because there is literally no JS to execute.

Evidence:
- Published HTML has `<div id="boot-fallback">` — not present in current source
- Published HTML has **no** `<head>` content, **no** `<script>` tag
- Preview in editor works perfectly (console shows `[App] Mounted successfully`)
- The built JS bundle (`/assets/app.js`) actually exists on the server — the HTML just doesn't reference it

## Plan: Full Refactor in One Pass

### 1. Harden `index.html` against future cache/build issues
- Add a `<noscript>` fallback so users without JS see a message
- Add `<meta http-equiv="Cache-Control" content="no-cache">` to discourage aggressive CDN caching of the HTML shell
- Keep the minimal structure (no inline JS, no boot-fallback divs inside `#root`)

### 2. Clean up `src/main.tsx`
- Remove the watchdog/boot-complete globals (`window.__APP_BOOT_START__`, etc.) — they were meant for the inline HTML watchdog which is gone
- Keep `BootErrorBoundary` and global `unhandledrejection` listener
- Simplify to essential boot logic only

### 3. Clean up `src/App.tsx`
- Keep eager `Index` import and `lazyWithRetry` for secondary routes
- Remove stale version comment (`v10`)
- Keep `Suspense` fallback and `ErrorBoundary`

### 4. Fix `useIsAdmin` re-check on token refresh
- The `checkedUserIdRef` guard is already in place — verify the `authLoading` dependency doesn't cause unnecessary re-runs
- Ensure `isChecking` starts as `true` only when there's actually a user to check (currently it initializes `true` even for anonymous visitors, causing unnecessary loading states)

### 5. Add build output verification comment
- In `vite.config.ts`, add `chunkFileNames` alongside `entryFileNames` for consistent output naming

### 6. Republish
- After code changes, the app must be **republished**. The CDN should pick up the new `index.html` with the correct `<script>` tag pointing to the bundle.

**Expected result**: The published site serves the correct HTML with the `<script>` tag, the JS loads, and the homepage renders immediately (eager import). Secondary routes remain lazy-loaded with retry fallbacks.

