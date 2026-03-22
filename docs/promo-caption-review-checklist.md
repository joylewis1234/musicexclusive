# Promo Caption Review Checklist

Use this checklist whenever promo-caption golden snapshots change or when reviewing deterministic caption output quality.

## Commands

Generate or refresh the approved baseline:

```bash
npm run test:promo-captions:golden:update
```

Verify approved output still matches:

```bash
npm run test:promo-captions:golden
```

Run the structural validation suite:

```bash
npm run test:promo-captions
```

## Review Standard

Approve snapshot changes only when the new output is clearly better or intentionally different.

Reject snapshot changes if they make the copy feel more generic, repetitive, awkward, or less premium.

## Caption Checklist

- Every caption includes the track title.
- At least some captions include the artist name naturally.
- The voice feels premium, exclusive, and brand-aligned.
- The copy does not read like filler or placeholder marketing text.
- There is useful variation across the 7 captions.
- Openers do not feel duplicated across multiple captions.
- The CTA matches the intended mode: `vault` or `stream`.
- Short captions feel sharp and usable.
- Medium captions add substance without dragging.
- Long captions feel intentional, not padded.
- Captions do not exceed their intended length bands.
- Captions do not contain broken punctuation, repeated fragments, or awkward truncation.

## Brand Safety Checklist

- No `Lovable` references appear anywhere.
- No preview URLs or placeholder domains appear anywhere.
- No obviously fake AI-style filler appears.
- No spammy language, excessive hype, or cheap-sounding phrasing appears.
- Emoji use does not appear unless explicitly intended.
- The copy still sounds like Music Exclusive, not a generic promo tool.

## Hashtag Checklist

- Hashtags are relevant to the artist, genre, vibe, or CTA.
- Hashtags are not repetitive or padded just to hit the limit.
- CTA hashtags align with the scenario.
- Derived hashtags from keywords still look clean and human-readable.

## Story Overlay Checklist

- Overlays are short enough to be usable in story creative.
- Overlays feel strong and readable at a glance.
- Overlays match the CTA mode and overall vibe.

## When To Update Snapshots

Update snapshots when:

- you intentionally improve templates, phrase packs, or scoring
- you intentionally change brand voice
- you intentionally rebalance CTA language
- you intentionally change hashtag or overlay strategy

Do not update snapshots just to make tests pass after an accidental copy regression.

## Reviewer Notes

If a change is borderline, compare the new output against the previous snapshot and answer:

- Is this clearer?
- Is this more premium?
- Is this less repetitive?
- Would this still feel strong if shown directly to artists or fans?

If the answer is not clearly yes, reject the snapshot update and revise the generator.
