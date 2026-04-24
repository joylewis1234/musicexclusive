import { cn } from "@/lib/utils"
import { useRef, useEffect, useState } from "react"

interface Artist {
  name: string
  genre: string
  imageUrl: string
  fitMode?: "cover" | "contain"
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

  // ~45s per set width for slower scroll
  const duration = singleSetWidth > 0 ? singleSetWidth / 15 : 45

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
                className="relative w-24 md:w-32 aspect-square overflow-hidden"
                style={{
                  boxShadow: `0 0 12px hsla(${glowColor.base}, 0.5), 0 0 24px hsla(${glowColor.base}, 0.3), 0 0 40px hsla(${glowColor.base}, 0.15)`,
                }}
              >
                {artist.fitMode === "contain" && (
                  <img
                    src={artist.imageUrl}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-60"
                  />
                )}
                <img
                  src={artist.imageUrl}
                  alt={artist.name}
                  className={`relative w-full h-full ${
                    artist.fitMode === "contain" ? "object-contain" : "object-cover"
                  }`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-1.5 md:p-2 text-center">
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
