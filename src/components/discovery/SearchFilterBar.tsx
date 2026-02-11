import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { genres, Genre } from "@/data/discoveryArtists";
import { cn } from "@/lib/utils";

interface SearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedGenre: Genre;
  onGenreChange: (genre: Genre) => void;
}

export const SearchFilterBar = ({
  searchQuery,
  onSearchChange,
  selectedGenre,
  onGenreChange,
}: SearchFilterBarProps) => {
  return (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md py-3 -mx-4 px-4 border-b border-border/30 mb-6">
      <div className="max-w-5xl mx-auto space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tracks or artists…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-9 bg-card/60 border-border/40 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300 h-9 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Genre Pills - Horizontal Scroll */}
        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
          <div className="flex gap-2">
            {genres.map((genre) => {
              const isActive = selectedGenre === genre;
              return (
                <button
                  key={genre}
                  onClick={() => onGenreChange(genre)}
                  className={cn(
                    "flex-shrink-0 px-3 py-1 rounded-full text-xs font-display uppercase tracking-wider transition-all duration-200 border whitespace-nowrap",
                    isActive
                      ? "bg-primary/20 text-primary border-primary/50 shadow-[0_0_10px_hsl(var(--primary)/0.2)]"
                      : "bg-card/40 text-muted-foreground border-border/40 hover:border-primary/30 hover:text-foreground"
                  )}
                >
                  {genre}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
