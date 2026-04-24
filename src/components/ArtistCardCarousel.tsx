import { useRef, useEffect, useState } from "react"
import { ArtistCard } from "@/components/ArtistCard"

interface Artist {
  name: string
  genre: string
  imageUrl: string
  fitMode?: "cover" | "contain"
}

interface ArtistCardCarouselProps {
  artists: Artist[]
}

const ArtistCardCarousel = ({ artists }: ArtistCardCarouselProps) => {
  const trackRef = useRef<HTMLDivElement>(null)
  const [singleSetWidth, setSingleSetWidth] = useState(0)

  const duplicated = [...artists, ...artists, ...artists]

  useEffect(() => {
    if (!trackRef.current) return
    const cards = trackRef.current.children
    const count = artists.length
    let width = 0
    for (let i = 0; i < count && i < cards.length; i++) {
      const card = cards[i] as HTMLElement
      width += card.offsetWidth
      // Account for gap (24px = gap-6)
      if (i < count - 1) width += 24
    }
    // Add one more gap for the seamless wrap
    width += 24
    setSingleSetWidth(width)
  }, [artists.length])

  // ~30px/s
  const duration = singleSetWidth > 0 ? singleSetWidth / 30 : 30

  return (
    <div className="relative overflow-hidden">
      <div
        ref={trackRef}
        className="flex gap-6 hover:[animation-play-state:paused]"
        style={{
          animation: singleSetWidth > 0
            ? `artist-card-scroll ${duration}s linear infinite`
            : undefined,
        }}
      >
        {duplicated.map((artist, index) => (
          <ArtistCard
            key={`${artist.name}-${index}`}
            name={artist.name}
            genre={artist.genre}
            imageUrl={artist.imageUrl}
            fitMode={artist.fitMode}
          />
        ))}
      </div>

      {singleSetWidth > 0 && (
        <style>{`
          @keyframes artist-card-scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-${singleSetWidth}px); }
          }
        `}</style>
      )}
    </div>
  )
}

export { ArtistCardCarousel }
