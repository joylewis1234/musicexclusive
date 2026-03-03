# Core Platform Flow Verification

## Scope
This document tracks verification of end-to-end product flows listed in the “Core Platform Flow Checks” reference section of the security checklist.

## Roles & Access
- [ ] Artist: uploads tracks, manages earnings, 3-week exclusivity flow
- [ ] Fan: Vault Lottery access, pay per stream via credits
- [ ] Superfan: paid membership, monthly invite, lottery bypass
- [x] Admin: moderation + reporting access

## Track Lifecycle
- [ ] Track draft creation
- [ ] Multipart upload flow (audio + cover)
- [ ] Track status transitions: uploading → ready → disabled
- [ ] Ownership enforcement (only owning artist can modify)

## Playback & Credits
- [ ] Credit deducted after 15 seconds
- [ ] Deduction happens once per stream
- [ ] No negative balances

## Streaming Protection
- [ ] Signed playback tokens
- [ ] HLS segmented streaming
- [ ] No direct raw audio access
- [ ] Expiring segments
- [ ] Session traceability
- [ ] Session watermarking

## Abuse & Invite Controls
- [ ] Invite expiration enforced
- [ ] Invite reuse blocked
- [ ] Monthly Superfan invite reset enforced
- [ ] Rate limiting on sensitive endpoints

## Launch Readiness
- [ ] No cross-user data exposure
- [ ] Financial system safe under concurrency
- [ ] Signed HLS playback enforced
- [ ] Raw R2 access blocked
- [ ] Invite abuse prevented
- [ ] Audit report delivered
