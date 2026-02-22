

## Testing the Worker Gate -- Blockers and Plan

### Current situation
- **No tracks have `artwork_key` set** in the database, so `mint-playback-url` with `fileType: "artwork"` will return 404 ("No artwork key on this track").
- **You are currently logged out** (on `/admin/login`), so the edge function rejects all requests with 401.
- The only track with real R2 data is **"Say Less"** (`9fad1e64-...`), which has `full_audio_key` and an `artwork_url` pointing to `pub-51f09041...r2.dev/artists/.../covers/9fad1e64-....jpg`.

### Step 1 -- Backfill artwork_key for "Say Less"

Run a DB migration to extract the R2 object key from the existing `artwork_url` and populate `artwork_key`:

```sql
UPDATE tracks
SET artwork_key = 'artists/72473c4c-3ad4-46f7-b25c-3ee2497d4d78/covers/9fad1e64-016e-41da-95b5-6f2dd154ee41.jpg'
WHERE id = '9fad1e64-016e-41da-95b5-6f2dd154ee41'
  AND artwork_key IS NULL;
```

### Step 2 -- Log in as admin

Once logged in, I can call `mint-playback-url` with either:
- `fileType: "artwork"` (any authenticated user allowed, 300s TTL) -- preferred since it requires no vault/admin check
- `fileType: "audio"` (requires admin, artist-owner, or vault-active)

### Step 3 -- Mint and host-swap test

After minting, take the returned signed URL:

```text
https://<account>.r2.cloudflarestorage.com/<bucket>/<key>?X-Amz-...
```

Replace the host portion with the Worker domain:

```text
https://r2-playback-gate.long-dew-571e.workers.dev/<bucket>/<key>?X-Amz-...
```

Open in browser. Expected result: the file is served (200 with the image/audio content).

### Technical details

- The migration is a single `UPDATE` statement, no schema changes.
- The `artwork_key` value is derived from the existing `artwork_url` by stripping the public R2 base URL prefix (`https://pub-51f09041f1d54e669dc9fcbc987d5191.r2.dev/`).
- Future uploads already set `artwork_key` during upload, so this is a one-time backfill for existing data.

