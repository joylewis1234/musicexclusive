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

export const CinematicCoverArt = ({
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
      className="relative w-[1080px] h-[1080px] overflow-hidden flex flex-col items-center"
      style={{
        background: "radial-gradient(ellipse at center top, hsl(0 0% 10%) 0%, hsl(0 0% 2%) 80%)",
        fontFamily: "'Georgia', 'Times New Roman', serif",
      }}
    >
      {/* Red/gold light rays */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 100%, hsla(0, 70%, 40%, 0.12) 0%, transparent 50%), radial-gradient(ellipse at 50% 0%, hsla(45, 70%, 50%, 0.08) 0%, transparent 50%)",
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
      <div className="relative z-10 mt-[55px] flex items-center gap-3 px-8 py-3 rounded-sm"
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

      {/* Cover art — larger, square */}
      <div className="relative z-10 mt-[35px]">
        <div
          className="absolute -inset-5 rounded-xl"
          style={{
            background: "linear-gradient(180deg, hsla(45, 80%, 50%, 0.35), transparent 50%, hsla(0, 70%, 50%, 0.2))",
            filter: "blur(25px)",
          }}
        />
        <div
          className="relative w-[420px] h-[420px] rounded-xl overflow-hidden"
          style={{
            border: "2px solid hsla(45, 80%, 50%, 0.35)",
            boxShadow: "0 0 80px hsla(45, 80%, 50%, 0.15), 0 30px 80px hsla(0,0%,0%,0.7)",
          }}
        >
          {imageUrl ? (
            <img src={imageUrl} alt="Cover art" className="w-full h-full" crossOrigin="anonymous" style={imgStyle} />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: "hsl(0 0% 15%)" }}>
              <span className="text-[48px]" style={{ color: "hsl(0 0% 30%)" }}>🎵</span>
            </div>
          )}
        </div>
      </div>

      {/* Text */}
      <div className="relative z-10 flex flex-col items-center text-center mt-[28px] px-8">
        <p className="text-[22px] italic tracking-wide" style={{ color: "hsl(45, 60%, 65%)" }}>
          Now Streaming On
        </p>
        <h2 className="text-[50px] font-extrabold uppercase tracking-[0.12em] mt-1" style={{ color: "hsl(0, 0%, 95%)" }}>
          Music Exclusive
        </h2>
        <p className="text-[28px] mt-2" style={{ color: "hsl(45, 70%, 60%)" }}>
          {artistName || "Artist Name"}
        </p>
        <h3 className="text-[36px] font-extrabold uppercase tracking-wide mt-0" style={{ color: "hsl(0, 0%, 100%)" }}>
          {trackTitle || "Track Title"}
        </h3>
        {releaseDate && (
          <p className="text-[16px] mt-1" style={{ color: "hsl(0, 70%, 55%)" }}>
            {releaseDate}
          </p>
        )}
      </div>

      {/* Domain */}
      <div className="relative z-10 flex flex-col items-center mt-auto mb-[50px] gap-1">
        <span className="text-[14px] uppercase tracking-[0.2em]" style={{ color: "hsl(0, 0%, 50%)" }}>
          Only Exclusively Released On
        </span>
        <div className="flex items-center gap-2 mt-1">
          <Globe className="w-4 h-4" style={{ color: "hsl(0, 0%, 60%)" }} />
          <span className="text-[20px] font-bold" style={{ color: "hsl(0, 0%, 85%)" }}>
            www.TheMusicIsExclusive.com
          </span>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <Crown className="w-5 h-5" style={{ color: "hsl(45, 80%, 55%)" }} />
          <span className="text-[22px] font-extrabold uppercase tracking-[0.25em]" style={{ color: "hsl(0, 0%, 90%)" }}>
            Music Exclusive
          </span>
          <Crown className="w-5 h-5" style={{ color: "hsl(45, 80%, 55%)" }} />
        </div>
        <span className="text-[13px] uppercase tracking-[0.3em]" style={{ color: "hsl(0, 70%, 50%)" }}>
          {ctaLine}
        </span>
      </div>
    </div>
  );
};
