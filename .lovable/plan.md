

## Artist Edge Function Audit — Findings

### Functions Missing from `config.toml`

These functions exist in the repo but have **no entry** in `supabase/config.toml`, meaning the Supabase gateway defaults to `verify_jwt = true`. Any call with an external-project JWT will be rejected with `401: Invalid JWT` before function code runs.

**Artist-critical (will break artist flows):**
- `upload-track-cover` — used for cover art uploads; has manual JWT validation in code
- `upload-track-media` — used for track media uploads; has manual JWT validation in code
- `uploadTrackAssets` — combined cover+audio upload; has manual JWT validation in code
- `generate-promo-captions` — Marketing Studio caption generation; no auth in code (public-ish)
- `elevenlabs-sfx` — sound effects generation
- `storage-health-check` — artist diagnostic panel
- `verify-checkout` — payment verification after Stripe redirect

**Admin/cron (not artist-facing but still missing):**
- `approve-bonus-payout`, `check-bonus-milestones`, `close-annual-cycle`
- `disqualify-bonus`, `disqualify-charts-artist`, `update-charts-standings`
- `create-test-fan`, `delete-test-application`
- `generate-vault-code`, `mint-playback-url-public-preview`
- `upload-fan-avatar`

### Auth Pattern Review (functions already in config)

All artist-critical functions that ARE configured use correct patterns:

| Function | Auth Method | Status |
|---|---|---|
| `create-track-draft` | `getClaims()` via external project import | OK |
| `initiate-multipart-upload` | `getUser()` | OK |
| `sign-upload-part` | `getUser()` | OK |
| `complete-multipart-upload` | `getUser()` | OK |
| `create-connect-account` | `getClaims()` | OK |
| `verify-connect-status` | `getUser()` | OK |
| `upload-avatar` | `getClaims()` | OK |
| `finalize-artist-setup` | `getUser()` | OK |
| `mint-playback-url` | `getUser()` | OK |
| `charge-stream` | `getUser()` | OK |
| `submit-agreement-acceptance` | No JWT (service role + rate limit) | OK |

### Plan

**Add all missing functions to `supabase/config.toml`** with `verify_jwt = false`:

```toml
[functions.upload-track-cover]
verify_jwt = false

[functions.upload-track-media]
verify_jwt = false

[functions.uploadTrackAssets]
verify_jwt = false

[functions.generate-promo-captions]
verify_jwt = false

[functions.elevenlabs-sfx]
verify_jwt = false

[functions.storage-health-check]
verify_jwt = false

[functions.verify-checkout]
verify_jwt = false

[functions.approve-bonus-payout]
verify_jwt = false

[functions.check-bonus-milestones]
verify_jwt = false

[functions.close-annual-cycle]
verify_jwt = false

[functions.create-test-fan]
verify_jwt = false

[functions.delete-test-application]
verify_jwt = false

[functions.disqualify-bonus]
verify_jwt = false

[functions.disqualify-charts-artist]
verify_jwt = false

[functions.generate-vault-code]
verify_jwt = false

[functions.mint-playback-url-public-preview]
verify_jwt = false

[functions.update-charts-standings]
verify_jwt = false

[functions.upload-fan-avatar]
verify_jwt = false
```

This is a single-file change to `supabase/config.toml`. After deployment to the external project, all these functions will pass gateway validation and rely on their own in-code auth checks.

