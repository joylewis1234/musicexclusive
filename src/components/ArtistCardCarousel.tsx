import { useRef, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
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
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const [singleSetWidth, setSingleSetWidth] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [manualOffset, setManualOffset] = useState(0)
  const dragState = useRef<{ startX: number; startOffset: number; dragging: boolean }>({
    startX: 0,
    startOffset: 0,
    dragging: false,
  })

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

  // ~12px/s for a slow, ambient drift
  const duration = singleSetWidth > 0 ? singleSetWidth / 12 : 90

  const normalizeOffset = (value: number) => {
    if (singleSetWidth <= 0) return value
    const mod = ((value % singleSetWidth) + singleSetWidth) % singleSetWidth
    return mod
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (singleSetWidth <= 0) return
    ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
    dragState.current = {
      startX: e.clientX,
      startOffset: manualOffset,
      dragging: true,
    }
    setIsPaused(true)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current.dragging) return
    const delta = e.clientX - dragState.current.startX
    setManualOffset(normalizeOffset(dragState.current.startOffset - delta))
  }

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current.dragging) return
    dragState.current.dragging = false
    try {
      ;(e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }
  }

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Suppress click if it was the end of a drag
    const moved = Math.abs(e.clientX - dragState.current.startX)
    if (moved > 5) return
    navigate("/vault/enter")
  }

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden touch-pan-y select-none cursor-grab active:cursor-grabbing"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={endDrag}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onClick={handleClick}
    >
      <div
        ref={trackRef}
        className="flex gap-6"
        style={{
          animation:
            singleSetWidth > 0
              ? `artist-card-scroll ${duration}s linear infinite`
              : undefined,
          animationPlayState: isPaused ? "paused" : "running",
          transform: isPaused && singleSetWidth > 0 ? `translateX(-${manualOffset}px)` : undefined,
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
