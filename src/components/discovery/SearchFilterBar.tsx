import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { genres, Genre } from "@/data/discoveryArtists";

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
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md py-3 -mx-4 px-4 border-b border-border/50 mb-6">
      <div className="flex gap-3 max-w-2xl mx-auto">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search artists…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-muted/20 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300"
            style={{
              boxShadow: searchQuery ? "0 0 12px hsl(var(--primary) / 0.15)" : undefined,
            }}
          />
        </div>

        {/* Genre Filter */}
        <Select value={selectedGenre} onValueChange={(v) => onGenreChange(v as Genre)}>
          <SelectTrigger 
            className="w-[140px] bg-muted/20 border-border/50 focus:border-primary/50 focus:ring-primary/20"
            style={{
              boxShadow: selectedGenre !== "All Genres" ? "0 0 12px hsl(var(--primary) / 0.15)" : undefined,
            }}
          >
            <SelectValue placeholder="Genre" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {genres.map((genre) => (
              <SelectItem key={genre} value={genre}>
                {genre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
