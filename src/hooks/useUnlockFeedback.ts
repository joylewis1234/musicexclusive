/**
 * Hook for triggering unlock feedback (haptic + audio)
 * Creates a subtle, premium "unlock" experience
 */
export const useUnlockFeedback = () => {
  const triggerUnlockSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create oscillator for clean low-frequency tone
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      const filter = audioContext.createBiquadFilter();
      
      // Use triangle wave for softer, cleaner tone
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(100, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(140, audioContext.currentTime + 0.2);
      
      // Low-pass filter to remove any harshness
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(200, audioContext.currentTime);
      filter.Q.setValueAtTime(1, audioContext.currentTime);
      
      // Smooth envelope: gentle fade in, sustain, smooth fade out
      const now = audioContext.currentTime;
      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.exponentialRampToValueAtTime(0.08, now + 0.08);
      gainNode.gain.setValueAtTime(0.08, now + 0.15);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      
      // Connect: oscillator -> filter -> gain -> output
      oscillator.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start(now);
      oscillator.stop(now + 0.45);
      
      // Cleanup
      oscillator.onended = () => {
        oscillator.disconnect();
        filter.disconnect();
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
