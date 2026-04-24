import { ChevronRight, BadgeCheck } from "lucide-react"

interface ArtistCardProps {
  name: string
  genre: string
  imageUrl: string
  fitMode?: "cover" | "contain"
}

const ArtistCard = ({ name, genre, imageUrl, fitMode = "cover" }: ArtistCardProps) => {
  return (
    <div 
      className="relative flex-shrink-0 w-[230px] md:w-[275px] aspect-square overflow-hidden group cursor-pointer transition-all duration-300 hover:-translate-y-1"
      style={{
        boxShadow: "0 0 25px hsl(var(--primary) / 0.25), 0 0 50px hsl(var(--primary) / 0.12)",
      }}
    >
      {/* Glow border */}
      <div 
        className="absolute inset-0 p-[1px] pointer-events-none"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary) / 0.5), hsl(var(--accent) / 0.3), hsl(var(--primary) / 0.5))",
        }}
      />
      
      {/* Inner container */}
      <div className="absolute inset-[1px] overflow-hidden bg-background">
        {/* Blurred background fill (visible behind contained images) */}
        {fitMode === "contain" && (
          <img
            src={imageUrl}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-60"
          />
        )}
        {/* Background Image */}
        <img
          src={imageUrl}
          alt={name}
          className={`absolute inset-0 w-full h-full transition-transform duration-500 group-hover:scale-105 ${
            fitMode === "contain" ? "object-contain" : "object-cover"
          }`}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />

        {/* Exclusive Artist Badge */}
        <div className="absolute top-3 right-3 z-10">
          <div 
            className="flex items-center gap-1 px-2 py-0.5 rounded-full backdrop-blur-md transition-all duration-300 group-hover:shadow-[0_0_12px_hsl(280_80%_70%/0.5)]"
            style={{
              background: "rgba(10, 10, 15, 0.7)",
              border: "1px solid hsl(280 80% 70% / 0.6)",
              boxShadow: "0 0 8px hsl(280 80% 70% / 0.25), inset 0 0 8px hsl(280 80% 70% / 0.05)",
            }}
          >
            <BadgeCheck className="w-3 h-3" style={{ color: "hsl(280 80% 70%)" }} />
            <span 
              className="text-[9px] font-display font-semibold uppercase tracking-wider"
              style={{ color: "hsl(280 80% 70%)" }}
            >
              Exclusive
            </span>
          </div>
        </div>
        
        {/* Arrow Button */}
        <button className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-muted/50 backdrop-blur-sm flex items-center justify-center text-foreground/70 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      
      {/* Hover glow intensify */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          boxShadow: "0 0 30px hsl(var(--primary) / 0.4), 0 0 60px hsl(var(--primary) / 0.2)",
        }}
      />
    </div>
  )
}

export { ArtistCard }
