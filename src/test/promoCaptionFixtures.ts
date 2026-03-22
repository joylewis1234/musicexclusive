import type { PromoCaptionRequest } from "@/lib/promoCaptionEngine";

export interface PromoCaptionFixture {
  name: string;
  input: PromoCaptionRequest;
}

export const promoCaptionFixtures: PromoCaptionFixture[] = [
  {
    name: "vault hiphop launch",
    input: {
      trackTitle: "Backseat Gospel",
      artistName: "Jai Sterling",
      genre: "Hip Hop",
      vibe: "hype",
      keywords: ["anthemic", "gritty", "late night"],
      ctaStyle: "vault",
    },
  },
  {
    name: "stream rnb single",
    input: {
      trackTitle: "After Midnight",
      artistName: "Solea",
      genre: "R&B",
      vibe: "emotional",
      keywords: ["intimate", "velvet", "slow burn"],
      ctaStyle: "stream",
    },
  },
  {
    name: "vault afrobeats teaser",
    input: {
      trackTitle: "Soro Soke",
      artistName: "Kemi V",
      genre: "Afrobeats",
      vibe: "luxury",
      keywords: ["summer", "dancefloor", "global"],
      ctaStyle: "vault",
    },
  },
  {
    name: "faith release",
    input: {
      trackTitle: "Still Covered",
      artistName: "Micah Vale",
      genre: "Christian / Gospel",
      vibe: "faith",
      keywords: ["hope", "healing", "uplifting"],
      ctaStyle: "stream",
    },
  },
  {
    name: "indie mysterious drop",
    input: {
      trackTitle: "Static Flowers",
      artistName: "North Arcade",
      genre: "Indie Alternative",
      vibe: "mysterious",
      keywords: ["cinematic", "moody", "midnight"],
      ctaStyle: "vault",
    },
  },
  {
    name: "electronic punchy release",
    input: {
      trackTitle: "Neon Circuit",
      artistName: "Pulse Harbor",
      genre: "Electronic",
      vibe: "punchy",
      keywords: ["festival", "bass", "headphones"],
      ctaStyle: "stream",
    },
  },
];
