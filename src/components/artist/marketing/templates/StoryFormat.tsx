import { Lock, Crown, Globe } from "lucide-react";
import type { ImagePosition } from "../TemplateCanvas";

interface Props {
  imageUrl: string | null;
  artistName: string;
  trackTitle: string;
  releaseDate?: string;
  ctaLine: string;
  imagePosition?: ImagePosition;
}

export const StoryFormat = ({
  imageUrl,
  artistName,
  trackTitle,
  releaseDate,
  ctaLine,
  imagePosition,
}: Props) => {
  const imgStyle: React.CSSProperties = imagePosition
    ? { objectFit: "cover" as const, objectPosition: imagePosition.objectPosition, transform: `scale(${imagePosition.scale})` }
    : { objectFit: "cover" as const };
  return (
    <div
      className="relative w-[1080px] h-[1920px] overflow-hidden flex flex-col items-center justify-between"
      style={{
        background: "radial-gradient(ellipse at center top, hsl(0 0% 10%) 0%, hsl(0 0% 2%) 60%, hsl(0 0% 0%) 100%)",
        fontFamily: "'Georgia', 'Times New Roman', serif",
      }}
    >
      {/* Bokeh */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 25% 20%, hsla(45, 80%, 50%, 0.07) 0%, transparent 35%), radial-gradient(circle at 75% 15%, hsla(45, 80%, 50%, 0.05) 0%, transparent 30%), radial-gradient(circle at 50% 75%, hsla(0, 70%, 50%, 0.04) 0%, transparent 35%)",
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 35%, hsla(0 0% 0% / 0.75) 100%)",
        }}
      />

      {/* Top badge */}
      <div
        className="relative z-10 mt-[100px] flex items-center gap-3 px-8 py-3 rounded-sm"
        style={{
          border: "1.5px solid hsla(45, 80%, 50%, 0.5)",
          background: "hsla(0, 0%, 0%, 0.5)",
        }}
      >
        <Lock className="w-5 h-5" style={{ color: "hsl(45, 80%, 55%)" }} />
        <span className="text-[18px] uppercase tracking-[0.35em] font-bold" style={{ color: "hsl(45, 80%, 55%)" }}>
          Exclusive Release
        </span>
      </div>

      {/* Image — large for story */}
      <div className="relative z-10 mt-[60px]">
        <div
          className="absolute -inset-6 rounded-2xl"
          style={{
            background: "linear-gradient(180deg, hsla(45, 80%, 50%, 0.35), transparent 50%, hsla(0, 70%, 50%, 0.15))",
            filter: "blur(25px)",
          }}
        />
        <div
          className="relative w-[520px] h-[520px] rounded-2xl overflow-hidden"
          style={{
            border: "2px solid hsla(45, 80%, 50%, 0.4)",
            boxShadow: "0 0 80px hsla(45, 80%, 50%, 0.2), 0 30px 80px hsla(0,0%,0%,0.7)",
          }}
        >
          {imageUrl ? (
            <img src={imageUrl} alt="Artist" className="w-full h-full" crossOrigin="anonymous" style={imgStyle} />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: "hsl(0 0% 15%)" }}>
              <span className="text-[56px]" style={{ color: "hsl(0 0% 30%)" }}>📷</span>
            </div>
          )}
        </div>
      </div>

      {/* Text */}
      <div className="relative z-10 flex flex-col items-center text-center mt-[50px] px-10">
        <p className="text-[24px] italic tracking-wide" style={{ color: "hsl(45, 60%, 65%)" }}>
          Now Streaming On
        </p>
        <h2 className="text-[56px] font-extrabold uppercase tracking-[0.12em] mt-2" style={{ color: "hsl(0, 0%, 95%)" }}>
          Music Exclusive
        </h2>
        <p className="text-[32px] mt-3" style={{ color: "hsl(45, 70%, 60%)" }}>
          {artistName || "Artist Name"}
        </p>
        <h3 className="text-[42px] font-extrabold uppercase tracking-wide mt-1" style={{ color: "hsl(0, 0%, 100%)" }}>
          {trackTitle || "Track Title"}
        </h3>
        {releaseDate && (
          <p className="text-[18px] mt-2" style={{ color: "hsl(0, 70%, 55%)" }}>
            {releaseDate}
          </p>
        )}
      </div>

      {/* Swipe up CTA area */}
      <div className="relative z-10 flex flex-col items-center mb-[80px] gap-3">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4" style={{ color: "hsl(0, 0%, 60%)" }} />
          <span className="text-[20px] font-bold" style={{ color: "hsl(0, 0%, 85%)" }}>
            www.TheMusicIsExclusive.com
          </span>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Crown className="w-5 h-5" style={{ color: "hsl(45, 80%, 55%)" }} />
          <span className="text-[24px] font-extrabold uppercase tracking-[0.25em]" style={{ color: "hsl(0, 0%, 90%)" }}>
            Music Exclusive
          </span>
          <Crown className="w-5 h-5" style={{ color: "hsl(45, 80%, 55%)" }} />
        </div>
        <span className="text-[14px] uppercase tracking-[0.3em]" style={{ color: "hsl(0, 70%, 50%)" }}>
          {ctaLine}
        </span>

        {/* Swipe indicator */}
        <div className="mt-[30px] flex flex-col items-center gap-1">
          <div className="w-[1px] h-[30px]" style={{ background: "hsla(0, 0%, 100%, 0.3)" }} />
          <span className="text-[12px] uppercase tracking-[0.2em]" style={{ color: "hsla(0, 0%, 100%, 0.4)" }}>
            Swipe Up
          </span>
        </div>
      </div>
    </div>
  );
};
