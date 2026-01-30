import { ChevronLeft, ChevronRight, X, RotateCcw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TutorialStep } from './tutorialSteps';
import { cn } from '@/lib/utils';

interface TutorialTooltipProps {
  step: TutorialStep;
  currentIndex: number;
  totalSteps: number;
  progress: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onClose: () => void;
  onRestart?: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  position: { top: number; left: number } | null;
}

export const TutorialTooltip = ({
  step,
  currentIndex,
  totalSteps,
  progress,
  onNext,
  onPrev,
  onSkip,
  onClose,
  onRestart,
  isFirstStep,
  isLastStep,
  position,
}: TutorialTooltipProps) => {
  const isWelcome = step.id === 'welcome';
  const isFinish = step.id === 'finish';
  const isCentered = step.placement === 'center' || !position;

  const renderBody = () => {
    if (Array.isArray(step.body)) {
      return (
        <ul className="space-y-2.5 text-sm text-muted-foreground">
          {step.body.map((item, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    }
    return <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>;
  };

  const tooltipContent = (
    <div
      className={cn(
        "w-[320px] max-w-[90vw] rounded-2xl overflow-hidden animate-scale-in",
        "border border-white/10"
      )}
      style={{
        background: 'rgba(10, 10, 15, 0.92)',
        backdropFilter: 'blur(20px)',
        boxShadow: `
          0 0 30px hsla(280, 80%, 50%, 0.2),
          0 20px 50px rgba(0, 0, 0, 0.5),
          inset 0 1px 0 rgba(255, 255, 255, 0.05)
        `,
      }}
    >
      {/* Header */}
      <div className="relative px-5 pt-5 pb-3">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
        
        <h3 
          className="font-display text-lg font-semibold pr-8"
          style={{ color: 'hsl(280, 80%, 75%)' }}
        >
          {step.title}
        </h3>
      </div>

      {/* Body */}
      <div className="px-5 pb-4">
        {renderBody()}
      </div>

      {/* Progress */}
      <div className="px-5 pb-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <span>{currentIndex + 1} of {totalSteps}</span>
          <div className="flex-1">
            <Progress value={progress} className="h-1" />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div 
        className="px-5 py-4 flex items-center gap-2 border-t border-white/5"
        style={{ background: 'rgba(255, 255, 255, 0.02)' }}
      >
        {isWelcome ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkip}
              className="text-muted-foreground hover:text-foreground"
            >
              Skip
            </Button>
            <div className="flex-1" />
            <Button
              size="sm"
              onClick={onNext}
              className="rounded-full px-5"
              style={{
                background: 'hsl(280, 80%, 50%)',
              }}
            >
              Start
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </>
        ) : isFinish ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRestart}
              className="text-muted-foreground hover:text-foreground gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restart
            </Button>
            <div className="flex-1" />
            <Button
              size="sm"
              onClick={onNext}
              className="rounded-full px-5"
              style={{
                background: 'hsl(280, 80%, 50%)',
              }}
            >
              Finish
              <Check className="w-4 h-4 ml-1" />
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={onPrev}
              disabled={isFirstStep}
              className="text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkip}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              Don't show again
            </Button>
            <div className="flex-1" />
            <Button
              size="sm"
              onClick={onNext}
              className="rounded-full px-4"
              style={{
                background: 'hsl(280, 80%, 50%)',
              }}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </>
        )}
      </div>
    </div>
  );

  if (isCentered) {
    return (
      <div className="fixed inset-0 flex items-center justify-center p-4 z-[60]">
        {tooltipContent}
      </div>
    );
  }

  // Position near target element
  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 60,
  };

  // Calculate position based on placement
  if (step.placement === 'bottom') {
    tooltipStyle.top = position.top + 20;
    tooltipStyle.left = Math.max(16, Math.min(position.left - 160, window.innerWidth - 336));
  } else if (step.placement === 'top') {
    tooltipStyle.bottom = window.innerHeight - position.top + 20;
    tooltipStyle.left = Math.max(16, Math.min(position.left - 160, window.innerWidth - 336));
  } else if (step.placement === 'left') {
    tooltipStyle.top = position.top;
    tooltipStyle.right = window.innerWidth - position.left + 20;
  } else if (step.placement === 'right') {
    tooltipStyle.top = position.top;
    tooltipStyle.left = position.left + 20;
  }

  return (
    <div style={tooltipStyle}>
      {tooltipContent}
    </div>
  );
};
