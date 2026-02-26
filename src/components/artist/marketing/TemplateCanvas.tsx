import { forwardRef } from "react";
import { CinematicArtistPhoto } from "./templates/CinematicArtistPhoto";
import { CinematicCoverArt } from "./templates/CinematicCoverArt";

export type TemplateType = "artist-photo" | "cover-art";

export const TEMPLATE_DIMENSIONS: Record<TemplateType, { width: number; height: number }> = {
  "artist-photo": { width: 1080, height: 1080 },
  "cover-art": { width: 1080, height: 1080 },
};

export interface ImagePosition {
  scale: number;
  objectPosition: string;
}

export type AccentColorKey = "gold" | "red" | "blue" | "neon-purple" | "white" | "black";

export const ACCENT_COLORS: Record<AccentColorKey, { label: string; hsl: string }> = {
  gold: { label: "Gold", hsl: "hsl(42, 65%, 62%)" },
  red: { label: "Red", hsl: "hsl(0, 70%, 50%)" },
  blue: { label: "Blue", hsl: "hsl(210, 70%, 50%)" },
  "neon-purple": { label: "Neon Purple", hsl: "hsl(280, 80%, 60%)" },
  white: { label: "White", hsl: "hsl(0, 0%, 100%)" },
  black: { label: "Black", hsl: "hsl(0, 0%, 10%)" },
};

interface Props {
  template: TemplateType;
  imageUrl: string | null;
  artistName: string;
  trackTitle: string;
  releaseDate?: string;
  ctaLine: string;
  imagePosition?: ImagePosition;
  artistNameColor?: AccentColorKey;
  ctaColor?: AccentColorKey;
}

const templateMap: Record<TemplateType, React.FC<Omit<Props, "template">>> = {
  "artist-photo": CinematicArtistPhoto,
  "cover-art": CinematicCoverArt,
};

export const TemplateCanvas = forwardRef<HTMLDivElement, Props>(
  ({ template, ...rest }, ref) => {
    const dims = TEMPLATE_DIMENSIONS[template];
    const Component = templateMap[template];
    return (
      <div
        ref={ref}
        className="origin-top-left"
        style={{ width: dims.width, height: dims.height }}
      >
        <Component {...rest} />
      </div>
    );
  }
);

TemplateCanvas.displayName = "TemplateCanvas";
