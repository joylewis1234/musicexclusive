import { Lock, Crown, Globe, ShieldCheck } from "lucide-react";

interface Props {
  imageUrl: string | null;
  artistName: string;
  trackTitle: string;
  releaseDate?: string;
  ctaLine: string;
}

export const VaultGlow = ({
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
        background: "radial-gradient(ellipse at center, hsl(0 0% 8%) 0%, hsl(0 0% 2%) 80%)",
        fontFamily: "'Georgia', 'Times New Roman', serif",
      }}
    >
      {/* Vault outline shapes */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "conic-gradient(from 0deg at 50% 50%, hsla(45, 80%, 50%, 0.04) 0deg, transparent 60deg, hsla(45, 80%, 50%, 0.06) 120deg, transparent 180deg, hsla(45, 80%, 50%, 0.04) 240deg, transparent 300deg, hsla(45, 80%, 50%, 0.05) 360deg)",
        }}
      />

      {/* Vault radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, hsla(45, 90%, 55%, 0.15) 0%, transparent 40%), radial-gradient(circle at 50% 55%, hsla(45, 70%, 40%, 0.1) 0%, transparent 50%)",
        }}
      />

      {/* Vault ring outline */}
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          width: 620,
          height: 620,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          border: "1.5px solid hsla(45, 80%, 50%, 0.12)",
          boxShadow: "0 0 80px hsla(45, 80%, 50%, 0.06), inset 0 0 60px hsla(45, 80%, 50%, 0.04)",
        }}
      />
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          width: 720,
          height: 720,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          border: "1px solid hsla(45, 80%, 50%, 0.06)",
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 30%, hsla(0 0% 0% / 0.8) 100%)",
        }}
      />

      {/* Top badge */}
      <div
        className="relative z-10 mt-[55px] flex items-center gap-3 px-8 py-3 rounded-sm"
        style={{
          border: "1.5px solid hsla(45, 80%, 50%, 0.5)",
          background: "hsla(0, 0%, 0%, 0.6)",
        }}
      >
        <ShieldCheck className="w-5 h-5" style={{ color: "hsl(45, 80%, 55%)" }} />
        <span className="text-[18px] uppercase tracking-[0.35em] font-bold" style={{ color: "hsl(45, 80%, 55%)" }}>
          Vault Exclusive
        </span>
      </div>

      {/* Image */}
      <div className="relative z-10 mt-[25px]">
        <div
          className="absolute -inset-6 rounded-full"
          style={{
            background: "radial-gradient(circle, hsla(45, 90%, 55%, 0.3) 0%, transparent 70%)",
            filter: "blur(30px)",
          }}
        />
        <div
          className="relative w-[360px] h-[360px] rounded-full overflow-hidden"
          style={{
            border: "3px solid hsla(45, 80%, 50%, 0.45)",
            boxShadow: "0 0 60px hsla(45, 80%, 50%, 0.25), 0 0 120px hsla(45, 80%, 50%, 0.1), 0 20px 60px hsla(0,0%,0%,0.7)",
          }}
        >
          {imageUrl ? (
            <img src={imageUrl} alt="Artist" className="w-full h-full object-cover" crossOrigin="anonymous" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: "hsl(0 0% 12%)" }}>
              <span className="text-[48px]" style={{ color: "hsl(0 0% 25%)" }}>🔒</span>
            </div>
          )}
        </div>
      </div>

      {/* Text */}
      <div className="relative z-10 flex flex-col items-center text-center mt-[20px] px-8">
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

      {/* Footer */}
      <div className="relative z-10 flex flex-col items-center mb-[50px] gap-1">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4" style={{ color: "hsl(0, 0%, 60%)" }} />
          <span className="text-[20px] font-bold" style={{ color: "hsl(0, 0%, 85%)" }}>
            www.TheMusicIsExclusive.com
          </span>
        </div>
        <div className="flex items-center gap-2 mt-3">
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
