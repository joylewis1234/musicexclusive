## Plan: Enlarge Top Carousel Images

### Changes Required

**1. Increase Image Sizes**
- **File:** `src/components/ArtistPreviewStrip.tsx`
- **Change:** Update the image container from `w-24 md:w-32` to `w-32 md:w-40` (or larger if desired)
- **Line:** 64

**2. Reduce Section Padding**
- **File:** `src/pages/Index.tsx`
- **Change:** Update the section padding from `pt-20 pb-4` to `pt-4 pb-4` (or `pt-0 pb-4` to touch the very top)
- **Line:** 105

### Visual Impact
- Images will be 33% larger (128px → 160px on desktop)
- Carousel will sit closer to the top of the section
- Genre text will scale proportionally

### Optional Adjustments
- If you want the images even larger, we can go up to `w-40 md:w-48`
- If you want them touching the very top edge, we can use `pt-0`