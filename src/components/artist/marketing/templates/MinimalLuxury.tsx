import { Lock, Crown } from "lucide-react";

interface Props {
  imageUrl: string | null;
  artistName: string;
  trackTitle: string;
  releaseDate?: string;
  ctaLine: string;
}

export const MinimalLuxury = ({
  imageUrl,
  artistName,
  trackTitle,
  releaseDate,
  ctaLine,
}: Props) => {
  return (
    <div
      className="relative w-[1080px] h-[1080px] overflow-hidden flex flex-col items-center justify-center"
      style={{
        background: "hsl(0 0% 2%)",
        fontFamily: "'Georgia', 'Times New Roman', serif",
      }}
    >
      {/* Elegant border */}
      <div
        className="absolute pointer-events-none"
        style={{
          inset: 40,
          border: "1.5px solid hsla(45, 80%, 50%, 0.3)",
        }}
      />
      {/* Inner border */}
      <div
        className="absolute pointer-events-none"
        style={{
          inset: 50,
          border: "0.5px solid hsla(45, 80%, 50%, 0.12)",
        }}
      />

      {/* Corner accents */}
      {[
        { top: 35, left: 35 },
        { top: 35, right: 35 },
        { bottom: 35, left: 35 },
        { bottom: 35, right: 35 },
      ].map((pos, i) => (
        <div
          key={i}
          className="absolute w-3 h-3 pointer-events-none"
          style={{
            ...pos,
            background: "hsl(45, 80%, 55%)",
            boxShadow: "0 0 12px hsla(45, 80%, 55%, 0.5)",
          }}
        />
      ))}

      {/* Top badge */}
      <div className="flex items-center gap-3 mb-[50px]">
        <Lock className="w-4 h-4" style={{ color: "hsl(45, 80%, 55%)" }} />
        <span className="text-[16px] uppercase tracking-[0.4em] font-bold" style={{ color: "hsl(45, 80%, 55%)" }}>
          Exclusive Release
        </span>
        <Lock className="w-4 h-4" style={{ color: "hsl(45, 80%, 55%)" }} />
      </div>

      {/* Image */}
      {imageUrl ? (
        <div
          className="w-[300px] h-[300px] overflow-hidden mb-[40px]"
          style={{
            border: "1.5px solid hsla(45, 80%, 50%, 0.35)",
            boxShadow: "0 0 40px hsla(45, 80%, 50%, 0.1)",
          }}
        >
          <img src={imageUrl} alt="Cover" className="w-full h-full object-cover" crossOrigin="anonymous" />
        </div>
      ) : (
        <div
          className="w-[300px] h-[300px] flex items-center justify-center mb-[40px]"
          style={{
            border: "1.5px solid hsla(45, 80%, 50%, 0.2)",
            background: "hsl(0 0% 5%)",
          }}
        >
          <span className="text-[40px]" style={{ color: "hsl(0 0% 20%)" }}>🎵</span>
        </div>
      )}

      {/* Text */}
      <p className="text-[20px] italic tracking-wide" style={{ color: "hsl(45, 60%, 60%)" }}>
        Now Streaming On
      </p>
      <h2 className="text-[46px] font-extrabold uppercase tracking-[0.15em] mt-1" style={{ color: "hsl(45, 80%, 55%)" }}>
        Music Exclusive
      </h2>

      <div className="w-[200px] h-[1px] my-[20px]" style={{ background: "hsla(45, 80%, 50%, 0.3)" }} />

      <p className="text-[28px]" style={{ color: "hsl(0, 0%, 85%)" }}>
        {artistName || "Artist Name"}
      </p>
      <h3 className="text-[34px] font-extrabold uppercase tracking-wide mt-1" style={{ color: "hsl(0, 0%, 100%)" }}>
        {trackTitle || "Track Title"}
      </h3>
      {releaseDate && (
        <p className="text-[15px] mt-2" style={{ color: "hsl(45, 60%, 50%)" }}>
          {releaseDate}
        </p>
      )}

      {/* Footer */}
      <div className="absolute bottom-[60px] flex flex-col items-center gap-2">
        <span className="text-[14px] uppercase tracking-[0.25em]" style={{ color: "hsl(0, 0%, 40%)" }}>
          www.TheMusicIsExclusive.com
        </span>
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4" style={{ color: "hsl(45, 80%, 55%)" }} />
          <span className="text-[13px] uppercase tracking-[0.3em]" style={{ color: "hsl(0, 70%, 50%)" }}>
            {ctaLine}
          </span>
          <Crown className="w-4 h-4" style={{ color: "hsl(45, 80%, 55%)" }} />
        </div>
      </div>
    </div>
  );
};
