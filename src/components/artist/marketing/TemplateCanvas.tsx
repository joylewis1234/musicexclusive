import { forwardRef } from "react";
import { CinematicArtistPhoto } from "./templates/CinematicArtistPhoto";
import { CinematicCoverArt } from "./templates/CinematicCoverArt";

export type TemplateType = "artist-photo" | "cover-art";

interface Props {
  template: TemplateType;
  imageUrl: string | null;
  artistName: string;
  trackTitle: string;
  releaseDate?: string;
  ctaLine: string;
}

export const TemplateCanvas = forwardRef<HTMLDivElement, Props>(
  ({ template, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className="origin-top-left"
        style={{ width: 1080, height: 1080 }}
      >
        {template === "artist-photo" ? (
          <CinematicArtistPhoto {...rest} />
        ) : (
          <CinematicCoverArt {...rest} />
        )}
      </div>
    );
  }
);

TemplateCanvas.displayName = "TemplateCanvas";
