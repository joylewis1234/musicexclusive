

## Problem

Your production domain `www.musicexclusive.co` is hosted on **Vercel**, not Lovable. Vercel needs a `vercel.json` with SPA rewrite rules so that client-side routes like `/admin/login` don't return 404. Other pages likely work because they were visited before (cached) or are shallower routes that Vercel resolves differently.

## Plan

**Add a `vercel.json` file** to the project root with SPA fallback rewrites:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

This tells Vercel to serve `index.html` for all routes, letting React Router handle them client-side.

**One file to create:** `vercel.json` in the project root.

After this is deployed to Vercel, `/admin/login` and all other deep-linked routes will resolve correctly.

