import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TutorialPage } from './TutorialPage';
import { WelcomeModal } from './WelcomeModal';

const STORAGE_KEY = 'tutorial_artist_dashboard_completed';
const WELCOME_SHOWN_KEY = 'tutorial_welcome_shown';

interface ArtistTutorialProps {
  userId: string | null;
}

export const ArtistTutorial = ({ userId }: ArtistTutorialProps) => {
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [hasCompleted, setHasCompleted] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load completion state from localStorage and Supabase
  useEffect(() => {
    const loadCompletionState = async () => {
      const localCompleted = localStorage.getItem(STORAGE_KEY) === 'true';

      // If we don't have a user, we can only rely on local state.
      if (!userId) {
        setHasCompleted(localCompleted);
        setIsLoading(false);
        return;
      }

      // If we do have a user, treat the backend as the source of truth.
      // This allows us to "unhide" the tutorial later even if localStorage was previously set.
      try {
        const { data } = await supabase
          .from('artist_profiles')
          .select('tutorial_completed')
          .eq('user_id', userId)
          .maybeSingle();

        const remoteCompleted = !!data?.tutorial_completed;
        setHasCompleted(remoteCompleted);

        if (remoteCompleted) {
          localStorage.setItem(STORAGE_KEY, 'true');
        } else {
          localStorage.removeItem(STORAGE_KEY);
          // allow welcome modal to show again after a server-side reset
          sessionStorage.removeItem(WELCOME_SHOWN_KEY);
        }
      } catch (error) {
        console.error('Error loading tutorial state:', error);
        // Fallback to local state if backend call fails.
        setHasCompleted(localCompleted);
      } finally {
        setIsLoading(false);
      }
    };

    loadCompletionState();
  }, [userId]);

  const resetTutorial = useCallback(async () => {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(WELCOME_SHOWN_KEY);
    setHasCompleted(false);

    if (userId) {
      try {
        await supabase
          .from('artist_profiles')
          .update({ tutorial_completed: false })
          .eq('user_id', userId);
      } catch (error) {
        console.error('Error resetting tutorial completion:', error);
      }
    }
  }, [userId]);

  // Allow forcing the welcome modal via URL param: ?tutorial=1 (or ?tutorial=reset)
  useEffect(() => {
    if (isLoading) return;

    const url = new URL(window.location.href);
    const flag = url.searchParams.get('tutorial');
    if (flag !== '1' && flag !== 'reset') return;

    const run = async () => {
      await resetTutorial();
      setIsWelcomeOpen(true);

      // Remove the param so it doesn't keep re-triggering on refresh.
      url.searchParams.delete('tutorial');
      window.history.replaceState({}, '', url.toString());
    };

    run();
  }, [isLoading, resetTutorial]);

  // Show welcome modal after a short delay if tutorial not completed
  useEffect(() => {
    if (isLoading || hasCompleted) return;

    // Check if welcome was already shown this session
    const welcomeShown = sessionStorage.getItem(WELCOME_SHOWN_KEY) === 'true';
    if (welcomeShown) return;

    // Show welcome modal after 1.5 seconds
    const timer = setTimeout(() => {
      setIsWelcomeOpen(true);
      sessionStorage.setItem(WELCOME_SHOWN_KEY, 'true');
    }, 1500);

    return () => clearTimeout(timer);
  }, [isLoading, hasCompleted]);

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
    setIsWelcomeOpen(false);
    setIsTutorialOpen(true);
  }, []);

  const closeTutorial = useCallback(() => {
    setIsTutorialOpen(false);
  }, []);

  const dismissWelcome = useCallback(() => {
    setIsWelcomeOpen(false);
  }, []);

  if (isLoading) return null;

  return (
    <>
      {/* Welcome modal - appears shortly after page load */}
      <WelcomeModal
        isOpen={isWelcomeOpen}
        onStartTutorial={openTutorial}
        onDismiss={dismissWelcome}
        onDontShowAgain={markCompleted}
      />

      {/* Tutorial page overlay */}
      <TutorialPage
        isOpen={isTutorialOpen}
        onClose={closeTutorial}
        onDontShowAgain={markCompleted}
      />
    </>
  );
};
