# Validation Session Report (End-to-End + Stress Tests)

## Test Accounts
- Fan email: `demo-fan@test.com`
- Fan password: FanTest2026!
- Artist email: `test-artist+validation@example.com`
- Artist user ID: `b429eeb1-88c3-48df-a023-f345fee49912`
- Temp artist password: `TestPass1772210292411!` (created via create-test-artist)

## Test Tracks
- **Moderate concurrency test track:** `9fad1e64-016e-41da-95b5-6f2dd154ee41`
- **Artist upload validation track (ready, initial):** `b762873b-e3a2-4e11-81da-ec205bed68a2`
- **Artist upload validation track (ready, latest):** `2887e61c-ec09-4b9f-b01b-b10f5461419b`

## Artist Upload Validation (Milestone 3 Pipeline)
1) Artist application + approval: **Created test artist with active role/profile**
2) Upload track + artwork: **Succeeded after R2 CORS update**
3) R2 key path correctness: **Verified on ready track**
   - Audio key: `artists/b5ce51ad-acf4-4e2d-a378-083fb2c32be2/audio/2887e61c-ec09-4b9f-b01b-b10f5461419b.mp3`
   - Artwork key: `artists/b5ce51ad-acf4-4e2d-a378-083fb2c32be2/covers/2887e61c-ec09-4b9f-b01b-b10f5461419b.jpg`
4) DB row updates with `*_key` fields: **Verified on ready track**
5) Status transitions `processing → ready`: **Verified (status = ready)**
6) Artist dashboard exits “finalizing”: **Pending UI confirmation**
7) `mint-playback-url`: **OK**
8) Fan can stream: **OK (200 on signed URL)**
9) Monitoring events log playback: **OK (playback-telemetry accepted)**

## Playback Validation (Track `b762873b-e3a2-4e11-81da-ec205bed68a2`)
- `mint-playback-url`: OK
- Signed URL GET: 200
- `playback-telemetry`: OK
- Session ID: `6afb1ade-b43f-4558-ae43-c2293702005d`

## Playback Validation (Track `2887e61c-ec09-4b9f-b01b-b10f5461419b`)
- `mint-playback-url`: OK
- Signed URL GET: 200
- `playback-telemetry`: OK
- Session ID: `3b99aa9b-b9eb-4769-848a-dafcadf7cae4`

## Fan Streaming Validation (Track `2887e61c-ec09-4b9f-b01b-b10f5461419b`)
- Login as `demo-fan@test.com`: ✅ Vault access active, 241 credits
- Discovery → track visible: ✅ Artwork shown
- Stream Confirm modal: ✅ Shows balance, 1 credit cost, protection notice
- Click “STREAM NOW”: ✅ Audio starts
- Playback: ✅ Progress advances (0:08/2:56), pause shown
- Credit deduction: ✅ 241 → 240
- Ledger entry: ✅ $0.20 total, $0.10 artist, pending payout
- Artwork: ✅ Signed artwork loads via mint-playback-url

**Non-blocking notes:**
- Some tracks 404 artwork because they are missing `artwork_key`
- React ref warning on Discovery component (cosmetic)

## Moderate Concurrency Stress Test (150 concurrency)
**Track:** `9fad1e64-016e-41da-95b5-6f2dd154ee41`

### mint-playback-url
- p95: 6009 ms
- p99: 6183 ms
- 5xx rate: 0%
- Status: 200 x 400
- RPS: ~39.52

### charge-stream
- p95: 2981 ms
- p99: 4291 ms
- 5xx rate: 0%
- Status: 200 x 400
- RPS: ~61.77

### Ledger Integrity
- 300/300 success
- Credits: 541 → 241 (expected 241)
- Ledger writes confirmed (701 rows in last 60 min for test track/user)

## Report Files
- `docs/moderate-concurrency-stress-test-report.md`
- `docs/load-testing-summary.md`
- `docs/monitoring-guardrails.md`
- `docs/monitoring-thresholds.md`
- `docs/launch-monitoring-playbook.md`
- `docs/graceful-degradation-strategy.md`
- `docs/launch-monitoring-checklist.md`

