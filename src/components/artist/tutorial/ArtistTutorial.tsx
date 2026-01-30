import { useArtistTutorial } from '@/hooks/useArtistTutorial';
import { StartHereButton } from './StartHereButton';
import { TutorialOverlay } from './TutorialOverlay';
import { HelpCircle } from 'lucide-react';

interface ArtistTutorialProps {
  userId: string | null;
  showInlineButton?: boolean;
}

export const ArtistTutorial = ({ userId, showInlineButton = true }: ArtistTutorialProps) => {
  const {
    isOpen,
    isLoading,
    hasCompleted,
    currentStep,
    currentStepIndex,
    totalSteps,
    progress,
    startTutorial,
    closeTutorial,
    skipTutorial,
    nextStep,
    prevStep,
    restartTutorial,
  } = useArtistTutorial(userId);

  if (isLoading) return null;

  return (
    <>
      {/* Floating Start Here button - show if not completed */}
      {!hasCompleted && !isOpen && (
        <StartHereButton onClick={startTutorial} variant="floating" />
      )}

      {/* Inline "New? Start Here" chip */}
      {showInlineButton && !hasCompleted && !isOpen && (
        <div className="mb-4">
          <StartHereButton onClick={startTutorial} variant="inline" />
        </div>
      )}

      {/* Tutorial overlay */}
      <TutorialOverlay
        isOpen={isOpen}
        step={currentStep}
        currentIndex={currentStepIndex}
        totalSteps={totalSteps}
        progress={progress}
        onNext={nextStep}
        onPrev={prevStep}
        onSkip={skipTutorial}
        onClose={closeTutorial}
        onRestart={restartTutorial}
      />
    </>
  );
};

// Help button to reopen tutorial
export const TutorialHelpButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-background/80 backdrop-blur-md border border-border/50 text-muted-foreground hover:text-foreground hover:bg-background/90 transition-all"
      title="Reopen tutorial"
    >
      <HelpCircle className="w-4 h-4" />
      <span className="text-sm font-medium sr-only sm:not-sr-only">Help</span>
    </button>
  );
};
