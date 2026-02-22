

## Signed Artwork -- Remaining Gaps

Most of this work is already complete. The edge function, hook, and component all exist and 11+ components already use `<SignedArtwork>`. Only three small changes remain:

### 1. Edge function: add `expiresAt` to response
**File:** `supabase/functions/mint-playback-url/index.ts`

The response currently returns only `{ url }`. Update it to return `{ url, expiresAt }` so the client can use server-reported expiry instead of guessing.

```
// Change line 194 from:
{ url: signedUrl }
// To:
{ url: signedUrl, expiresAt: new Date(Date.now() + ttl * 1000).toISOString() }
```

### 2. Replace direct `<img>` in ShareExclusiveTrackModal
**File:** `src/components/profile/ShareExclusiveTrackModal.tsx`

Lines 164-169 render `<img src={track.artworkUrl}>`. Replace with `<SignedArtwork trackId={track.id} />`. This requires adding `track.id` which is already available in the `TrackInfo` interface.

### 3. Replace direct `<img>` in WeeklyTransparencyReport
**File:** `src/components/artist/WeeklyTransparencyReport.tsx`

Lines 565-569 render `<img src={track.artworkUrl}>`. Replace with `<SignedArtwork trackId={track.trackId} />`. The `trackId` field already exists in the component's data structure.

---

### What is NOT changing
- All other components (HotNewTracks, DiscoveryTrackCard, PlaylistSection, PlaylistPlayerBar, etc.) are already migrated.
- `artwork_url` remains in DB queries for status checks -- only the render path changes.
- `avatar_url` is untouched (Supabase Storage, not R2).
- The `useSignedArtworkUrl` hook can optionally be updated to use the server-returned `expiresAt` instead of the hardcoded 5-min offset, but this is a minor improvement.