## Cleanup Checklist (Whitelist Retention)
- Confirm whitelist emails (4 accounts)
- Run dry-run SELECTs to review affected users/tracks
- Delete non-whitelisted tracks (UUID-safe)
- Delete non-whitelisted artist profiles + roles
- Delete non-whitelisted vault/ledger data
- Delete non-whitelisted auth users
- Optional: clear legacy tracks with non-UUID artist_id
- Re-run SELECTs to verify only whitelist remains

### Results from Previous SQL Edits
- Dry-run user list returned non-whitelisted accounts (sample shown below).
- Dry-run tracks join failed due to non-UUID `artist_id` values (error: `22P02 invalid input syntax for type uuid: "nova"`), indicating legacy/non-UUID rows and requiring a UUID guard on joins.
- Sample non-whitelisted emails returned by dry-run:
  - `betty@gmail.com`
  - `ggg@gmail.com`
  - `bob@yahoo.com`
  - `joy@gmail.com`
  - `lashawn.lewis1@gmail.com`
  - `bbob@yahoo.com`
  - `vaulttest@example.com`
  - `testly@gmail.com`
  - `testy@gmail.com`
  - `testartist2@gmail.com`

**Non-whitelist accounts (dry-run output, email + id):**
```
email	id
betty@gmail.com	9bd7cb59-df1c-4c8b-93e1-cd0d51c260cb
ggg@gmail.com	1fe7f1c1-7d2c-4178-a9dc-f5bec1389917
bob@yahoo.com	406c6a24-c402-4e6a-bb77-5633c6b872ab
joy@gmail.com	31b9e5de-bdba-42ce-8066-f66fcada9ead
lashawn.lewis1@gmail.com	dd710139-f5f4-4834-9b87-c71553947ae1
bbob@yahoo.com	3934ba5e-f5c0-43f4-9d61-3526159d1307
vaulttest@example.com	8d7cf8f3-a104-48f6-bc9b-35d6cb96fca9
testly@gmail.com	0ba06ae9-8ecd-4573-b22d-106e3905bbc2
testy@gmail.com	0c1d57ce-b6c8-49f8-b373-eb6ac6e8ee34
testartist2@gmail.com	f9feaacd-86a5-46f1-a938-87e725c12b87
testly6@gmail.com	bf0d9f8e-b5a9-4dd7-8271-e45ba064f4b2
superfantest@example.com	12090f56-b0a2-4be5-9a78-657970ed2248
testartist1@gmail.com	6a45b541-7410-4507-be93-d990d8e8e9f4
testartist3@example.com	3e3c9fc6-63d0-4549-8b68-3862d4c38014
hope@gmail.com	69226363-4618-4929-8a39-e82288ad749f
dashtest@example.com	01782b5a-226a-460d-85e2-fecc0b376fbf
testfan2@demo.com	a9f2bf94-137a-474d-bb7f-037cc5737a2e
kat123@gmail.com	7aeb977d-6c6b-4ee6-b1fa-c1d9a432bc19
zerocredits@test.com	f033469b-3f45-494f-a8d1-93a1a3a5e21d
demo-artist-new@test.com	9b523203-aeae-45e9-a9db-72c03fd87318
jack@exapmle.com	9261f01a-53fc-40f1-b928-a69af84409e3
tom@gmail.com	4589c2f2-9de2-4083-b55d-3d29e165f07f
testfan@example.com	4407f7d4-bbba-4d0e-a6b4-f0cbdf72b6c5
jack@example.com	2379ac36-c45b-435d-bf78-dc98706f12f8
testfan_zero@test.com	3018a5c9-648f-451a-8675-6ec564ba6874
jack@gmail.com	424d006e-bcc1-46a0-b072-583f1f9308e1
joy-artist@test.com	bd275955-8ff7-4ed0-896d-62f421495010
cat1111@gmail.com	7917a20c-13c5-4abd-87b5-0166749c8688
zerocredits@testfan.com	a6fa757d-aeb6-4fd0-80ad-9445a80a8d6c
demo-artist@test.com	16b13f64-590c-4e63-b8ed-c8cff3ccd3ae
katy555@gmail.com	d57782a3-db20-4520-a83f-e9531d154d5b
girl@gmail.com	148ced6c-e796-46f4-9e27-66292ca8838d
testlewis@gmail.com	83481d3d-7a30-44fe-8dbf-8a71ccbe550c
samaranara1108@gmail.com	24fa6cde-6cb2-4e3a-ab20-680c326070d1
kattest@gmail.com	d4d022c7-5ff5-46c0-aabd-1c78db786095
lashawn.lewis@gmail.com	cddee828-0fe5-452c-aa68-8304fca0949e
lovetest@gmail.com	907644f0-20a8-4f2a-bee4-6616f23ee1d7
joy557@gmail.com	89aea400-5eea-4c3d-ad4b-338852c5ce73
testfanflow2@example.com	df456d5e-9291-44f1-acb6-f57b7c0ed667
tinytunesmusic@gmail.com	68827280-95ea-4b79-a4ad-506a1ae14e76
testfanflow2025@test.com	7ab70cf0-1e1c-4376-b231-86135cd08ad9
testfanflow3@example.com	5f7de483-4c8b-425b-a545-8f20650082f5
joylewismusic+test003@gmail.com	a51b5ef5-b4e8-4bae-adcc-2767f054eee5
joy@joylewissells.com	0a7aeafb-c924-43f7-8ca1-9beb0c1b27f4
joylewismusic+test005@gmail.com	f2ae91c2-ad44-4f2f-bf56-623119c9ea8e
joylewismusic+test008@gmail.com	6ad33dc4-1e19-4397-a625-02b353b50303
joylewismusic+artist006@gmail.com	903917ed-22bb-4f22-9004-442b97bca2b9
joylewismusic+test004@gmail.com	2224745e-9cc1-4f13-a70a-3b764ec9ecf5
joylewismusic+artist007@gmail.com	91094586-ad35-4d38-bd02-af8f57f510dc
jaylen.burley10@gmail.com	4a3f9683-b6b9-4338-8a1b-47a8c867d61f
burleyjay10@gmail.com	3a3538d2-a891-4b37-a0cd-ad191dd5f7f0
joylewismusic+artist014@gmail.com	9c69c1e6-0174-4d5a-a885-f469d13ae055
joylewismusic+vault102@gmail.com	fabe67ec-9f7c-4035-a235-e07f10eb495a
joylewismusic@gmail.com	aec5ab17-0275-4c32-8c3d-570fedf42ac2
joylewismusic+test002@gmail.com	de3ab8c3-6334-4af9-9a97-38943b35df1a
joy@jssalliance.com	30aa3907-a119-40ff-9b64-c39cf0fe993e
yxgproductions@gmail.com	72d8dae8-b2cb-4b71-be50-f6304e6ec684
joylewismusic+test009@gmail.com	9419dfc8-9255-44b9-a020-a94a73e74751
joylewismusic+test010@gmail.com	6e734ea2-f75b-47a3-83f7-e91fe493d176
joylewismusic+artist1@gmail.com	b49767ae-d8ed-42af-b99d-92d9e1ed8a63
joylewismusic+vault103@gmail.com	a1b822f5-7ba7-4774-9f29-47b838b765c5
joylewismusic+vault104@gmail.com	9c7375c6-c32c-40b2-a77f-76b2276c72da
joylewismusic+fan1@gmail.com	0bef2475-5d27-4541-848e-060034b0dc75
joylewismusic+fan3@gmail.com	b1962f83-ee58-4569-a7a2-f8c8a0cf6aff
milliedor8@gmail.com	ef3af414-c91e-4e86-a7b5-fa5a283f9eb7
joylewismusic+artist020@gmail.com	dfb0f0f8-aea3-4a51-9e32-a5d16b5c1857
joylewismusic+fan2@gmail.com	4e3a829c-26fc-4053-8525-fc1890076a4b
joylewismusic+artist024@gmail.com	8a67f449-8713-44c1-82ea-bb8c9def23d7
joylewismusic+fan4@gmail.com	a95ec199-f4d6-497c-bc82-097564f7518e
joylewismusic+artist15@gmail.com	81ac8afb-6b16-4157-9efc-046482b2cc5d
christydove8@gmail.com	b1d84bb8-dae7-4907-9fa2-f3f5e9ab825f
joylewismusic+artist025@gmail.com	a885c129-bef8-4a7e-8d73-caa05c9c7471
christador8@gmail.com	577e84f2-e2b0-4062-9090-5e2a11bce23e
```