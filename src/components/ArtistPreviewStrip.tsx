import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"

interface Artist {
  name: string
  genre: string
  imageUrl: string
}

interface ArtistPreviewStripProps {
  artists: Artist[]
  className?: string
}

const CYCLE_INTERVAL = 3000

const glowColors = [
  { base: "180, 100%, 50%" },
  { base: "300, 100%, 60%" },
  { base: "270, 100%, 60%" },
]

const ArtistPreviewStrip = ({ artists, className }: ArtistPreviewStripProps) => {
  const duplicated = [...artists, ...artists]
  // Track which index each card slot shows (for crossfade)
  const [swapMap, setSwapMap] = useState<Map<number, number>>(new Map())
  const [fadingKey, setFadingKey] = useState<number | null>(null)

  useEffect(() => {
    if (artists.length <= 1) return

    const interval = setInterval(() => {
      // Pick a random card position in the first set to crossfade
      const pos = Math.floor(Math.random() * artists.length)
      setFadingKey(pos)

      setTimeout(() => {
        setSwapMap(prev => {
          const next = new Map(prev)
          const current = next.get(pos) ?? pos
          // Pick a different artist
          let candidate = (current + 1) % artists.length
          // Avoid showing the same artist
          if (candidate === pos) candidate = (candidate + 1) % artists.length
          next.set(pos, candidate)
          return next
        })
        setTimeout(() => setFadingKey(null), 50)
      }, 600)
    }, CYCLE_INTERVAL)

    return () => clearInterval(interval)
  }, [artists.length])

  const renderCard = (originalIndex: number, keyPrefix: string) => {
    const resolvedIndex = swapMap.get(originalIndex % artists.length) ?? (originalIndex % artists.length)
    const artist = artists[resolvedIndex]
    const colorIndex = originalIndex % glowColors.length
    const glowColor = glowColors[colorIndex]
    const isFading = fadingKey === (originalIndex % artists.length)

    return (
      <div
        key={`${keyPrefix}-${originalIndex}`}
        className="flex-shrink-0 px-2"
      >
        <div
          className={cn(
            "relative w-20 md:w-24 aspect-square rounded-xl overflow-hidden transition-all",
            isFading ? "opacity-0 scale-95" : "opacity-100 scale-100"
          )}
          style={{
            boxShadow: `0 0 12px hsla(${glowColor.base}, 0.5), 0 0 24px hsla(${glowColor.base}, 0.3), 0 0 40px hsla(${glowColor.base}, 0.15)`,
            transitionDuration: "600ms",
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
  }

  return (
    <div className={cn("w-full overflow-hidden", className)}>
      <div className="flex animate-scroll-slow hover:[animation-play-state:paused]">
        {duplicated.map((_, index) => renderCard(index, index < artists.length ? "a" : "b"))}
      </div>
    </div>
  )
}

export { ArtistPreviewStrip }
