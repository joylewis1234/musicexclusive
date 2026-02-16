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

const VISIBLE_COUNT = 4
const CYCLE_INTERVAL = 3000 // 3 seconds per transition

const glowColors = [
  { base: "180, 100%, 50%" },  // cyan
  { base: "300, 100%, 60%" },  // magenta
  { base: "270, 100%, 60%" },  // purple
]

const ArtistPreviewStrip = ({ artists, className }: ArtistPreviewStripProps) => {
  // Track which artist index is shown in each slot
  const [slots, setSlots] = useState(() =>
    Array.from({ length: VISIBLE_COUNT }, (_, i) => i % artists.length)
  )
  // Track which slot is currently transitioning
  const [fadingSlot, setFadingSlot] = useState<number | null>(null)
  // Counter to pick next artist
  const [nextArtistIndex, setNextArtistIndex] = useState(VISIBLE_COUNT % artists.length)

  useEffect(() => {
    if (artists.length <= VISIBLE_COUNT) return

    const interval = setInterval(() => {
      // Pick a random slot to swap
      const slotToSwap = Math.floor(Math.random() * VISIBLE_COUNT)
      
      // Fade out
      setFadingSlot(slotToSwap)

      // After fade out, swap the artist and fade back in
      setTimeout(() => {
        setSlots(prev => {
          const next = [...prev]
          // Find an artist not currently displayed
          let candidate = nextArtistIndex
          const currentlyVisible = new Set(next)
          while (currentlyVisible.has(candidate)) {
            candidate = (candidate + 1) % artists.length
          }
          next[slotToSwap] = candidate
          return next
        })
        setNextArtistIndex(prev => (prev + 1) % artists.length)
        
        // Small delay then fade back in
        setTimeout(() => {
          setFadingSlot(null)
        }, 50)
      }, 600) // matches fade-out duration
    }, CYCLE_INTERVAL)

    return () => clearInterval(interval)
  }, [artists.length, nextArtistIndex])

  return (
    <div className={cn("w-full", className)}>
      <div className="flex justify-center gap-3 md:gap-4">
        {slots.map((artistIndex, slotIndex) => {
          const artist = artists[artistIndex]
          const colorIndex = slotIndex % glowColors.length
          const glowColor = glowColors[colorIndex]
          const isFading = fadingSlot === slotIndex

          return (
            <div
              key={`slot-${slotIndex}`}
              className="flex-shrink-0"
            >
              <div
                className={cn(
                  "relative w-20 md:w-24 aspect-square rounded-xl overflow-hidden transition-all duration-600",
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
        })}
      </div>
    </div>
  )
}

export { ArtistPreviewStrip }
