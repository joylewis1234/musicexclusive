

## Diagnosis — confirmed

The published sites (`musicexclusive.lovable.app` and `www.themusicisexclusive.com`) are **still serving an old HTML file** from a previous build:

```html
<!-- What the CDN is serving (STALE) -->
<div id="root">
  <div id="boot-fallback" style="...">
    <p>Loading...</p>
  </div>
</div>
<!-- NO <head>, NO <script>, NO CSS -->
```

Meanwhile:
- Your source `index.html` is correct (has `<head>`, meta tags, `<script type="module">`)
- The JS bundle `/assets/app.js` **exists and loads fine** on both domains
- The preview works perfectly
- You confirmed Publish → Update was clicked and domain is Active

**The problem is not in your code.** The publish pipeline deployed the JS bundle but did not update the HTML entry point. The CDN is caching the old HTML.

## Plan: Force HTML cache invalidation

Since the HTML content hasn't changed enough for the deploy pipeline to bust the cache, I'll make a structural change to `index.html` that forces a new deployment artifact:

1. **Add a build timestamp comment** to `index.html` — a unique string that guarantees the file is treated as "new" by the build/deploy pipeline
2. **Add an inline preload hint** for `/assets/app.js` in `<head>` — this is both functionally useful (faster boot) and structurally different from any cached version
3. **Add a cache-busting query param** to the module script src — `<script type="module" src="/src/main.tsx?v=2">` (Vite strips this in dev, but it changes the build output hash)

These are small, safe changes that exist solely to force the deploy system to write a new `index.html` to the CDN edge.

After implementation: **you must click Publish → Update again**, then test in incognito. If the CDN still serves stale HTML after that, this is a platform-level issue that needs Lovable support.

