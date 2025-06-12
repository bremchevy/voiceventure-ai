export interface AudioConfig {
  sampleRate: number;
  channels: number;
  quality: 'low' | 'medium' | 'high';
}

export const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  sampleRate: 16000, // Whisper's preferred sample rate
  channels: 1,       // Mono audio
  quality: 'medium'  // Default quality
};

export async function processAudio(audioBlob: Blob, config: AudioConfig = DEFAULT_AUDIO_CONFIG): Promise<Blob> {
  // Convert audio to the correct format for Whisper API
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  // Create an offline context for processing
  const offlineContext = new OfflineAudioContext(
    config.channels,
    audioBuffer.duration * config.sampleRate,
    config.sampleRate
  );

  // Create source buffer
  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineContext.destination);
  source.start();

  // Render the audio
  const renderedBuffer = await offlineContext.startRendering();

  // Convert to WAV format
  const wavBlob = await convertToWav(renderedBuffer, config);
  
  return wavBlob;
}

function convertToWav(audioBuffer: AudioBuffer, config: AudioConfig): Promise<Blob> {
  const numOfChannels = config.channels;
  const length = audioBuffer.length * numOfChannels * 2;
  const buffer = new ArrayBuffer(44 + length);
  const view = new DataView(buffer);

  // Write WAV header
  writeUTFBytes(view, 0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeUTFBytes(view, 8, 'WAVE');
  writeUTFBytes(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numOfChannels, true);
  view.setUint32(24, config.sampleRate, true);
  view.setUint32(28, config.sampleRate * 2 * numOfChannels, true);
  view.setUint16(32, numOfChannels * 2, true);
  view.setUint16(34, 16, true);
  writeUTFBytes(view, 36, 'data');
  view.setUint32(40, length, true);

  // Write audio data
  const offset = 44;
  const channelData = new Float32Array(audioBuffer.length);
  let index = 0;

  for (let channel = 0; channel < numOfChannels; channel++) {
    audioBuffer.copyFromChannel(channelData, channel, 0);
    for (let i = 0; i < channelData.length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset + index, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      index += 2;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeUTFBytes(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
} 