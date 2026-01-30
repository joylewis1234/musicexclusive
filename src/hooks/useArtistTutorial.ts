import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { tutorialSteps, TutorialStep } from '@/components/artist/tutorial/tutorialSteps';

const STORAGE_KEY = 'tutorial_artist_dashboard_completed';

export const useArtistTutorial = (userId: string | null) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [hasCompleted, setHasCompleted] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const currentStep: TutorialStep | undefined = tutorialSteps[currentStepIndex];
  const totalSteps = tutorialSteps.length;
  const progress = ((currentStepIndex + 1) / totalSteps) * 100;

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

  // Start tutorial
  const startTutorial = useCallback(() => {
    setCurrentStepIndex(0);
    setIsOpen(true);
    
    // Navigate to dashboard if not already there
    if (location.pathname !== '/artist/dashboard') {
      navigate('/artist/dashboard');
    }
  }, [location.pathname, navigate]);

  // Close tutorial
  const closeTutorial = useCallback(() => {
    setIsOpen(false);
    setCurrentStepIndex(0);
  }, []);

  // Skip and don't show again
  const skipTutorial = useCallback(() => {
    markCompleted();
    closeTutorial();
  }, [markCompleted, closeTutorial]);

  // Go to next step
  const nextStep = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    
    if (nextIndex >= totalSteps) {
      // Finish tutorial
      markCompleted();
      closeTutorial();
      navigate('/artist/dashboard');
      return;
    }

    const nextStepData = tutorialSteps[nextIndex];
    
    // Navigate to the correct route if needed
    if (nextStepData.route && location.pathname !== nextStepData.route) {
      navigate(nextStepData.route);
    }

    setCurrentStepIndex(nextIndex);
  }, [currentStepIndex, totalSteps, location.pathname, navigate, markCompleted, closeTutorial]);

  // Go to previous step
  const prevStep = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    
    if (prevIndex < 0) return;

    const prevStepData = tutorialSteps[prevIndex];
    
    // Navigate to the correct route if needed
    if (prevStepData.route && location.pathname !== prevStepData.route) {
      navigate(prevStepData.route);
    }

    setCurrentStepIndex(prevIndex);
  }, [currentStepIndex, location.pathname, navigate]);

  // Restart tutorial
  const restartTutorial = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHasCompleted(false);
    startTutorial();
  }, [startTutorial]);

  return {
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
  };
};
