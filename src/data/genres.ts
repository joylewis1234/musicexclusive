/**
 * Single source of truth for genre lists used across the platform.
 * Discovery page includes "All Genres" as a filter option;
 * artist-facing forms use ARTIST_GENRES (without "All Genres").
 */
export const ARTIST_GENRES = [
  "R&B",
  "Pop",
  "Hip-Hop",
  "Electronic",
  "Rock",
  "Metal",
  "Alternative",
  "Punk",
  "Indie",
  "Folk",
  "Acoustic",
  "Country",
  "Jazz",
  "Soul",
  "Funk",
  "Gospel/Christian",
  "Latin",
  "Reggae",
  "Afrobeats",
  "World",
  "Classical",
  "Ambient",
  "Experimental",
  "Soundtrack",
  "Lo-Fi",
  "Blues",
  "Dancehall",
  "Other",
] as const;

export type ArtistGenre = (typeof ARTIST_GENRES)[number];

export const DISCOVERY_GENRES = ["All Genres", ...ARTIST_GENRES] as const;
export type DiscoveryGenre = (typeof DISCOVERY_GENRES)[number];
