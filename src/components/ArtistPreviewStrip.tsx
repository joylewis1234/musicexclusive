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
      <div className="flex animate-scroll-slow">
        {duplicatedArtists.map((artist, index) => (
          <div
            key={`${artist.name}-${index}`}
            className="flex-shrink-0 px-2"
          >
            <div className="group relative w-20 md:w-24 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)]">
              {/* Artist Image */}
              <div className="aspect-square overflow-hidden rounded-xl">
                <img
                  src={artist.imageUrl}
                  alt={artist.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent rounded-xl" />
              
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
