import { cn } from "@/lib/utils"
import { useRef, useEffect, useState } from "react"

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
  // We render 3 copies: when the first copy scrolls off-screen, CSS resets seamlessly
  const duplicated = [...artists, ...artists, ...artists]
  const trackRef = useRef<HTMLDivElement>(null)
  const [singleSetWidth, setSingleSetWidth] = useState(0)

  useEffect(() => {
    if (!trackRef.current) return
    // Measure the width of one set of artists
    const cards = trackRef.current.children
    const count = artists.length
    let width = 0
    for (let i = 0; i < count && i < cards.length; i++) {
      width += (cards[i] as HTMLElement).offsetWidth
    }
    setSingleSetWidth(width)
  }, [artists.length])

  // ~40px/s
  const duration = singleSetWidth > 0 ? singleSetWidth / 40 : 30

  return (
    <div className={cn("w-full overflow-hidden", className)}>
      <div
        ref={trackRef}
        className="flex hover:[animation-play-state:paused]"
        style={{
          animation: singleSetWidth > 0
            ? `marquee-scroll ${duration}s linear infinite`
            : undefined,
        }}
      >
        {duplicated.map((artist, index) => {
          const colorIndex = index % glowColors.length
          const glowColor = glowColors[colorIndex]

          return (
            <div
              key={`${artist.name}-${index}`}
              className="flex-shrink-0 px-2"
            >
              <div
                className="relative w-20 md:w-24 h-28 md:h-36 rounded-xl overflow-hidden"
                style={{
                  boxShadow: `0 0 12px hsla(${glowColor.base}, 0.5), 0 0 24px hsla(${glowColor.base}, 0.3), 0 0 40px hsla(${glowColor.base}, 0.15)`,
                }}
              >
                <img
                  src={artist.imageUrl}
                  alt={artist.name}
                  className="w-full h-full object-cover"
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

      {/* Inject the keyframe using exact pixel measurement */}
      {singleSetWidth > 0 && (
        <style>{`
          @keyframes marquee-scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-${singleSetWidth}px); }
          }
        `}</style>
      )}
    </div>
  )
}

export { ArtistPreviewStrip }
