interface NoiseProfile {
  level: number;          // Overall noise level (0-1)
  frequency: number;      // Dominant noise frequency
  type: 'constant' | 'variable' | 'impulse';
  spectrum: Float32Array; // Frequency spectrum
}

interface NoiseReductionConfig {
  reductionLevel: number;     // 0 (none) to 1 (maximum)
  smoothing: number;          // Smoothing factor for noise reduction
  frequencyWeighting: number; // Emphasis on certain frequencies
  minGain: number;           // Minimum gain to apply
  maxGain: number;           // Maximum gain to apply
  fftSize: number;           // Size of FFT for analysis
}

export class NoiseReductionService {
  private audioContext: AudioContext;
  private analyser: AnalyserNode;
  private gainNode: GainNode;
  private config: NoiseReductionConfig;
  private noiseProfile: NoiseProfile | null = null;
  private frequencyData: Float32Array;
  private timeData: Float32Array;
  private previousFrames: Float32Array[] = [];
  private readonly FRAME_MEMORY = 10;

  constructor(config?: Partial<NoiseReductionConfig>) {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.config = {
      reductionLevel: 0.5,
      smoothing: 0.75,
      frequencyWeighting: 1.0,
      minGain: 0.02,
      maxGain: 1.0,
      fftSize: 2048,
      ...config
    };

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = this.config.fftSize;
    this.analyser.smoothingTimeConstant = this.config.smoothing;

    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);
    this.analyser.connect(this.gainNode);

    this.frequencyData = new Float32Array(this.analyser.frequencyBinCount);
    this.timeData = new Float32Array(this.analyser.fftSize);
  }

  public async processBuffer(inputBuffer: AudioBuffer): Promise<AudioBuffer> {
    const outputBuffer = this.audioContext.createBuffer(
      inputBuffer.numberOfChannels,
      inputBuffer.length,
      inputBuffer.sampleRate
    );

    // Process each channel
    for (let channel = 0; channel < inputBuffer.numberOfChannels; channel++) {
      const inputData = inputBuffer.getChannelData(channel);
      const outputData = outputBuffer.getChannelData(channel);
      
      // Analyze noise profile if not already done
      if (!this.noiseProfile) {
        this.noiseProfile = await this.analyzeNoiseProfile(inputData);
      }

      // Apply noise reduction
      this.reduceNoise(inputData, outputData);
    }

    return outputBuffer;
  }

  private async analyzeNoiseProfile(data: Float32Array): Promise<NoiseProfile> {
    // Create temporary buffer for analysis
    const tempBuffer = this.audioContext.createBuffer(1, data.length, this.audioContext.sampleRate);
    tempBuffer.getChannelData(0).set(data);

    // Analyze frequency content
    this.analyser.getFloatFrequencyData(this.frequencyData);
    this.analyser.getFloatTimeDomainData(this.timeData);

    // Calculate noise level
    const rms = Math.sqrt(data.reduce((sum, x) => sum + x * x, 0) / data.length);
    
    // Find dominant frequency
    const dominantBin = this.frequencyData.indexOf(Math.max(...Array.from(this.frequencyData)));
    const dominantFreq = (dominantBin * this.audioContext.sampleRate) / this.analyser.fftSize;

    // Determine noise type
    const variability = this.calculateVariability(data);
    const noiseType = variability < 0.1 ? 'constant' 
                    : variability < 0.3 ? 'variable' 
                    : 'impulse';

    return {
      level: rms,
      frequency: dominantFreq,
      type: noiseType,
      spectrum: new Float32Array(this.frequencyData)
    };
  }

  private calculateVariability(data: Float32Array): number {
    const mean = data.reduce((sum, x) => sum + x, 0) / data.length;
    const variance = data.reduce((sum, x) => sum + (x - mean) ** 2, 0) / data.length;
    return Math.sqrt(variance);
  }

  private reduceNoise(inputData: Float32Array, outputData: Float32Array): void {
    // Store frame for temporal analysis
    this.previousFrames.push(new Float32Array(inputData));
    if (this.previousFrames.length > this.FRAME_MEMORY) {
      this.previousFrames.shift();
    }

    // Apply spectral subtraction
    for (let i = 0; i < inputData.length; i++) {
      const sample = inputData[i];
      
      // Calculate local noise estimate
      const localNoise = this.estimateLocalNoise(i);
      
      // Calculate suppression factor
      const suppressionFactor = this.calculateSuppressionFactor(sample, localNoise);
      
      // Apply noise reduction
      outputData[i] = sample * suppressionFactor;
    }
  }

  private estimateLocalNoise(index: number): number {
    // Use previous frames to estimate local noise level
    let sum = 0;
    let count = 0;

    for (const frame of this.previousFrames) {
      if (index < frame.length) {
        sum += Math.abs(frame[index]);
        count++;
      }
    }

    return count > 0 ? sum / count : 0;
  }

  private calculateSuppressionFactor(sample: number, noiseEstimate: number): number {
    // Calculate signal-to-noise ratio
    const snr = Math.abs(sample) / (noiseEstimate + 1e-6);
    
    // Apply weighted suppression based on SNR
    const suppressionFactor = Math.max(
      this.config.minGain,
      Math.min(
        this.config.maxGain,
        1 - (this.config.reductionLevel * (1 / (1 + Math.exp(-(snr - 1)))))
      )
    );

    return suppressionFactor;
  }

  public updateConfig(newConfig: Partial<NoiseReductionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.analyser.smoothingTimeConstant = this.config.smoothing;
    if (newConfig.fftSize) {
      this.analyser.fftSize = newConfig.fftSize;
      this.frequencyData = new Float32Array(this.analyser.frequencyBinCount);
      this.timeData = new Float32Array(this.analyser.fftSize);
    }
  }

  public getNoiseProfile(): NoiseProfile | null {
    return this.noiseProfile;
  }

  public reset(): void {
    this.noiseProfile = null;
    this.previousFrames = [];
  }

  public dispose(): void {
    this.analyser.disconnect();
    this.gainNode.disconnect();
    this.audioContext.close();
  }
} 