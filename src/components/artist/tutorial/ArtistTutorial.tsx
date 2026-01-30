import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StartHereButton } from './StartHereButton';
import { TutorialPage } from './TutorialPage';
import { HelpCircle } from 'lucide-react';

const STORAGE_KEY = 'tutorial_artist_dashboard_completed';

interface ArtistTutorialProps {
  userId: string | null;
  showInlineButton?: boolean;
}

export const ArtistTutorial = ({ userId, showInlineButton = true }: ArtistTutorialProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasCompleted, setHasCompleted] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load completion state from localStorage and Supabase
  useEffect(() => {
    const loadCompletionState = async () => {
      // Check localStorage first
      const localCompleted = localStorage.getItem(STORAGE_KEY) === 'true';
      
      if (localCompleted) {
        setHasCompleted(true);
        setIsLoading(false);
        return;
      }

      // Check Supabase if user is logged in
      if (userId) {
        try {
          const { data } = await supabase
            .from('artist_profiles')
            .select('tutorial_completed')
            .eq('user_id', userId)
            .maybeSingle();
          
          if (data?.tutorial_completed) {
            setHasCompleted(true);
            localStorage.setItem(STORAGE_KEY, 'true');
          } else {
            setHasCompleted(false);
          }
        } catch (error) {
          console.error('Error loading tutorial state:', error);
          setHasCompleted(false);
        }
      } else {
        setHasCompleted(false);
      }
      
      setIsLoading(false);
    };

    loadCompletionState();
  }, [userId]);

  // Save completion state
  const markCompleted = useCallback(async () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setHasCompleted(true);

    if (userId) {
      try {
        await supabase
          .from('artist_profiles')
          .update({ tutorial_completed: true })
          .eq('user_id', userId);
      } catch (error) {
        console.error('Error saving tutorial completion:', error);
      }
    }
  }, [userId]);

  const openTutorial = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeTutorial = useCallback(() => {
    setIsOpen(false);
  }, []);

  const restartTutorial = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHasCompleted(false);
    setIsOpen(true);
  }, []);

  if (isLoading) return null;

  return (
    <>
      {/* Floating Start Here button - show if not completed */}
      {!hasCompleted && !isOpen && (
        <StartHereButton onClick={openTutorial} variant="floating" />
      )}

      {/* Inline "New? Start Here" chip */}
      {showInlineButton && !hasCompleted && !isOpen && (
        <div className="mb-4">
          <StartHereButton onClick={openTutorial} variant="inline" />
        </div>
      )}

      {/* Tutorial page overlay */}
      <TutorialPage
        isOpen={isOpen}
        onClose={closeTutorial}
        onDontShowAgain={markCompleted}
      />
    </>
  );
};

// Export hook-like utilities for external control
export const useArtistTutorialControls = () => {
  const restartTutorial = () => {
    localStorage.removeItem(STORAGE_KEY);
    // Dispatch custom event that ArtistTutorial can listen to
    window.dispatchEvent(new CustomEvent('restart-artist-tutorial'));
  };

  return { restartTutorial };
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
