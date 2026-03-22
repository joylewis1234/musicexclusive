import { describe, expect, it } from "vitest";

import { generatePromoCaptions } from "@/lib/promoCaptionEngine";
import { promoCaptionGoldenFixtures } from "@/test/promoCaptionGoldenFixtures";

describe("promo caption golden outputs", () => {
  it.each(promoCaptionGoldenFixtures)("matches approved output for $name", ({ input }) => {
    const result = generatePromoCaptions(input);
    const reviewShape = {
      captions: result.captions.map(({ length, text }) => ({ length, text })),
      hashtags: result.hashtags,
      storyOverlays: result.storyOverlays,
    };

    expect(reviewShape).toMatchSnapshot();
  });
});
