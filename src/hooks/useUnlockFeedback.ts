import { useRef, useCallback, useEffect } from 'react';

/**
 * Hook for triggering unlock feedback (haptic + audio)
 * Creates a subtle, premium "unlock" experience with 808-style bass hit
 */
export const useUnlockFeedback = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);

  // Cleanup audio on unmount or navigation
  useEffect(() => {
    return () => {
      if (oscillatorRef.current) {
        try {
          oscillatorRef.current.stop();
          oscillatorRef.current.disconnect();
        } catch (e) {
          // Already stopped
        }
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const triggerUnlockSound = useCallback(() => {
    try {
      // Clean up any existing audio first
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillatorRef.current = oscillator;
      
      // Pure sine wave for clean sub-bass (no harmonics = no static)
      oscillator.type = 'sine';
      
      // 808-style pitch envelope: start at ~55Hz, drop to ~40Hz
      const now = audioContext.currentTime;
      oscillator.frequency.setValueAtTime(55, now);
      oscillator.frequency.exponentialRampToValueAtTime(40, now + 0.15);
      oscillator.frequency.exponentialRampToValueAtTime(35, now + 0.35);
      
      // Smooth gain envelope: quick attack, smooth decay
      // Start at near-zero to prevent click
      gainNode.gain.setValueAtTime(0.001, now);
      // Quick fade in (5ms)
      gainNode.gain.exponentialRampToValueAtTime(0.12, now + 0.005);
      // Hold briefly
      gainNode.gain.setValueAtTime(0.12, now + 0.02);
      // Smooth exponential decay (808-style tail)
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      
      // Direct connection: oscillator -> gain -> output (no filters needed for pure sine)
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start(now);
      oscillator.stop(now + 0.45);
      
      // Cleanup after sound ends
      oscillator.onended = () => {
        oscillator.disconnect();
        gainNode.disconnect();
        audioContext.close();
        audioContextRef.current = null;
        oscillatorRef.current = null;
      };
    } catch (error) {
      // Silently fail if Web Audio API is not supported
      console.warn('Web Audio API not supported:', error);
    }
  }, []);

  const triggerHaptic = useCallback(() => {
    // Light haptic: 120ms duration (premium, not aggressive)
    if (navigator.vibrate) {
      navigator.vibrate(120);
    }
  }, []);

  const triggerUnlockFeedback = useCallback(() => {
    triggerHaptic();
    // Sound disabled - only haptic feedback
  }, [triggerHaptic]);

  return { triggerUnlockFeedback, triggerUnlockSound, triggerHaptic };
};
