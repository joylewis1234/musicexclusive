import { useNavigate } from "react-router-dom";
import { Sparkles, Unlock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import vaultPortal from "@/assets/vault-portal.png";

interface PreviewUpsellModalProps {
  open: boolean;
  onDismiss: () => void;
}

export const PreviewUpsellModal = ({ open, onDismiss }: PreviewUpsellModalProps) => {
  const navigate = useNavigate();

  return (
    <>
    <Dialog open={open} onOpenChange={(o) => { if (!o) onDismiss(); }}>
      <DialogContent
        className="sm:max-w-[420px] border-0 rounded-2xl p-0 overflow-hidden bg-transparent shadow-none [&>button]:text-white/60 [&>button]:hover:text-white"
      >
        {/* Outer wrapper with glassmorphism + edge glow */}
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(8, 4, 16, 0.97) 0%, rgba(4, 2, 8, 0.99) 100%)',
            boxShadow: `
              0 0 80px hsla(280, 80%, 40%, 0.25),
              0 0 120px hsla(180, 80%, 40%, 0.1),
              inset 0 1px 0 rgba(255,255,255,0.06)
            `,
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          {/* Ambient glow orbs */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-600/20 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-primary/15 blur-[100px] rounded-full pointer-events-none" />

          {/* Content */}
          <div className="relative px-6 pt-8 pb-6 sm:px-8 sm:pt-10 sm:pb-8 flex flex-col items-center text-center">
            {/* Scarcity signal */}
            <span className="text-[10px] uppercase tracking-[0.25em] text-primary/70 font-display mb-5">
              Access is limited
            </span>

            {/* Vault Portal with layered glow */}
            <div className="relative mb-7 w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center">
              {/* Outer glow ring */}
              <div className="absolute inset-[-20px] bg-purple-500/20 rounded-full blur-[40px] animate-pulse" />
              {/* Mid glow ring */}
              <div className="absolute inset-[-12px] bg-gradient-to-br from-primary/30 via-purple-500/25 to-primary/30 rounded-full blur-2xl opacity-70 animate-pulse" style={{ animationDelay: '0.5s' }} />
              {/* Inner shimmer */}
              <div
                className="absolute inset-0 rounded-lg"
                style={{
                  background: 'linear-gradient(135deg, transparent 40%, rgba(0,255,255,0.08) 50%, transparent 60%)',
                  animation: 'shimmer 3s ease-in-out infinite',
                }}
              />

              <img
                src={vaultPortal}
                alt="Vault Portal"
                className="relative w-full h-full object-contain drop-shadow-[0_0_24px_hsl(var(--primary))]"
              />

              {/* Sparkle accents */}
              <Sparkles className="absolute -top-1 -right-2 w-5 h-5 text-primary/90 animate-pulse" />
              <Sparkles className="absolute bottom-1 -left-3 w-4 h-4 text-purple-400/80 animate-pulse" style={{ animationDelay: '0.7s' }} />
              <Sparkles className="absolute top-1/2 -right-4 w-3 h-3 text-primary/50 animate-pulse" style={{ animationDelay: '1.2s' }} />
            </div>

            {/* Headline */}
            <h2
              className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-[0.12em] text-foreground mb-2"
              style={{
                textShadow:
                  '0 0 30px rgba(0, 255, 255, 0.5), 0 0 60px rgba(0, 255, 255, 0.25), 0 0 90px rgba(128, 0, 255, 0.15)',
              }}
            >
              The Vault Is Calling
            </h2>

            {/* Subtitle - aspirational */}
            <p className="text-sm text-muted-foreground/80 font-display tracking-wide mb-4 max-w-[280px]">
              You've heard the surface. The real experience lives behind the{' '}
              <span
                className="text-primary font-medium"
                style={{ textShadow: '0 0 12px hsla(var(--primary) / 0.5)' }}
              >
                Vault
              </span>.
            </p>

            {/* Gradient divider */}
            <div className="w-full max-w-[160px] h-px mb-5 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

            {/* Body */}
            <p className="text-[13px] text-muted-foreground/60 font-body leading-relaxed max-w-[300px] mb-6">
              These tracks are{' '}
              <span
                className="font-semibold"
                style={{
                  background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(280, 80%, 65%))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                exclusive
              </span>{' '}
              to Music Exclusive.
              Unlock full access through the Vault or skip straight in as a Superfan.
            </p>

            {/* CTAs */}
            <div className="flex flex-col gap-3 w-full">
              {/* PRIMARY: Superfan */}
              <button
                className="group relative w-full rounded-xl py-3.5 px-6 font-display text-sm font-bold uppercase tracking-wider text-background overflow-hidden transition-all duration-300"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(280, 80%, 55%), hsl(var(--primary)))',
                  backgroundSize: '200% 200%',
                  animation: 'gradientShift 4s ease infinite',
                  boxShadow: '0 0 24px hsla(var(--primary) / 0.4), 0 0 48px hsla(280, 80%, 50%, 0.2), 0 4px 16px rgba(0,0,0,0.4)',
                }}
                onClick={() => {
                  onDismiss();
                  navigate("/founding-superfan");
                }}
              >
                {/* Hover glow intensifier */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-white/10" />
                <span className="relative flex items-center justify-center gap-2">
                  <Zap className="h-5 w-5" />
                  Become a Superfan — Instant Access
                </span>
              </button>

              {/* Microcopy under Superfan */}
              <span className="text-[10px] text-primary/60 font-display uppercase tracking-[0.2em] -mt-1">
                Immediate access. No waiting.
              </span>

              {/* SECONDARY: Vault Access */}
              <button
                className="group relative w-full rounded-xl py-3 px-6 font-display text-sm font-semibold uppercase tracking-wider text-foreground/80 overflow-hidden transition-all duration-300 hover:text-foreground"
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 0 12px hsla(var(--primary) / 0.08)',
                }}
                onClick={() => navigate("/vault/enter")}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'hsla(var(--primary) / 0.3)';
                  e.currentTarget.style.boxShadow = '0 0 20px hsla(var(--primary) / 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.boxShadow = '0 0 12px hsla(var(--primary) / 0.08)';
                }}
              >
                <span className="relative flex items-center justify-center gap-2">
                  <Unlock className="h-4 w-4" />
                  Enter the Vault
                </span>
              </button>

              {/* Not now */}
              <button
                className="mt-1 text-[11px] text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors font-display uppercase tracking-widest"
                onClick={onDismiss}
              >
                Not now
              </button>
            </div>
          </div>
        </div>

        {/* Inline keyframes */}
        <style>{`
          @keyframes shimmer {
            0%, 100% { opacity: 0; transform: translateX(-100%); }
            50% { opacity: 1; transform: translateX(100%); }
          }
          @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}</style>
      </DialogContent>
    </Dialog>
    </>
  );
};
