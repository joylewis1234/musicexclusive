import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Crown, Sparkles, PartyPopper, X } from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onStartTutorial: () => void;
  onDismiss: () => void;
  onDontShowAgain: () => void;
}

export const WelcomeModal = ({ 
  isOpen, 
  onStartTutorial, 
  onDismiss,
  onDontShowAgain 
}: WelcomeModalProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Small delay for mount animation
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDontShowAgain = () => {
    onDontShowAgain();
    onDismiss();
  };

  const content = (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onDismiss}
      />

      {/* Modal */}
      <div 
        className={`relative w-full max-w-sm rounded-3xl overflow-hidden transition-all duration-500 ${
          isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
        style={{
          background: 'linear-gradient(180deg, rgba(20, 10, 30, 0.98) 0%, rgba(10, 5, 15, 0.99) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: `
            0 0 60px hsla(280, 80%, 50%, 0.25),
            0 0 100px hsla(280, 80%, 50%, 0.15),
            0 25px 50px -12px rgba(0, 0, 0, 0.5)
          `,
        }}
      >
        {/* Close button */}
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Decorative glow orbs */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary/30 blur-[80px] rounded-full" />
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-purple-500/20 blur-[80px] rounded-full" />

        {/* Content */}
        <div className="relative p-8 text-center">
          {/* Celebration icons */}
          <div className="flex justify-center gap-4 mb-4">
            <PartyPopper 
              className="w-8 h-8 text-yellow-400 -rotate-12" 
              style={{ filter: 'drop-shadow(0 0 8px hsla(45, 90%, 55%, 0.6))' }}
            />
            <div 
              className="relative w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, hsla(280, 80%, 50%, 0.3), hsla(280, 80%, 60%, 0.15))',
                boxShadow: '0 0 30px hsla(280, 80%, 50%, 0.4), inset 0 0 20px hsla(280, 80%, 50%, 0.2)',
              }}
            >
              <Crown 
                className="w-8 h-8"
                style={{ 
                  color: 'hsl(45, 90%, 55%)',
                  filter: 'drop-shadow(0 0 8px hsla(45, 90%, 55%, 0.8))'
                }}
                fill="hsl(45, 90%, 55%)"
              />
            </div>
            <PartyPopper 
              className="w-8 h-8 text-yellow-400 rotate-12 scale-x-[-1]" 
              style={{ filter: 'drop-shadow(0 0 8px hsla(45, 90%, 55%, 0.6))' }}
            />
          </div>

          {/* Text */}
          <h2 
            className="font-display text-2xl font-bold text-foreground mb-2"
            style={{ textShadow: '0 2px 20px rgba(0, 0, 0, 0.5)' }}
          >
            Congratulations! 🎉
          </h2>
          <p 
            className="text-sm uppercase tracking-widest mb-4"
            style={{ color: 'hsl(280, 80%, 70%)' }}
          >
            You're now an Exclusive Artist
          </p>
          <p className="text-muted-foreground text-sm mb-8 max-w-xs mx-auto">
            Let's get you set up in 60 seconds — learn how to upload, customize your profile, and start earning.
          </p>

          {/* CTA Button with glow */}
          <Button 
            size="lg" 
            className="w-full rounded-full mb-3 relative overflow-hidden group"
            onClick={onStartTutorial}
            style={{
              background: 'linear-gradient(135deg, hsl(280, 80%, 50%), hsl(265, 90%, 55%))',
              boxShadow: '0 0 20px hsla(280, 80%, 50%, 0.4), 0 0 40px hsla(280, 80%, 50%, 0.2)',
            }}
          >
            {/* Subtle shimmer effect */}
            <div 
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
              }}
            />
            <Sparkles className="w-5 h-5 mr-2" />
            <span className="relative">Start Here</span>
          </Button>

          {/* Secondary actions */}
          <div className="flex flex-col gap-2">
            <button
              onClick={onDismiss}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              I'll explore on my own
            </button>
            <button
              onClick={handleDontShowAgain}
              className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              Don't show this again
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};
