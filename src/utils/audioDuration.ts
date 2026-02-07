/**
 * Utility to detect audio duration from a File object.
 * Uses a temporary Audio element and object URL.
 * Defensive against mobile Safari where Audio elements may not auto-load.
 */

const DURATION_TIMEOUT_MS = 5_000; // 5s timeout — fallback is fine for upload

/**
 * Read the duration (in seconds, rounded) of an audio File.
 * Returns a fallback value if detection fails or times out.
 * Never rejects — always resolves with a number.
 */
export function getAudioDuration(file: File, fallback = 180): Promise<number> {
  return new Promise<number>((resolve) => {
    let settled = false;
    let url: string | null = null;

    try {
      url = URL.createObjectURL(file);
    } catch {
      console.warn("[audioDuration] Failed to create object URL, using fallback");
      resolve(fallback);
      return;
    }

    const audio = new Audio();

    const finish = (duration: number) => {
      if (settled) return;
      settled = true;
      try {
        if (url) URL.revokeObjectURL(url);
        audio.removeAttribute("src");
        audio.load(); // release resources
      } catch {
        // ignore cleanup errors
      }
      resolve(duration);
    };

    const extractDuration = () => {
      const dur = audio.duration;
      if (dur && isFinite(dur) && dur > 0) {
        finish(Math.round(dur));
      } else {
        console.warn("[audioDuration] Invalid duration value:", dur);
        finish(fallback);
      }
    };

    const timer = setTimeout(() => {
      console.warn("[audioDuration] Timed out reading duration, using fallback:", fallback);
      finish(fallback);
    }, DURATION_TIMEOUT_MS);

    // Listen for both loadedmetadata and durationchange for maximum compatibility
    // Mobile Safari sometimes fires durationchange but not loadedmetadata
    audio.addEventListener("loadedmetadata", () => { clearTimeout(timer); extractDuration(); }, { once: true });
    audio.addEventListener("durationchange", () => {
      if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
        clearTimeout(timer);
        extractDuration();
      }
    }, { once: true });
    audio.addEventListener("error", () => {
      clearTimeout(timer);
      console.warn("[audioDuration] Error loading audio for duration detection");
      finish(fallback);
    }, { once: true });

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
