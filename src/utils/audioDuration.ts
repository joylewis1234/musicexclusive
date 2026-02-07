/**
 * Utility to detect audio duration from a File object.
 * Uses a temporary Audio element and object URL.
 */

const DURATION_TIMEOUT_MS = 10_000; // 10s timeout for metadata loading

/**
 * Read the duration (in seconds, rounded) of an audio File.
 * Returns a fallback value if detection fails or times out.
 */
export function getAudioDuration(file: File, fallback = 180): Promise<number> {
  return new Promise<number>((resolve) => {
    let settled = false;
    const url = URL.createObjectURL(file);
    const audio = new Audio();

    const finish = (duration: number) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      audio.removeAttribute("src");
      audio.load(); // release resources
      resolve(duration);
    };

    const timer = setTimeout(() => {
      console.warn("[audioDuration] Timed out reading duration, using fallback:", fallback);
      finish(fallback);
    }, DURATION_TIMEOUT_MS);

    audio.addEventListener(
      "loadedmetadata",
      () => {
        clearTimeout(timer);
        const dur = audio.duration;
        if (dur && isFinite(dur) && dur > 0) {
          finish(Math.round(dur));
        } else {
          console.warn("[audioDuration] Invalid duration value:", dur);
          finish(fallback);
        }
      },
      { once: true }
    );

    audio.addEventListener(
      "error",
      () => {
        clearTimeout(timer);
        console.warn("[audioDuration] Error loading audio for duration detection");
        finish(fallback);
      },
      { once: true }
    );

    // preload only metadata for speed
    audio.preload = "metadata";
    audio.src = url;
  });
}

/**
 * Read duration from a remote audio URL (e.g., for existing tracks).
 * Returns fallback if detection fails or times out.
 */
export function getAudioDurationFromUrl(audioUrl: string, fallback = 180): Promise<number> {
  return new Promise<number>((resolve) => {
    let settled = false;
    const audio = new Audio();

    const finish = (duration: number) => {
      if (settled) return;
      settled = true;
      audio.removeAttribute("src");
      audio.load();
      resolve(duration);
    };

    const timer = setTimeout(() => {
      console.warn("[audioDuration] URL timed out, using fallback:", fallback);
      finish(fallback);
    }, DURATION_TIMEOUT_MS);

    audio.addEventListener(
      "loadedmetadata",
      () => {
        clearTimeout(timer);
        const dur = audio.duration;
        if (dur && isFinite(dur) && dur > 0) {
          finish(Math.round(dur));
        } else {
          finish(fallback);
        }
      },
      { once: true }
    );

    audio.addEventListener(
      "error",
      () => {
        clearTimeout(timer);
        finish(fallback);
      },
      { once: true }
    );

    audio.preload = "metadata";
    audio.src = audioUrl;
  });
}
