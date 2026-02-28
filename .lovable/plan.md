# Unified Stream-Charge + Playback Session Architecture

**Date:** 2026-02-28  
**Status:** Implemented

## Problem (Resolved)
- `mint-playback-url` was creating a new `playback_sessions` row every time it was called (URL refresh, HLS fallback, etc.), inflating session counts
- Frontend cached "already charged" state, allowing free replays within a session
- Platform earning email was `platform@musicexclusive.com` but should be `support@musicexclusive.co`

## Changes Applied

### 1. Database Migration ✅
- Dropped 6-param `debit_stream_credit` overload
- Replaced 5-param version to return `TABLE(new_credits, already_charged, stream_ledger_id, stream_id)`
- Platform email updated to `support@musicexclusive.co`
- Revoked PUBLIC access, granted only to `service_role`
- Created `playback_tokens` table with RLS (service_role only)

### 2. Edge Function: `charge-stream/index.ts` ✅
- Removed manual `stream_charges` insert + idempotency check (RPC handles it)
- Calls 5-param `debit_stream_credit` RPC
- After successful debit: mints playback JWT, upserts `playback_sessions`, inserts `playback_tokens`
- Returns `{ success, newCredits, streamId, sessionId, hlsUrl }`

### 3. Edge Function: `mint-playback-url/index.ts` ✅
- Removed `playback_sessions` insert block (lines 255-276)
- Still serves artist dashboard playback and URL refreshes

### 4. Frontend: `useStreamCharge.ts` ✅
- Returns `hlsUrl`, `sessionId`, `streamId` from successful response
- Removed `chargedTracks` Set, `hasBeenCharged`, `clearCharged` exports

### 5. Frontend: `useAudioPlayer.ts` ✅
- Added `loadPaidStream` method for direct HLS playback from charge result

### 6. Frontend: `ArtistProfilePage.tsx` ✅
- Always shows confirm modal (removed `hasBeenCharged` check)
- Removed `clearCharged` usage

### 7. Frontend: `CompactVaultPlayer.tsx` ✅
- `skipPlayConfirm` always `false` (every play requires confirmation)

### 8. Frontend: `PlaylistSection.tsx` ✅
- Removed `hasBeenCharged` dependency
- Always shows confirmation modal for new tracks
