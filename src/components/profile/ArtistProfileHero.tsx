import { Play, Shuffle, Share2, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ArtistProfileHeroProps {
  name: string;
  genre: string;
  imageUrl: string;
  onPlayAll: () => void;
  onShuffle?: () => void;
  onShareArtist: () => void;
  isPlaying?: boolean;
  hidePlayButton?: boolean;
}

export const ArtistProfileHero = ({
  name,
  genre,
  imageUrl,
  onPlayAll,
  onShuffle,
  onShareArtist,
  isPlaying = false,
  hidePlayButton = false,
}: ArtistProfileHeroProps) => {
  return (
    <div className="relative">
      {/* Full-width hero banner */}
      <div className="relative h-[50vh] min-h-[320px] max-h-[420px]">
        {/* Background image with blur for larger screens */}
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
        />
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/30" />
        
        {/* Subtle animated glow at bottom */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, hsla(280, 80%, 50%, 0.08), transparent)'
          }}
        />
      </div>

      {/* Artist info overlay */}
      <div className="absolute bottom-0 left-0 right-0 px-5 pb-6">
        <div className="w-full max-w-lg mx-auto">
          {/* Artist profile photo */}
          <div className="relative w-28 h-28 mb-4">
            {/* Glow ring */}
            <div 
              className="absolute -inset-1 rounded-full blur-sm"
              style={{ 
                background: 'linear-gradient(135deg, hsl(280, 80%, 50%), hsl(45, 90%, 55%))' 
              }}
            />
            <img
              src={imageUrl}
              alt={name}
              className="relative w-full h-full rounded-full object-cover border-2 border-background"
            />
          </div>

          {/* Artist name */}
          <h1
            className="font-display text-4xl md:text-5xl font-bold text-foreground tracking-tight mb-2"
            style={{ textShadow: "0 2px 20px rgba(0, 0, 0, 0.5)" }}
          >
            {name}
          </h1>

          {/* Genre subtitle */}
          <p className="text-muted-foreground text-sm font-medium mb-3">
            {genre}
          </p>

          {/* Exclusive Artist Badge - Neon Purple + Gold Crown */}
          <div className="relative inline-flex items-center gap-2 mb-5">
            <div 
              className="relative px-3 py-1.5 rounded-full"
              style={{
                background: 'hsla(280, 80%, 50%, 0.2)',
                boxShadow: '0 0 12px hsla(280, 80%, 50%, 0.3), inset 0 0 8px hsla(280, 80%, 50%, 0.1)'
              }}
            >
              {/* Gold Crown positioned on top-left edge */}
              <Crown 
                className="absolute -top-2 -left-1 w-4 h-4 rotate-[-15deg]"
                style={{
                  color: 'hsl(45, 90%, 55%)',
                  filter: 'drop-shadow(0 0 4px hsla(45, 90%, 55%, 0.8)) drop-shadow(0 0 8px hsla(45, 90%, 50%, 0.4))'
                }}
                fill="hsl(45, 90%, 55%)"
              />
              <span 
                className="text-xs font-display uppercase tracking-widest pl-2"
                style={{ color: 'hsl(280, 80%, 70%)' }}
              >
                Exclusive Artist
              </span>
            </div>
          </div>

          {/* Action buttons row */}
          <div className="flex items-center gap-3">
            {/* Play button - Primary CTA (hidden in artist preview) */}
            {!hidePlayButton && (
              <Button
                onClick={onPlayAll}
                size="lg"
                className={cn(
                  "rounded-full px-6 gap-2 font-medium transition-all",
                  isPlaying 
                    ? "bg-primary/20 border-2 border-primary text-primary hover:bg-primary/30" 
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
                style={{
                  boxShadow: isPlaying 
                    ? '0 0 20px hsla(280, 80%, 50%, 0.5)' 
                    : '0 0 15px hsla(280, 80%, 50%, 0.3)'
                }}
              >
                <Play className={cn("w-5 h-5", !isPlaying && "ml-0.5")} fill={isPlaying ? "currentColor" : "white"} />
                {isPlaying ? "Playing" : "Play"}
              </Button>
            )}

            {/* Shuffle button - Optional (hidden in artist preview) */}
            {!hidePlayButton && onShuffle && (
              <Button
                onClick={onShuffle}
                size="lg"
                variant="outline"
                className="rounded-full px-5 gap-2 border-muted-foreground/30 text-muted-foreground hover:text-foreground hover:border-foreground/50"
              >
                <Shuffle className="w-4 h-4" />
                Shuffle
              </Button>
            )}

            {/* Share artist button */}
            <Button
              onClick={onShareArtist}
              size="icon"
              variant="ghost"
              className="rounded-full w-11 h-11 text-muted-foreground hover:text-foreground hover:bg-muted/30"
              aria-label="Share artist"
            >
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
