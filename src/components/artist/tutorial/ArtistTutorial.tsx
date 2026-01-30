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
