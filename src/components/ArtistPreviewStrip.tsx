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

const glowColors = [
  { base: "180, 100%, 50%" },
  { base: "300, 100%, 60%" },
  { base: "270, 100%, 60%" },
]

const ArtistPreviewStrip = ({ artists, className }: ArtistPreviewStripProps) => {
  const duplicated = [...artists, ...artists]

  return (
    <div className={cn("w-full overflow-hidden", className)}>
      <div className="flex animate-scroll-slow hover:[animation-play-state:paused]">
        {duplicated.map((artist, index) => {
          const colorIndex = index % glowColors.length
          const glowColor = glowColors[colorIndex]

          return (
            <div
              key={`${artist.name}-${index}`}
              className="flex-shrink-0 px-2"
            >
              <div
                className="relative w-20 md:w-24 h-28 md:h-36 rounded-xl overflow-hidden transition-all duration-300"
                style={{
                  boxShadow: `0 0 12px hsla(${glowColor.base}, 0.5), 0 0 24px hsla(${glowColor.base}, 0.3), 0 0 40px hsla(${glowColor.base}, 0.15)`,
                }}
              >
                <img
                  src={artist.imageUrl}
                  alt={artist.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
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
          )
        })}
      </div>
    </div>
  )
}

export { ArtistPreviewStrip }
