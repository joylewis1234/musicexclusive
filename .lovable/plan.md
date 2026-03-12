

# Add Missing Countries + Flag Label to Country Dropdown

## Current State
The country dropdown **already exists** on `EditArtistProfile.tsx` (lines 534-574) and correctly saves to `artist_profiles.country_code`. However:

1. **Missing 2 required countries**: Dominican Republic (DO) and Haiti (HT) are absent
2. **Has 2 extra countries**: Spain (ES) and Italy (IT) are present but not in the required 25
3. **No flag next to label**: The label says "Country (for Charts)" but doesn't show the selected flag emoji

## Changes (single file: `src/pages/artist/EditArtistProfile.tsx`)

### 1. Update country list (lines 541-566)
- Remove `ES` (Spain) and `IT` (Italy)
- Add `DO` (Dominican Republic) and `HT` (Haiti)
- Keep all other 23 countries unchanged

### 2. Show selected flag in label (line 535)
- Change the label from static `"Country (for Charts)"` to include the flag emoji of the currently selected `countryCode`, e.g. `"🇺🇸 Country (for Charts)"` when US is selected, plain `"Country (for Charts)"` when nothing is selected.

No other files, fields, or logic change.

