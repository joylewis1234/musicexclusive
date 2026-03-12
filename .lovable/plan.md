

# Fix Black Screen on Published Site

## Root Cause
The published site's HTML is missing all `<head>` content (CSS, meta tags) and the `<script>` tag. This is a build synchronization issue where the environment variables weren't properly injected during the last publish. The preview works fine (behind Lovable auth), confirming the code itself is correct.

## Fix
Trigger a rebuild by making a trivial, harmless change to `index.html` (e.g., updating a comment or whitespace). This forces Vite to rebuild with the correct environment variables, and the next publish will include all assets.

### `index.html`
Add a cache-bust comment in the `<head>` to force a fresh build:
```html
<!-- build v4 -->
```

No functional code changes needed — this is purely a build pipeline refresh.

