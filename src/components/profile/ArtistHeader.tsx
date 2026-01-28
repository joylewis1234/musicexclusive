import { Mic2 } from "lucide-react";

interface ArtistHeaderProps {
  name: string;
  genre: string;
  bio: string;
  imageUrl: string;
}

export const ArtistHeader = ({ name, genre, bio, imageUrl }: ArtistHeaderProps) => {
  return (
    <div className="relative">
      {/* Hero image */}
      <div className="relative h-[40vh] min-h-[280px]">
        <img
          src={imageUrl}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
      </div>

      {/* Artist info overlay */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-6">
        <div className="w-full max-w-md mx-auto">
          {/* Exclusive Artist Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/20 border border-primary/40 mb-3">
            <Mic2 className="w-3.5 h-3.5 text-primary" />
            <span className="text-primary text-xs font-display uppercase tracking-wider">
              Exclusive Artist
            </span>
          </div>

          <h1
            className="font-display text-4xl md:text-5xl font-bold text-foreground tracking-wide mb-2"
            style={{ textShadow: "0 2px 20px rgba(0, 0, 0, 0.5)" }}
          >
            {name}
          </h1>
          <p className="text-primary text-sm font-display uppercase tracking-wider mb-3">
            {genre}
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">
            {bio}
          </p>
        </div>
      </div>
    </div>
  );
};
