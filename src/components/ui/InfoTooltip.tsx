import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface InfoTooltipProps {
  message: string;
  className?: string;
}

export function InfoTooltip({ message, className = "" }: InfoTooltipProps) {
  const handleClick = (e: React.MouseEvent) => {
    // Prevent click from bubbling to parent elements (e.g., TabsTrigger)
    e.stopPropagation();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={handleClick}
          onMouseDown={(e) => e.stopPropagation()}
          className={`inline-flex items-center justify-center w-5 h-5 rounded-full border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary/60 transition-colors focus:outline-none focus:ring-1 focus:ring-primary/50 ${className}`}
          aria-label="More info"
        >
          <Info className="w-3 h-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        sideOffset={8}
        className="max-w-[280px] text-sm bg-card/95 backdrop-blur-md border-border/50 text-foreground shadow-lg shadow-primary/5 z-[100]"
      >
        <p className="text-muted-foreground leading-relaxed">{message}</p>
      </PopoverContent>
    </Popover>
  );
}
