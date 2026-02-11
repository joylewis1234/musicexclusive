/**
 * Client-side audio compression utility.
 * - WAV files → MP3 at 192kbps (typically 10x smaller)
 * - High-bitrate MP3s (>256kbps) → re-encoded at 192kbps
 * - MP3s ≤256kbps → passed through untouched
 *
 * Uses lamejs (LAME MP3 encoder compiled to JS) for in-browser encoding.
 */

import * as lamejs from "@breezystack/lamejs";

const TARGET_BITRATE = 192;
const HIGH_BITRATE_THRESHOLD_KBPS = 256;

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  wasCompressed: boolean;
  format: string;
}

/**
 * Estimate the bitrate of an MP3 file from its size and duration.
 */
function estimateBitrateKbps(fileSize: number, durationSec: number): number {
  if (durationSec <= 0) return 0;
  return Math.round((fileSize * 8) / (durationSec * 1000));
}

/**
 * Decode audio file to raw PCM using Web Audio API.
 */
async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    return audioBuffer;
  } finally {
    await audioCtx.close();
  }
}

/**
 * Encode PCM AudioBuffer to MP3 using lamejs.
 */
function encodeToMp3(audioBuffer: AudioBuffer, bitrate: number): Blob {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const channels = numChannels >= 2 ? 2 : 1;

  const mp3Encoder = new lamejs.Mp3Encoder(channels, sampleRate, bitrate);
  const mp3Data: Uint8Array[] = [];
  const sampleBlockSize = 1152;

  const left = convertFloat32ToInt16(audioBuffer.getChannelData(0));
  const right = channels === 2
    ? convertFloat32ToInt16(audioBuffer.getChannelData(1))
    : left;

  for (let i = 0; i < left.length; i += sampleBlockSize) {
    const leftChunk = left.subarray(i, i + sampleBlockSize);
    const rightChunk = right.subarray(i, i + sampleBlockSize);

    let mp3buf: Uint8Array;
    if (channels === 2) {
      mp3buf = mp3Encoder.encodeBuffer(leftChunk, rightChunk) as Uint8Array;
    } else {
      mp3buf = mp3Encoder.encodeBuffer(leftChunk) as Uint8Array;
    }

    if (mp3buf.length > 0) {
      mp3Data.push(new Uint8Array(mp3buf));
    }
  }

  const finalBuf = mp3Encoder.flush() as Uint8Array;
  if (finalBuf.length > 0) {
    mp3Data.push(new Uint8Array(finalBuf));
  }

  return new Blob(mp3Data as unknown as BlobPart[], { type: "audio/mpeg" });
}

/**
 * Convert Float32Array PCM samples to Int16Array for lamejs.
 */
function convertFloat32ToInt16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return int16;
}

/**
 * Get approximate duration of an audio file using Audio element.
 */
function getQuickDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const timer = setTimeout(() => { URL.revokeObjectURL(url); resolve(0); }, 3000);

    audio.addEventListener("loadedmetadata", () => {
      clearTimeout(timer);
      const dur = audio.duration;
      URL.revokeObjectURL(url);
      resolve(dur && isFinite(dur) ? dur : 0);
    }, { once: true });

    audio.addEventListener("error", () => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      resolve(0);
    }, { once: true });

    audio.preload = "metadata";
    audio.src = url;
  });
}

/**
 * Compress an audio file before upload.
 * - WAV → MP3 at 192kbps
 * - MP3 >256kbps → re-encode at 192kbps
 * - MP3 ≤256kbps → pass through unchanged
 *
 * @param onProgress Optional callback (0-100) for encoding progress
 */
export async function compressAudio(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<CompressionResult> {
  const originalSize = file.size;
  const mime = (file.type || "").toLowerCase();
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const isWav = ext === "wav" || mime.includes("wav");
  const isMp3 = ext === "mp3" || mime.includes("mpeg") || mime.includes("mp3");

  // If it's an MP3, check if bitrate is already reasonable
  if (isMp3 && !isWav) {
    const duration = await getQuickDuration(file);
    if (duration > 0) {
      const estimatedKbps = estimateBitrateKbps(file.size, duration);
      console.log(`[AudioCompress] MP3 estimated bitrate: ${estimatedKbps}kbps`);

      if (estimatedKbps <= HIGH_BITRATE_THRESHOLD_KBPS) {
        console.log("[AudioCompress] MP3 bitrate is fine, skipping compression");
        onProgress?.(100);
        return {
          file,
          originalSize,
          compressedSize: originalSize,
          wasCompressed: false,
          format: "mp3",
        };
      }
    }
  }

  // Decode and re-encode
  console.log(`[AudioCompress] Compressing ${isWav ? "WAV" : "MP3"} (${(originalSize / 1024 / 1024).toFixed(1)}MB) → MP3 @ ${TARGET_BITRATE}kbps`);
  onProgress?.(10);

  try {
    const audioBuffer = await decodeAudioFile(file);
    onProgress?.(40);

    const mp3Blob = encodeToMp3(audioBuffer, TARGET_BITRATE);
    onProgress?.(90);

    const compressedFile = new File(
      [mp3Blob],
      file.name.replace(/\.(wav|mp3)$/i, ".mp3"),
      { type: "audio/mpeg" },
    );

    const ratio = ((1 - compressedFile.size / originalSize) * 100).toFixed(0);
    console.log(`[AudioCompress] Done: ${(originalSize / 1024 / 1024).toFixed(1)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(1)}MB (${ratio}% smaller)`);
    onProgress?.(100);

    return {
      file: compressedFile,
      originalSize,
      compressedSize: compressedFile.size,
      wasCompressed: true,
      format: "mp3",
    };
  } catch (err) {
    console.error("[AudioCompress] Compression failed, using original file:", err);
    onProgress?.(100);
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      wasCompressed: false,
      format: isWav ? "wav" : "mp3",
    };
  }
}
