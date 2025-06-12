export type AudioFormat = 'wav' | 'mp3' | 'webm';

interface AudioMetadata {
  duration: number;
  sampleRate: number;
  channels: number;
  format: AudioFormat;
}

export class AudioFormatConverter {
  private audioContext: AudioContext;

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  public async convert(blob: Blob, targetFormat: AudioFormat): Promise<Blob> {
    const sourceFormat = this.detectFormat(blob.type);
    if (sourceFormat === targetFormat) {
      return blob;
    }

    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

    switch (targetFormat) {
      case 'wav':
        return this.toWav(audioBuffer);
      case 'mp3':
        return this.toMp3(audioBuffer);
      case 'webm':
        return this.toWebM(audioBuffer);
      default:
        throw new Error(`Unsupported target format: ${targetFormat}`);
    }
  }

  private detectFormat(mimeType: string): AudioFormat {
    if (mimeType.includes('wav')) return 'wav';
    if (mimeType.includes('mp3')) return 'mp3';
    if (mimeType.includes('webm')) return 'webm';
    throw new Error(`Unsupported format: ${mimeType}`);
  }

  private async toWav(audioBuffer: AudioBuffer): Promise<Blob> {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numberOfChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = length * blockAlign;

    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // Write WAV header
    this.writeWavHeader(view, {
      channels: numberOfChannels,
      sampleRate,
      bitsPerSample,
      dataSize
    });

    // Write audio data
    const offset = 44;
    const channels = [];
    for (let i = 0; i < numberOfChannels; i++) {
      channels.push(audioBuffer.getChannelData(i));
    }

    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, channels[channel][i]));
        const value = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset + (i * blockAlign) + (channel * bytesPerSample), value, true);
      }
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  private async toMp3(audioBuffer: AudioBuffer): Promise<Blob> {
    // We'll use the LAME encoder for MP3 conversion
    const mp3Encoder = await this.initializeLameEncoder(audioBuffer.sampleRate, audioBuffer.numberOfChannels);
    const samples = this.getChannelData(audioBuffer);
    
    const mp3Data = mp3Encoder.encode(samples);
    const finalMp3 = mp3Encoder.finish();

    return new Blob([...mp3Data, ...finalMp3], { type: 'audio/mp3' });
  }

  private async toWebM(audioBuffer: AudioBuffer): Promise<Blob> {
    const stream = this.audioBufferToStream(audioBuffer);
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    });

    return new Promise((resolve) => {
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => resolve(new Blob(chunks, { type: 'audio/webm' }));

      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), audioBuffer.duration * 1000);
    });
  }

  private writeWavHeader(view: DataView, {
    channels,
    sampleRate,
    bitsPerSample,
    dataSize
  }: {
    channels: number;
    sampleRate: number;
    bitsPerSample: number;
    dataSize: number;
  }): void {
    // RIFF identifier
    this.writeString(view, 0, 'RIFF');
    // File length minus RIFF identifier length and file description length
    view.setUint32(4, 36 + dataSize, true);
    // WAVE identifier
    this.writeString(view, 8, 'WAVE');
    // Format chunk identifier
    this.writeString(view, 12, 'fmt ');
    // Format chunk length
    view.setUint32(16, 16, true);
    // Sample format (raw)
    view.setUint16(20, 1, true);
    // Channel count
    view.setUint16(22, channels, true);
    // Sample rate
    view.setUint32(24, sampleRate, true);
    // Byte rate (sample rate * block align)
    view.setUint32(28, sampleRate * channels * (bitsPerSample / 8), true);
    // Block align (channel count * bytes per sample)
    view.setUint16(32, channels * (bitsPerSample / 8), true);
    // Bits per sample
    view.setUint16(34, bitsPerSample, true);
    // Data chunk identifier
    this.writeString(view, 36, 'data');
    // Data chunk length
    view.setUint32(40, dataSize, true);
  }

  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  private getChannelData(audioBuffer: AudioBuffer): Float32Array[] {
    const channels = [];
    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      channels.push(audioBuffer.getChannelData(i));
    }
    return channels;
  }

  private audioBufferToStream(audioBuffer: AudioBuffer): MediaStream {
    const channels = this.getChannelData(audioBuffer);
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    
    const destination = this.audioContext.createMediaStreamDestination();
    source.connect(destination);
    source.start();
    
    return destination.stream;
  }

  private async initializeLameEncoder(sampleRate: number, channels: number): Promise<any> {
    // Load the LAME encoder dynamically
    // Note: You'll need to include the LAME encoder script in your project
    if (!(window as any).lamejs) {
      throw new Error('LAME encoder not found. Please include lamejs in your project.');
    }

    const Lame = (window as any).lamejs;
    return new Lame.Mp3Encoder(channels, sampleRate, 128);
  }

  public async getMetadata(blob: Blob): Promise<AudioMetadata> {
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

    return {
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels,
      format: this.detectFormat(blob.type)
    };
  }

  public dispose(): void {
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
} 