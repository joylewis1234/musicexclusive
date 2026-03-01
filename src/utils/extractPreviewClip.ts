/**
 * Extracts a segment from an audio file using the Web Audio API
 * and encodes it as a WAV file for upload.
 */

const PREVIEW_DURATION = 25;

export async function extractPreviewClip(
  audioFile: File,
  startSeconds: number
): Promise<File> {
  const arrayBuffer = await audioFile.arrayBuffer();
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const sampleRate = audioBuffer.sampleRate;
    const numChannels = audioBuffer.numberOfChannels;
    const startSample = Math.floor(startSeconds * sampleRate);
    const endSample = Math.min(
      startSample + Math.floor(PREVIEW_DURATION * sampleRate),
      audioBuffer.length
    );
    const clipLength = endSample - startSample;

    if (clipLength <= 0) {
      throw new Error("Preview segment is empty — check start time vs track duration.");
    }

    // Extract channel data
    const channels: Float32Array[] = [];
    for (let ch = 0; ch < numChannels; ch++) {
      const fullChannel = audioBuffer.getChannelData(ch);
      channels.push(fullChannel.slice(startSample, endSample));
    }

    // Encode as WAV
    const wavBuffer = encodeWav(channels, sampleRate, numChannels);
    const blob = new Blob([wavBuffer], { type: "audio/wav" });

    // Derive filename
    const baseName = audioFile.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}_preview.wav`, { type: "audio/wav" });
  } finally {
    await audioContext.close();
  }
}

function encodeWav(
  channels: Float32Array[],
  sampleRate: number,
  numChannels: number
): ArrayBuffer {
  const clipLength = channels[0].length;
  const bytesPerSample = 2; // 16-bit
  const dataSize = clipLength * numChannels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");

  // fmt chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, bytesPerSample * 8, true);

  // data chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // Interleave and write samples
  let offset = 44;
  for (let i = 0; i < clipLength; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return buffer;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
