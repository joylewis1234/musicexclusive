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

interface Props {
  template: TemplateType;
  imageUrl: string | null;
  artistName: string;
  trackTitle: string;
  releaseDate?: string;
  ctaLine: string;
  imagePosition?: ImagePosition;
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
