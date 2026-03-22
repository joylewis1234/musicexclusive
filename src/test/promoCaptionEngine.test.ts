import { describe, expect, it } from "vitest";

import { generatePromoCaptions } from "@/lib/promoCaptionEngine";
import { promoCaptionFixtures } from "@/test/promoCaptionFixtures";

function normalizeText(value: string) {
  return value.toLowerCase().replace(/["'`]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

describe("generatePromoCaptions", () => {
  it("rejects incomplete input", () => {
    expect(() =>
      generatePromoCaptions({
        trackTitle: "",
        artistName: "Artist",
        genre: "Pop",
        vibe: "hype",
        keywords: [],
        ctaStyle: "vault",
      }),
    ).toThrow("trackTitle, artistName, and genre are required");
  });

  it.each(promoCaptionFixtures)("is deterministic for $name", ({ input }) => {
    const first = generatePromoCaptions(input);
    const second = generatePromoCaptions(input);

    expect(first).toEqual(second);
  });

  it.each(promoCaptionFixtures)("returns a valid caption package for $name", ({ input }) => {
    const result = generatePromoCaptions(input);
    const counts = result.captions.reduce<Record<string, number>>((acc, caption) => {
      acc[caption.length] = (acc[caption.length] || 0) + 1;
      return acc;
    }, {});

    expect(result.captions).toHaveLength(7);
    expect(counts).toEqual({ short: 2, medium: 3, long: 2 });

    expect(result.hashtags.length).toBeGreaterThanOrEqual(8);
    expect(result.hashtags.length).toBeLessThanOrEqual(15);
    expect(new Set(result.hashtags).size).toBe(result.hashtags.length);

    expect(result.storyOverlays.length).toBeGreaterThanOrEqual(1);
    expect(result.storyOverlays.length).toBeLessThanOrEqual(3);
    result.storyOverlays.forEach((overlay) => {
      expect(overlay.length).toBeLessThanOrEqual(20);
    });

    const normalizedCaptions = result.captions.map((caption) => normalizeText(caption.text));
    expect(new Set(normalizedCaptions).size).toBe(result.captions.length);

    result.captions.forEach((caption) => {
      expect(caption.text).toContain(input.trackTitle);
      expect(caption.text.length).toBeLessThanOrEqual(300);
      expect(normalizeText(caption.text)).not.toContain("lovable");
      expect(normalizeText(caption.text)).not.toContain("id preview");

      if (caption.length === "short") {
        expect(caption.text.length).toBeLessThanOrEqual(100);
      }

      if (caption.length === "medium") {
        expect(caption.text.length).toBeGreaterThan(100);
        expect(caption.text.length).toBeLessThanOrEqual(200);
      }

      if (caption.length === "long") {
        expect(caption.text.length).toBeGreaterThan(200);
        expect(caption.text.length).toBeLessThanOrEqual(300);
      }
    });
  });

  it.each(promoCaptionFixtures)("keeps CTA metadata aligned for $name", ({ input }) => {
    const result = generatePromoCaptions(input);
    const hashtags = new Set(result.hashtags);
    const overlays = new Set(result.storyOverlays);

    if (input.ctaStyle === "vault") {
      expect([...hashtags]).toEqual(expect.arrayContaining(["#JoinTheVault"]));
      expect([...overlays]).toEqual(expect.arrayContaining(["JOIN THE VAULT"]));
    } else {
      expect([...hashtags]).toEqual(expect.arrayContaining(["#StreamExclusive"]));
      expect([...overlays]).toEqual(expect.arrayContaining(["STREAM EXCLUSIVE"]));
    }
  });
});
