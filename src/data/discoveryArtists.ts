import artist1 from "@/assets/artist-1.jpg";
import artist2 from "@/assets/artist-2.jpg";
import artist3 from "@/assets/artist-3.jpg";

// Re-export genre constants from the single source of truth
export { DISCOVERY_GENRES as genres } from "@/data/genres";
export type { DiscoveryGenre as Genre } from "@/data/genres";

export interface DiscoveryArtist {
  id: string;
  name: string;
  genre: string;
  imageUrl: string;
  isFeatured: boolean;
  badge?: "New Drop" | "Trending" | "Exclusive";
  previewUrl?: string; // Mock preview URL
}

export const discoveryArtists: DiscoveryArtist[] = [
  {
    id: "nova",
    name: "NOVA",
    genre: "Electronic",
    imageUrl: artist1,
    isFeatured: true,
    badge: "Exclusive",
  },
  {
    id: "aura",
    name: "AURA",
    genre: "R&B",
    imageUrl: artist2,
    isFeatured: true,
    badge: "New Drop",
  },
  {
    id: "echo",
    name: "ECHO",
    genre: "Indie",
    imageUrl: artist3,
    isFeatured: true,
    badge: "Trending",
  },
  {
    id: "pulse",
    name: "PULSE",
    genre: "Hip-Hop",
    imageUrl: artist1,
    isFeatured: false,
    badge: "Exclusive",
  },
  {
    id: "drift",
    name: "DRIFT",
    genre: "Afrobeats",
    imageUrl: artist2,
    isFeatured: false,
    badge: "Trending",
  },
  {
    id: "vega",
    name: "VEGA",
    genre: "Pop",
    imageUrl: artist3,
    isFeatured: false,
    badge: "New Drop",
  },
  {
    id: "zenith",
    name: "ZENITH",
    genre: "EDM",
    imageUrl: artist1,
    isFeatured: false,
    badge: "Exclusive",
  },
  {
    id: "luna",
    name: "LUNA",
    genre: "Jazz",
    imageUrl: artist2,
    isFeatured: false,
  },
];
