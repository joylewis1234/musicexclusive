import { cn } from "@/lib/utils"

interface Artist {
  name: string
  genre: string
  imageUrl: string
}

interface ArtistPreviewStripProps {
  artists: Artist[]
  className?: string
}

const ArtistPreviewStrip = ({ artists, className }: ArtistPreviewStripProps) => {
  // Double the artists for seamless infinite scroll
  const duplicatedArtists = [...artists, ...artists]

  return (
    <div className={cn("w-full overflow-hidden", className)}>
      <div className="flex animate-scroll-slow hover:[animation-play-state:paused]">
        {duplicatedArtists.map((artist, index) => (
          <div
            key={`${artist.name}-${index}`}
            className="flex-shrink-0 px-2"
          >
            <div 
              className="group relative w-20 md:w-24 aspect-square rounded-xl overflow-hidden transition-all duration-300"
              style={{
                boxShadow: "0 0 12px hsl(var(--primary) / 0.4), 0 0 24px hsl(var(--primary) / 0.2)",
              }}
            >
              {/* Artist Image */}
              <img
                src={artist.imageUrl}
                alt={artist.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
              
              {/* Artist info */}
              <div className="absolute bottom-0 left-0 right-0 p-1.5 md:p-2 text-center">
                <p className="font-display text-[10px] md:text-xs font-semibold text-foreground truncate">
                  {artist.name}
                </p>
                <p className="text-[8px] md:text-[10px] text-primary/80 uppercase tracking-wider truncate">
                  {artist.genre}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export { ArtistPreviewStrip }
