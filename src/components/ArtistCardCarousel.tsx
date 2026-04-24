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
  const offsetRef = useRef(0)
  const [, forceRender] = useState(0)
  const dragState = useRef<{ startX: number; startOffset: number; dragging: boolean; moved: number }>({
    startX: 0,
    startOffset: 0,
    dragging: false,
    moved: 0,
  })
  const isPausedRef = useRef(false)
  useEffect(() => {
    isPausedRef.current = isPaused
  }, [isPaused])

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

  const normalizeOffset = (value: number) => {
    if (singleSetWidth <= 0) return value
    const mod = ((value % singleSetWidth) + singleSetWidth) % singleSetWidth
    return mod
  }

  // rAF-driven auto-scroll (~12px/s) — pauses during hover/drag
  useEffect(() => {
    if (singleSetWidth <= 0) return
    let last = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      if (!isPausedRef.current && !dragState.current.dragging) {
        offsetRef.current = normalizeOffset(offsetRef.current + dt * 12)
        if (trackRef.current) {
          trackRef.current.style.transform = `translateX(-${offsetRef.current}px)`
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [singleSetWidth])

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (singleSetWidth <= 0) return
    ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
    dragState.current = {
      startX: e.clientX,
      startOffset: offsetRef.current,
      dragging: true,
      moved: 0,
    }
    setIsPaused(true)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current.dragging) return
    const delta = e.clientX - dragState.current.startX
    dragState.current.moved = Math.max(dragState.current.moved, Math.abs(delta))
    offsetRef.current = normalizeOffset(dragState.current.startOffset - delta)
    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(-${offsetRef.current}px)`
    }
  }

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current.dragging) return
    dragState.current.dragging = false
    try {
      ;(e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }
    forceRender((n) => n + 1)
  }

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Suppress click if it was the end of a drag
    if (dragState.current.moved > 5) return
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
        style={{ willChange: "transform" }}
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
    </div>
  )
}

export { ArtistCardCarousel }
