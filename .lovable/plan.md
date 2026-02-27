

## Investigation Results

The latest upload **actually succeeded**. Track `2887e61c` is `status: ready` in the database with both `artwork_key` and `full_audio_key` populated. The "stuck on processing" was likely what you saw before the 120s verification polling loop completed — or you navigated away before it finished.

### Issues Found

1. **3 orphaned "uploading" drafts** from earlier failed attempts are cluttering the database (IDs: `65771175`, `0b840e4b`, `08f58516`). The dashboard filters these out, but they're dead weight.

2. **No user feedback during polling** — after R2 uploads complete, the track goes to `processing` and the client polls for up to 120s. If the user navigates away during this window, they'll see "processing" on the dashboard until they return and the dashboard's own polling kicks in.

### Fix

#### Step 1: Clean up orphaned drafts
Run a SQL migration to delete the 3 stuck `uploading` drafts for this artist that have no keys and are older than 30 minutes.

#### Step 2: Improve dashboard polling for "processing" tracks
The dashboard already has `startPollingForFinalizingTracks` — verify it handles `processing` status tracks (not just ones missing URLs). If a track is `processing`, the dashboard should poll `verify-r2-objects` and transition to `ready` itself, so the user doesn't have to stay on the upload page.

#### Step 3: Add auto-cleanup of stale "uploading" drafts
In the upload hook's error/cleanup path, ensure orphaned drafts older than 10 minutes with no keys are deleted automatically on next upload attempt.

