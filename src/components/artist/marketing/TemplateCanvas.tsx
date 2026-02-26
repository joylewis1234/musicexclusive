import { forwardRef } from "react";
import { CinematicArtistPhoto } from "./templates/CinematicArtistPhoto";
import { CinematicCoverArt } from "./templates/CinematicCoverArt";
import { VaultGlow } from "./templates/VaultGlow";
import { MinimalLuxury } from "./templates/MinimalLuxury";
import { StoryFormat } from "./templates/StoryFormat";

export type TemplateType = "artist-photo" | "cover-art" | "vault-glow" | "minimal-luxury" | "story-format";

export const TEMPLATE_DIMENSIONS: Record<TemplateType, { width: number; height: number }> = {
  "artist-photo": { width: 1080, height: 1080 },
  "cover-art": { width: 1080, height: 1080 },
  "vault-glow": { width: 1080, height: 1080 },
  "minimal-luxury": { width: 1080, height: 1080 },
  "story-format": { width: 1080, height: 1920 },
};

interface Props {
  template: TemplateType;
  imageUrl: string | null;
  artistName: string;
  trackTitle: string;
  releaseDate?: string;
  ctaLine: string;
}

const templateMap: Record<TemplateType, React.FC<Omit<Props, "template">>> = {
  "artist-photo": CinematicArtistPhoto,
  "cover-art": CinematicCoverArt,
  "vault-glow": VaultGlow,
  "minimal-luxury": MinimalLuxury,
  "story-format": StoryFormat,
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
