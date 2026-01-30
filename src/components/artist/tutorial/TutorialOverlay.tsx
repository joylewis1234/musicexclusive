import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { TutorialStep } from './tutorialSteps';
import { TutorialTooltip } from './TutorialTooltip';

interface TutorialOverlayProps {
  isOpen: boolean;
  step: TutorialStep | undefined;
  currentIndex: number;
  totalSteps: number;
  progress: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onClose: () => void;
  onRestart: () => void;
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export const TutorialOverlay = ({
  isOpen,
  step,
  currentIndex,
  totalSteps,
  progress,
  onNext,
  onPrev,
  onSkip,
  onClose,
  onRestart,
}: TutorialOverlayProps) => {
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);

  const findAndHighlightTarget = useCallback(() => {
    if (!step?.targetSelector) {
      setSpotlightRect(null);
      setTooltipPosition(null);
      return;
    }

    // Wait a bit for navigation to complete
    const findTarget = () => {
      const target = document.querySelector(step.targetSelector!);
      
      if (target) {
        // Scroll target into view
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Get bounding rect after scroll
        setTimeout(() => {
          const rect = target.getBoundingClientRect();
          const padding = 8;
          
          setSpotlightRect({
            top: rect.top - padding,
            left: rect.left - padding,
            width: rect.width + padding * 2,
            height: rect.height + padding * 2,
          });

          // Calculate tooltip position
          if (step.placement === 'bottom') {
            setTooltipPosition({
              top: rect.bottom + padding,
              left: rect.left + rect.width / 2,
            });
          } else if (step.placement === 'top') {
            setTooltipPosition({
              top: rect.top - padding,
              left: rect.left + rect.width / 2,
            });
          } else {
            setTooltipPosition({
              top: rect.top + rect.height / 2,
              left: rect.left + rect.width / 2,
            });
          }
        }, 300);
      } else {
        // Target not found, show centered tooltip
        setSpotlightRect(null);
        setTooltipPosition(null);
      }
    };

    // Delay to allow navigation and DOM updates
    const timer = setTimeout(findTarget, 100);
    return () => clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    if (isOpen && step) {
      findAndHighlightTarget();
    }
  }, [isOpen, step, findAndHighlightTarget]);

  // Listen for resize/scroll to update spotlight
  useEffect(() => {
    if (!isOpen || !step?.targetSelector) return;

    const handleUpdate = () => {
      findAndHighlightTarget();
    };

    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [isOpen, step, findAndHighlightTarget]);

  if (!isOpen || !step) return null;

  const isCentered = step.placement === 'center' || step.isTipsScreen || !spotlightRect;

  const overlay = (
    <div className="fixed inset-0 z-50 animate-fade-in">
      {/* Dark overlay with spotlight cutout */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: 'none' }}
      >
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spotlightRect && !isCentered && (
              <rect
                x={spotlightRect.left}
                y={spotlightRect.top}
                width={spotlightRect.width}
                height={spotlightRect.height}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.85)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Spotlight glow ring */}
      {spotlightRect && !isCentered && (
        <div
          className="absolute rounded-xl pointer-events-none animate-pulse-glow"
          style={{
            top: spotlightRect.top - 4,
            left: spotlightRect.left - 4,
            width: spotlightRect.width + 8,
            height: spotlightRect.height + 8,
            border: '2px solid hsla(280, 80%, 60%, 0.6)',
            boxShadow: `
              0 0 20px hsla(280, 80%, 50%, 0.4),
              inset 0 0 20px hsla(280, 80%, 50%, 0.1)
            `,
          }}
        />
      )}

      {/* Clickable backdrop to close */}
      <div 
        className="absolute inset-0" 
        onClick={onClose}
        style={{ pointerEvents: isCentered ? 'auto' : 'none' }}
      />

      {/* Tooltip */}
      <TutorialTooltip
        step={step}
        currentIndex={currentIndex}
        totalSteps={totalSteps}
        progress={progress}
        onNext={onNext}
        onPrev={onPrev}
        onSkip={onSkip}
        onClose={onClose}
        onRestart={onRestart}
        isFirstStep={currentIndex === 0}
        isLastStep={currentIndex === totalSteps - 1}
        position={tooltipPosition}
      />
    </div>
  );

  // Render in portal to ensure proper z-index stacking
  return createPortal(overlay, document.body);
};
