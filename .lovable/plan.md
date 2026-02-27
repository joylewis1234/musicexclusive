

## Update `.lovable/plan.md` — Add missing tables to Summary

The Summary of Deleted Data table is incomplete. The Execution Order already lists all 13 steps, but the summary table at the top only covers 5 tables. Add the remaining cleaned tables with their row counts.

### Tables to add to Summary of Deleted Data

| Table | Rows Deleted | Reason |
|-------|-------------|--------|
| `fan_playlists` | orphaned | Orphaned playlist entries referencing deleted tracks/fans |
| `track_likes` | orphaned | Orphaned like records referencing deleted tracks/fans |
| `stream_charges` | orphaned | Orphaned stream charge records |
| `playback_sessions` | all cleared | Cleared all sessions |
| `marketing_assets` | all cleared | Orphaned sharing/marketing data |
| `shared_tracks` | all cleared | Orphaned sharing data |
| `shared_artist_profiles` | all cleared | Orphaned sharing data |
| `tracks` | orphaned | Orphaned tracks from deleted artists |
| `artist_profiles` | orphaned | Orphaned artist profiles |
| `vault_members` | orphaned | Orphaned vault members |

### Also update Final Verified Row Counts to include these tables

| Table | Current Rows |
|-------|-------------|
| `fan_playlists` | 0 |
| `track_likes` | 2 |
| `stream_charges` | 6 |
| `playback_sessions` | 73 |
| `marketing_assets` | 0 |
| `shared_tracks` | 0 |
| `tracks` | 6 |
| `artist_profiles` | 2 |
| `vault_members` | 3 |

### Implementation

Single file edit to `.lovable/plan.md` — expand both the Summary and Final Verified Row Counts tables to include all cleaned tables.

