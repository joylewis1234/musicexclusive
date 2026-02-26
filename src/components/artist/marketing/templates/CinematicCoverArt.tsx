import { Flame, Crown, Globe } from "lucide-react";
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
        background: "radial-gradient(ellipse at center top, hsl(220 20% 8%) 0%, hsl(220 10% 3%) 60%, hsl(0 0% 0%) 100%)",
        fontFamily: "'Georgia', 'Times New Roman', serif",
      }}
    >
      {/* Smoke / atmosphere layers — blue tones */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background:
          "radial-gradient(ellipse at 30% 25%, hsla(210, 60%, 30%, 0.18) 0%, transparent 50%), " +
          "radial-gradient(ellipse at 70% 20%, hsla(210, 60%, 30%, 0.12) 0%, transparent 45%), " +
          "radial-gradient(ellipse at 50% 70%, hsla(220, 50%, 20%, 0.10) 0%, transparent 50%)",
      }} />

      {/* Gold light burst behind hero */}
      <div className="absolute pointer-events-none" style={{
        top: "80px", left: "50%", transform: "translateX(-50%)",
        width: "800px", height: "600px",
        background: "radial-gradient(ellipse at center, hsla(42, 80%, 50%, 0.25) 0%, hsla(42, 70%, 40%, 0.10) 30%, transparent 65%)",
        filter: "blur(30px)",
      }} />

      {/* Horizontal gold flare */}
      <div className="absolute pointer-events-none" style={{
        top: "320px", left: 0, right: 0, height: "4px",
        background: "linear-gradient(90deg, transparent 5%, hsla(42, 80%, 55%, 0.3) 30%, hsla(42, 80%, 55%, 0.5) 50%, hsla(42, 80%, 55%, 0.3) 70%, transparent 95%)",
        filter: "blur(3px)",
      }} />

      {/* Particle overlay — blue particles */}
      <div className="absolute inset-0 pointer-events-none opacity-30" style={{
        backgroundImage:
          "radial-gradient(1px 1px at 120px 200px, hsla(42, 70%, 60%, 0.8), transparent), " +
          "radial-gradient(1px 1px at 400px 100px, hsla(42, 70%, 60%, 0.6), transparent), " +
          "radial-gradient(1.5px 1.5px at 700px 300px, hsla(42, 70%, 60%, 0.7), transparent), " +
          "radial-gradient(1px 1px at 900px 150px, hsla(42, 70%, 60%, 0.5), transparent), " +
          "radial-gradient(1px 1px at 250px 500px, hsla(42, 70%, 60%, 0.4), transparent), " +
          "radial-gradient(1.5px 1.5px at 800px 550px, hsla(42, 70%, 60%, 0.6), transparent), " +
          "radial-gradient(1px 1px at 550px 680px, hsla(210, 60%, 50%, 0.5), transparent), " +
          "radial-gradient(1px 1px at 150px 750px, hsla(210, 60%, 50%, 0.4), transparent)",
      }} />

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at center, transparent 30%, hsla(0 0% 0% / 0.75) 100%)",
      }} />

      {/* Blue accent glow at bottom */}
      <div className="absolute pointer-events-none" style={{
        bottom: 0, left: 0, right: 0, height: "200px",
        background: "linear-gradient(to top, hsla(210, 70%, 25%, 0.25) 0%, transparent 100%)",
      }} />

      {/* ——— CONTENT ——— */}

      {/* Top badge */}
      <div className="relative z-10 mt-[24px] flex items-center gap-4 px-12 py-3" style={{
        border: "2px solid hsla(42, 70%, 50%, 0.6)",
        background: "hsla(0, 0%, 0%, 0.6)",
        borderRadius: "4px",
      }}>
        <Flame className="w-9 h-9" style={{ color: "hsl(210, 80%, 55%)" }} />
        <span className="font-bold uppercase" style={{ fontSize: "28px", color: "hsl(42, 75%, 55%)", letterSpacing: "0.4em" }}>
          Exclusive Music Release
        </span>
      </div>

      {/* Hero image with cinematic frame */}
      <div className="relative z-10 mt-[14px]">
        <div className="absolute -inset-8" style={{
          background: "radial-gradient(ellipse at center, hsla(42, 80%, 50%, 0.35) 0%, hsla(42, 80%, 50%, 0.05) 60%, transparent 80%)",
          filter: "blur(30px)",
        }} />
        <div className="relative overflow-hidden" style={{
          width: "440px", height: "440px", borderRadius: "16px",
          border: "3px solid hsla(42, 70%, 50%, 0.5)",
          boxShadow: "0 0 80px hsla(42, 80%, 50%, 0.25), 0 0 40px hsla(42, 80%, 50%, 0.15), 0 30px 80px hsla(0, 0%, 0%, 0.7), inset 0 0 30px hsla(0, 0%, 0%, 0.3)",
        }}>
          {imageUrl ? (
            <img src={imageUrl} alt="Cover art" className="w-full h-full" crossOrigin="anonymous" style={imgStyle} />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: "hsl(0 0% 12%)" }}>
              <span className="text-[56px]" style={{ color: "hsl(0 0% 25%)" }}>🎵</span>
            </div>
          )}
        </div>
      </div>

      {/* Text block */}
      <div className="relative z-10 flex flex-col items-center text-center mt-[8px] px-[80px]">
        <p className="font-semibold italic" style={{ fontSize: "30px", color: "hsl(42, 55%, 65%)", letterSpacing: "0.05em" }}>
          Now Streaming On
        </p>
        <h2 className="font-extrabold uppercase" style={{
          fontSize: "72px", color: "hsl(0, 0%, 96%)", letterSpacing: "0.14em", lineHeight: 1.0,
          textShadow: "0 0 40px hsla(42, 70%, 50%, 0.35), 0 2px 6px hsla(0, 0%, 0%, 0.6)", marginTop: "0px",
        }}>
          Music Exclusive
        </h2>
        <p className="font-semibold italic" style={{
          fontSize: "38px", color: "hsl(42, 65%, 62%)", marginTop: "2px",
          maxWidth: "800px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          fontFamily: "'Georgia', 'Times New Roman', serif",
        }}>
          {artistName || "Artist Name"}
        </p>
        <h3 className="font-extrabold uppercase" style={{
          fontSize: "50px", color: "hsl(0, 0%, 100%)", letterSpacing: "0.06em", lineHeight: 1.1,
          maxWidth: "900px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          textShadow: "0 2px 10px hsla(0, 0%, 0%, 0.6)",
        }}>
          {trackTitle || "Track Title"}
        </h3>
        {releaseDate && (
          <p className="font-bold italic" style={{ fontSize: "32px", color: "hsl(210, 70%, 50%)", marginTop: "0px", fontFamily: "'Georgia', 'Times New Roman', serif" }}>
            {releaseDate}
          </p>
        )}
      </div>

      {/* Blue accent line */}
      <div className="relative z-10 mt-[6px]" style={{
        width: "600px", height: "2px",
        background: "linear-gradient(90deg, transparent, hsla(210, 70%, 45%, 0.6), hsla(210, 70%, 45%, 0.8), hsla(210, 70%, 45%, 0.6), transparent)",
      }} />

      {/* Domain line */}
      <div className="relative z-10 flex flex-col items-center mt-[6px] gap-[1px]">
        <span className="uppercase font-semibold" style={{ fontSize: "16px", color: "hsl(0, 0%, 50%)", letterSpacing: "0.25em" }}>
          Only Exclusively Released On
        </span>
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5" style={{ color: "hsl(0, 0%, 60%)" }} />
          <span className="font-bold" style={{ fontSize: "24px", color: "hsl(0, 0%, 90%)" }}>
            www.TheMusicIsExclusive.com
          </span>
        </div>
      </div>

      {/* Footer brand lockup */}
      <div className="relative z-10 mt-[12px] mb-[20px] flex flex-col items-center gap-[6px]">
        <div className="flex items-center gap-3">
          <Crown className="w-7 h-7" style={{ color: "hsl(42, 75%, 55%)" }} />
          <span className="font-extrabold uppercase" style={{ fontSize: "30px", color: "hsl(0, 0%, 92%)", letterSpacing: "0.25em" }}>
            Music Exclusive
          </span>
          <Crown className="w-7 h-7" style={{ color: "hsl(42, 75%, 55%)" }} />
        </div>
        <span className="uppercase font-extrabold px-8 py-2" style={{
          fontSize: "28px", color: "hsl(210, 70%, 50%)", letterSpacing: "0.25em",
          border: "2px solid hsla(42, 70%, 50%, 0.4)", borderRadius: "4px", background: "hsla(0, 0%, 0%, 0.5)",
        }}>
          {ctaLine}
        </span>
      </div>
    </div>
  );
};
