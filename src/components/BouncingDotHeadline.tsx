import { useLayoutEffect, useRef, useState } from "react"

interface BouncingDotHeadlineProps {
  words: string[]
}

/**
 * Renders a headline where a glowing dot bounces from word to word in a loop,
 * and each word "pops" (scales up + glows) as the dot lands on it.
 *
 * Uses measured word positions so the dot lines up with each word regardless
 * of viewport width or wrapping.
 */
export const BouncingDotHeadline = ({ words }: BouncingDotHeadlineProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const wordRefs = useRef<Array<HTMLSpanElement | null>>([])
  const [positions, setPositions] = useState<Array<{ left: number; top: number }>>([])

  useLayoutEffect(() => {
    const measure = () => {
      const container = containerRef.current
      if (!container) return
      const containerBox = container.getBoundingClientRect()
      const next = wordRefs.current.map((el) => {
        if (!el) return { left: 0, top: 0 }
        const box = el.getBoundingClientRect()
        return {
          left: box.left - containerBox.left + box.width / 2,
          top: box.top - containerBox.top,
        }
      })
      setPositions(next)
    }
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [words])

  // Per-word: 0.7s active, total cycle = words * 0.7s
  const stepDuration = 0.7
  const totalDuration = words.length * stepDuration

  // Build keyframes for the dot: jump-and-bounce between word centers
  const dotKeyframes = positions.length === words.length
    ? (() => {
        const frames: string[] = []
        positions.forEach((pos, i) => {
          const startPct = (i / words.length) * 100
          const peakPct = ((i + 0.5) / words.length) * 100
          const landPct = ((i + 1) / words.length) * 100
          const nextPos = positions[(i + 1) % positions.length]
          const midLeft = (pos.left + nextPos.left) / 2
          frames.push(
            `${startPct.toFixed(2)}% { transform: translate(${pos.left}px, ${pos.top}px) translate(-50%, -100%); }`
          )
          frames.push(
            `${peakPct.toFixed(2)}% { transform: translate(${midLeft}px, ${pos.top - 28}px) translate(-50%, -100%); }`
          )
          frames.push(
            `${landPct.toFixed(2)}% { transform: translate(${nextPos.left}px, ${nextPos.top}px) translate(-50%, -100%); }`
          )
        })
        return frames.join("\n")
      })()
    : ""

  return (
    <div
      ref={containerRef}
      className="relative w-full animate-fade-up opacity-0"
      style={{ animationFillMode: "forwards" }}
    >
      <style>{`
        @keyframes bdh-dot {
          ${dotKeyframes}
        }
        @keyframes bdh-pop {
          0%, 100% { transform: scale(1); filter: brightness(1.15); }
          40% { transform: scale(1.18); filter: brightness(1.6); }
          70% { transform: scale(1.05); filter: brightness(1.3); }
        }
      `}</style>

      <p
        className="text-lg md:text-2xl uppercase tracking-[0.3em] gradient-text text-center leading-relaxed flex flex-wrap justify-center gap-x-3 gap-y-1"
        style={{
          textShadow:
            "0 0 10px hsl(var(--primary) / 0.8), 0 0 30px hsl(var(--primary) / 0.5), 0 0 60px hsl(var(--primary) / 0.3), 0 0 100px hsl(var(--primary) / 0.15)",
        }}
      >
        {words.map((word, i) => (
          <span
            key={`${word}-${i}`}
            ref={(el) => (wordRefs.current[i] = el)}
            className="inline-block"
            style={{
              animation: `bdh-pop ${totalDuration}s ease-in-out ${(i * stepDuration - stepDuration * 0.15).toFixed(
                2
              )}s infinite`,
              transformOrigin: "center",
            }}
          >
            {word}
          </span>
        ))}
      </p>

      {positions.length === words.length && (
        <span
          aria-hidden
          className="pointer-events-none absolute top-0 left-0 h-3 w-3 rounded-full bg-primary"
          style={{
            boxShadow:
              "0 0 8px hsl(var(--primary)), 0 0 18px hsl(var(--primary) / 0.8), 0 0 36px hsl(var(--primary) / 0.5)",
            animation: `bdh-dot ${totalDuration}s ease-in-out infinite`,
            willChange: "transform",
          }}
        />
      )}
    </div>
  )
}

export default BouncingDotHeadline
