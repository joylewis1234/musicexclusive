/**
 * Hook for triggering unlock feedback (haptic + audio)
 * Creates a subtle, premium "unlock" experience
 */
export const useUnlockFeedback = () => {
  const triggerUnlockSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create oscillator for low-frequency tone
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      // Low frequency sweep: 80Hz -> 120Hz (subtle unlock feel)
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(80, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(120, audioContext.currentTime + 0.15);
      
      // Quick fade in and out for smooth, non-jarring sound
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0.12, audioContext.currentTime + 0.2);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
      
      // Connect and play
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
      
      // Cleanup
      oscillator.onended = () => {
        oscillator.disconnect();
        gainNode.disconnect();
        audioContext.close();
      };
    } catch (error) {
      // Silently fail if Web Audio API is not supported
      console.warn('Web Audio API not supported:', error);
    }
  };

  const triggerHaptic = () => {
    // Light haptic: 120ms duration (premium, not aggressive)
    if (navigator.vibrate) {
      navigator.vibrate(120);
    }
  };

  const triggerUnlockFeedback = () => {
    triggerHaptic();
    triggerUnlockSound();
  };

  return { triggerUnlockFeedback, triggerUnlockSound, triggerHaptic };
};
