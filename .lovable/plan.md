

## Unified Stream-Charge + Playback Session Architecture

This is a significant refactor that consolidates playback session creation into the charge-stream flow, eliminating the duplicate session problem where mint-playback-url was creating sessions on every URL refresh.

### Problem
- `mint-playback-url` creates a new `playback_sessions` row every time it's called (URL refresh, HLS fallback, etc.), inflating session counts
- Frontend caches "already charged" state, allowing free replays within a session
- Platform earning email is `platform@musicexclusive.com` but should be `support@musicexclusive.co`

### Changes

#### 1. Database Migration

**Replace `debit_stream_credit` RPC** (5-param version):
- Drop the 6-param overload that takes `p_stream_charge_id` (currently used by `charge-stream`)
- Replace with the user's 5-param version that returns `TABLE(new_credits, already_charged, stream_ledger_id, stream_id)`
- Change platform email from `platform@musicexclusive.com` to `support@musicexclusive.co`
- Revoke PUBLIC access, grant only to `service_role`

**Create `playback_tokens` table**:
- `token_id uuid PRIMARY KEY`
- `stream_id uuid NOT NULL REFERENCES stream_charges(stream_id) ON DELETE CASCADE`
- `expires_at timestamptz NOT NULL`
- `consumed_at timestamptz`
- `created_at timestamptz NOT NULL DEFAULT now()`
- Indexes on `stream_id` and `consumed_at`
- RLS enabled with service_role ALL policy

**Note**: `watermark_id` column already exists on `playback_sessions` — no change needed.

#### 2. Edge Function: `charge-stream/index.ts`

Major refactor of the success path:
- Remove the manual `stream_charges` insert + idempotency check (the RPC handles it now via `ON CONFLICT`)
- Call 5-param `debit_stream_credit` RPC (drop `p_stream_charge_id`)
- After successful debit, extract `stream_id` from RPC result
- Mint a playback JWT (add `signJwtHS256`, `sha256Hex`, `base64url` helpers)
- Upsert one `playback_sessions` row keyed on `stream_id`
- Insert one `playback_tokens` row
- Return `{ success, newCredits, streamId, sessionId, hlsUrl }`

#### 3. Edge Function: `mint-playback-url/index.ts`

- **Remove** the entire "Record session" block (lines 255-276) that inserts into `playback_sessions`
- Keep everything else (auth, access check, presign, JWT, HLS URL)
- This function still serves artist dashboard playback (owner previews) and URL refreshes

#### 4. Frontend: `src/hooks/useStreamCharge.ts`

- Update `StreamChargeResult` interface to include `hlsUrl`, `sessionId`, `streamId`
- Remove `chargedTracks` Set state and `hasBeenCharged`/`clearCharged` exports
- Each call generates a fresh `idempotencyKey` (already does this)
- Return `hlsUrl`, `sessionId`, `streamId` from successful response

#### 5. Frontend: `src/hooks/useAudioPlayer.ts`

- Add `loadPaidStream` method to `UseAudioPlayerReturn` interface
- Implement `loadPaidStream({ trackId, hlsUrl, sessionId })` that:
  - Destroys existing HLS instance
  - Resets telemetry refs
  - Sets the HLS source directly (no mint-playback-url call)
  - Updates diagnostics with the new URL and session

#### 6. Frontend: `src/pages/ArtistProfilePage.tsx`

- Remove `hasBeenCharged`, `clearCharged` imports/usage
- `handlePlayRequest`: Always show the confirm modal (remove `hasBeenCharged` check)
- `handleStreamConfirm`: After successful charge, call `loadPaidStream` with the returned `hlsUrl` instead of relying on autoPlay + loadTrack
- Remove `handleTrackEnded` clearing charged state
- Update `CompactVaultPlayer` props: remove `skipPlayConfirm` (always false now)

#### 7. Frontend: `src/components/profile/CompactVaultPlayer.tsx`

- Remove `skipPlayConfirm` prop (always requires confirmation now)
- Simplify `handlePlayPause`: if not playing, always call `onPlay()` to trigger modal
- Keep `autoPlay` mechanism for post-confirmation playback

#### 8. Frontend: `src/components/playlist/PlaylistSection.tsx`

- Update to remove `hasBeenCharged` dependency if present
- Ensure stream charge returns are handled with new fields

### Technical Details

- The 6-param `debit_stream_credit` overload must be dropped before creating the 5-param replacement to avoid ambiguity
- `playback_tokens` table needs RLS with service_role-only access
- The `charge-stream` edge function grows by ~60 lines for JWT minting + session/token creation
- Worker-side token consumption is documented but not implemented here (Cloudflare Worker is outside this repo)

