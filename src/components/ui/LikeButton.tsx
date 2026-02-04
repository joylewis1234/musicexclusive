import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface LikeButtonProps {
  isLiked: boolean;
  isLoading: boolean;
  canLike: boolean;
  onClick: (e: React.MouseEvent) => void;
}

export const LikeButton = ({ isLiked, isLoading, canLike, onClick }: LikeButtonProps) => {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={cn(
        "p-2 rounded-full transition-all",
        isLiked
          ? "text-pink-400"
          : "text-muted-foreground hover:text-foreground",
        !canLike && "opacity-40"
      )}
      aria-label={isLiked ? "Unlike" : "Like"}
    >
      <Heart 
        className={cn(
          "w-5 h-5 transition-transform",
          isLiked && "fill-current scale-110"
        )} 
      />
    </button>
  );
};
