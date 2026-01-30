import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { GlowCard } from '@/components/ui/GlowCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { 
  X, 
  Upload, 
  User, 
  DollarSign, 
  Sparkles, 
  Crown,
  Music,
  Camera,
  BarChart3,
  MessageSquare,
  Gift,
  Megaphone,
  Users,
  Clock,
  QrCode,
  Mail,
  Share2,
  Zap,
} from 'lucide-react';

interface TutorialPageProps {
  isOpen: boolean;
  onClose: () => void;
  onDontShowAgain: () => void;
}

export const TutorialPage = ({ isOpen, onClose, onDontShowAgain }: TutorialPageProps) => {
  if (!isOpen) return null;

  const handleDontShowAgain = () => {
    onDontShowAgain();
    onClose();
  };

  const content = (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="fixed top-4 right-4 z-50 w-10 h-10 rounded-full bg-background/80 backdrop-blur-md border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background/90 transition-all"
      >
        <X className="w-5 h-5" />
      </button>

      {/* HERO SECTION */}
      <section className="relative px-4 pt-16 pb-12 overflow-hidden">
        <div className="container max-w-lg mx-auto text-center">
          {/* Animated glow background */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 blur-[100px] rounded-full animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-secondary/20 blur-[80px] rounded-full animate-pulse [animation-delay:1s]" />
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30 mb-6 animate-fade-up">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-display uppercase tracking-wider text-primary">Quick Start Guide</span>
          </div>

          <h1 className="text-3xl font-display font-black tracking-tight text-foreground mb-4 animate-fade-up [animation-delay:100ms]">
            Welcome to{" "}
            <span className="gradient-text">Music Exclusive</span>
          </h1>

          <p className="text-muted-foreground text-base font-body mb-8 max-w-sm mx-auto animate-fade-up [animation-delay:200ms]">
            Get set up in 60 seconds — upload your first track, polish your profile, and start earning.
          </p>
        </div>
      </section>

      {/* SECTION 1 — GETTING STARTED */}
      <section className="px-4 py-10 bg-background-elevated">
        <div className="container max-w-lg mx-auto">
          <SectionHeader title="Getting Started" align="center" />

          <div className="grid gap-4 mt-6">
            {/* Upload Track */}
            <GlowCard glowColor="primary" className="w-full">
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0 border border-primary/40">
                    <Upload className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display text-base text-foreground font-bold mb-1">
                      1. Upload a Track 🎵
                    </h3>
                    <p className="text-muted-foreground text-sm font-body leading-relaxed">
                      Tap <strong>Upload</strong> to add your cover art + full track. Keep cover art under 2MB for instant saves.
                    </p>
                  </div>
                </div>
              </div>
            </GlowCard>

            {/* Manage Songs */}
            <GlowCard glowColor="secondary" className="w-full">
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center flex-shrink-0 border border-secondary/40">
                    <Music className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-display text-base text-foreground font-bold mb-1">
                      2. Manage Your Releases
                    </h3>
                    <p className="text-muted-foreground text-sm font-body leading-relaxed">
                      Your tracks appear on the Dashboard. Use <strong>View</strong> to preview, <strong>Hook</strong> for 15s previews, and <strong>Delete</strong> if needed.
                    </p>
                  </div>
                </div>
              </div>
            </GlowCard>

            {/* Edit Profile */}
            <GlowCard glowColor="accent" className="w-full">
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0 border border-accent/40">
                    <Camera className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-display text-base text-foreground font-bold mb-1">
                      3. Edit Your Profile 📸
                    </h3>
                    <p className="text-muted-foreground text-sm font-body leading-relaxed">
                      Go to the <strong>Profile</strong> tab to update your photo, bio, genre, and social links — fans see this first.
                    </p>
                  </div>
                </div>
              </div>
            </GlowCard>

            {/* Track Earnings */}
            <GlowCard glowColor="primary" className="w-full">
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0 border border-primary/40">
                    <DollarSign className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display text-base text-foreground font-bold mb-1">
                      4. Track Your Earnings 💰
                    </h3>
                    <p className="text-muted-foreground text-sm font-body leading-relaxed">
                      The <strong>Earnings</strong> tab shows payouts, weekly transparency reports, and totals — updated as fans stream.
                    </p>
                  </div>
                </div>
              </div>
            </GlowCard>
          </div>
        </div>
      </section>

      {/* SECTION 2 — CONVERT SOCIAL FANS */}
      <section className="px-4 py-10">
        <div className="container max-w-lg mx-auto">
          <SectionHeader title="Convert Social Fans 🚀" align="center" />
          <p className="text-center text-muted-foreground text-sm mb-6">
            Turn followers into paying listeners with these tactics
          </p>

          <div className="space-y-3">
            {[
              { icon: MessageSquare, text: "Post a 10s hook preview + caption: 'Full song is exclusive on Music Exclusive.'" },
              { icon: Share2, text: "Pin your Music Exclusive link to your IG bio + TikTok profile." },
              { icon: Clock, text: "Use Story countdown: 'Exclusive drop in the Vault—first listeners get perks.'" },
              { icon: Zap, text: "Go Live: Play 15 seconds, then tell them where to stream the full track." },
              { icon: Mail, text: "DM your top supporters: 'Want early access? I'm sending invites.'" },
              { icon: BarChart3, text: "Create a weekly 'Vault Drop Friday' routine so fans expect it." },
            ].map((item, index) => (
              <div 
                key={index}
                className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4 h-4 text-primary" />
                </div>
                <p className="text-foreground/90 text-sm font-body leading-relaxed pt-1">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3 — INVITE GIVEAWAY IDEAS */}
      <section className="px-4 py-10 bg-background-elevated">
        <div className="container max-w-lg mx-auto">
          <SectionHeader title="Invite Giveaway Ideas 🎁" align="center" />
          <p className="text-center text-muted-foreground text-sm mb-6">
            Creative ways to grow your listener base
          </p>

          <GlowCard glowColor="gradient" className="w-full">
            <div className="p-5 space-y-3">
              {[
                { icon: Gift, text: "First 25 commenters get a Vault invite" },
                { icon: Mail, text: "Invite codes to email list subscribers" },
                { icon: Share2, text: "'Share to story' giveaway: repost + tag you" },
                { icon: Crown, text: "Superfan shoutouts + early access" },
                { icon: Users, text: "Street team: reward 5 fans who bring 3 friends" },
                { icon: QrCode, text: "QR code at shows: scan to join the Vault" },
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-3 h-3 text-primary" />
                  </div>
                  <p className="text-foreground/90 text-sm font-body">{item.text}</p>
                </div>
              ))}
            </div>
          </GlowCard>
        </div>
      </section>

      {/* SECTION 4 — YOU'RE READY */}
      <section className="px-4 py-12">
        <div className="container max-w-lg mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 border border-primary/40 mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          
          <h2 className="text-2xl font-display font-bold text-foreground mb-3">
            You're Ready! 🎧
          </h2>
          <p className="text-muted-foreground text-sm font-body mb-8 max-w-xs mx-auto">
            Upload your next track, keep your profile fresh, and use invites to grow your listener base.
          </p>

          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            <Button 
              size="lg" 
              className="w-full rounded-full animate-glow-pulse"
              onClick={onClose}
            >
              <Crown className="w-5 h-5 mr-2" />
              Let's Go!
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={handleDontShowAgain}
            >
              Don't show this again
            </Button>
          </div>
        </div>
      </section>

      {/* Bottom spacing for safe area */}
      <div className="h-8" />
    </div>
  );

  return createPortal(content, document.body);
};
