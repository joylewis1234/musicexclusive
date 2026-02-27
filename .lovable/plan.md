

## Plan: Update Three Documentation Files

Recent changes to `ExclusiveSongCard.tsx` migrated artist-side playback from legacy public URLs (`full_audio_url`, `artwork_url`) to R2 storage keys (`full_audio_key`, `artwork_key`) with on-demand signed URL minting. Fan-side streaming was validated end-to-end. These docs need to reflect that.

### 1. `docs/final-audit-report.md`

**Completed Work section** — Add a new bullet:
- Artist dashboard playback (`ExclusiveSongCard`) migrated from legacy public URLs to signed R2 URLs via `mint-playback-url`. Fan streaming validated end-to-end (credit deduction, ledger entry, playback confirmed for track `2887e61c`). HEAD-based readiness checks removed due to R2 CORS restrictions; readiness now determined by key presence.

**Appendix: Key Files** — Add:
- `src/components/artist/ExclusiveSongCard.tsx`

### 2. `docs/playback-protection-architecture.md`

**Components section** — Add `ExclusiveSongCard` alongside `useAudioPlayer` as a client consumer:
- `ExclusiveSongCard` (artist dashboard: full track + hook preview playback)

**Playback Flow section** — Add a note after step 5:
- Artist dashboard uses the same `mint-playback-url` flow for on-demand playback of full tracks and 15-second hook previews. Audio elements are created synchronously (user-gesture compliance) with signed URLs assigned asynchronously.

**Enforcement section** — Add:
- No public audio URLs are stored or exposed to the client; all playback resolves R2 keys to short-lived signed URLs at play time.

### 3. `docs/trust-boundary-map.md`

**Section 6 (Client → Cloudflare R2)** — Expand mitigation:
- Add: "Client components (`useAudioPlayer`, `ExclusiveSongCard`) never store or cache public URLs; R2 object keys are resolved to signed URLs on demand with short TTLs (90s audio, 300s artwork)."

No structural changes to the trust boundary model — the existing boundaries already cover this flow.

