import { Lock, Crown, Globe } from "lucide-react";

interface Props {
  imageUrl: string | null;
  artistName: string;
  trackTitle: string;
  releaseDate?: string;
  ctaLine: string;
}

export const CinematicArtistPhoto = ({
  imageUrl,
  artistName,
  trackTitle,
  releaseDate,
  ctaLine,
}: Props) => {
  return (
    <div
      className="relative w-[1080px] h-[1080px] overflow-hidden flex flex-col items-center justify-between"
      style={{
        background: "radial-gradient(ellipse at center, hsl(0 0% 12%) 0%, hsl(0 0% 4%) 70%, hsl(0 0% 0%) 100%)",
        fontFamily: "'Georgia', 'Times New Roman', serif",
      }}
    >
      {/* Bokeh overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 20% 30%, hsla(45, 80%, 50%, 0.08) 0%, transparent 40%), radial-gradient(circle at 80% 20%, hsla(45, 80%, 50%, 0.06) 0%, transparent 35%), radial-gradient(circle at 50% 80%, hsla(0, 70%, 50%, 0.05) 0%, transparent 40%)",
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 40%, hsla(0 0% 0% / 0.7) 100%)",
        }}
      />

      {/* Top badge */}
      <div className="relative z-10 mt-[60px] flex items-center gap-3 px-8 py-3 rounded-sm"
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

      {/* Artist image with gold glow frame */}
      <div className="relative z-10 mt-[30px]">
        <div
          className="absolute -inset-4 rounded-2xl"
          style={{
            background: "linear-gradient(135deg, hsla(45, 80%, 50%, 0.4), hsla(45, 80%, 50%, 0.1), hsla(45, 80%, 50%, 0.4))",
            filter: "blur(20px)",
          }}
        />
        <div
          className="relative w-[380px] h-[380px] rounded-2xl overflow-hidden"
          style={{
            border: "2px solid hsla(45, 80%, 50%, 0.4)",
            boxShadow: "0 0 60px hsla(45, 80%, 50%, 0.2), 0 20px 60px hsla(0,0%,0%,0.6)",
          }}
        >
          {imageUrl ? (
            <img src={imageUrl} alt="Artist" className="w-full h-full object-cover" crossOrigin="anonymous" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: "hsl(0 0% 15%)" }}>
              <span className="text-[48px]" style={{ color: "hsl(0 0% 30%)" }}>📷</span>
            </div>
          )}
        </div>
      </div>

      {/* Text block */}
      <div className="relative z-10 flex flex-col items-center text-center mt-[24px] px-8">
        <p className="text-[22px] italic tracking-wide" style={{ color: "hsl(45, 60%, 65%)" }}>
          Now Streaming On
        </p>
        <h2 className="text-[52px] font-extrabold uppercase tracking-[0.12em] mt-1" style={{ color: "hsl(0, 0%, 95%)" }}>
          Music Exclusive
        </h2>
        <p className="text-[30px] mt-2" style={{ color: "hsl(45, 70%, 60%)" }}>
          {artistName || "Artist Name"}
        </p>
        <h3 className="text-[38px] font-extrabold uppercase tracking-wide mt-0" style={{ color: "hsl(0, 0%, 100%)" }}>
          {trackTitle || "Track Title"}
        </h3>
        {releaseDate && (
          <p className="text-[16px] mt-1" style={{ color: "hsl(0, 70%, 55%)" }}>
            {releaseDate}
          </p>
        )}
      </div>

      {/* Domain line */}
      <div className="relative z-10 flex items-center gap-2 mt-[16px]">
        <span className="text-[14px] uppercase tracking-[0.2em]" style={{ color: "hsl(0, 0%, 50%)" }}>
          Only Exclusively Released On
        </span>
      </div>
      <div className="relative z-10 flex items-center gap-2 mt-[4px]">
        <Globe className="w-4 h-4" style={{ color: "hsl(0, 0%, 60%)" }} />
        <span className="text-[20px] font-bold" style={{ color: "hsl(0, 0%, 85%)" }}>
          www.TheMusicIsExclusive.com
        </span>
      </div>

      {/* Footer brand */}
      <div className="relative z-10 mb-[50px] mt-[20px] flex flex-col items-center gap-1">
        <div className="flex items-center gap-2">
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
