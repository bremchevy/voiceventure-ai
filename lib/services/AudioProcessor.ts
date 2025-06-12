import { Platform } from '../utils/platform'

export interface AudioProcessingConfig {
  noiseReductionLevel: number // 0-1
  gainLevel: number // 0-1
  echoCancellationStrength: number // 0-1
  clarityEnhancement: number // 0-1
}

export const DEFAULT_IOS_PROCESSING: AudioProcessingConfig = {
  noiseReductionLevel: 0.7,
  gainLevel: 0.8,
  echoCancellationStrength: 0.9,
  clarityEnhancement: 0.8
}

export const DEFAULT_ANDROID_PROCESSING: AudioProcessingConfig = {
  noiseReductionLevel: 0.6,
  gainLevel: 0.7,
  echoCancellationStrength: 0.8,
  clarityEnhancement: 0.7
}

export class AudioProcessor {
  private config: AudioProcessingConfig
  private platform: Platform
  private bufferSize: number
  private previousFrame: Float32Array | null = null
  private readonly SMOOTHING_FACTOR = 0.85

  constructor(platform: Platform, config?: Partial<AudioProcessingConfig>) {
    this.platform = platform
    this.config = platform === 'ios' 
      ? { ...DEFAULT_IOS_PROCESSING, ...config }
      : { ...DEFAULT_ANDROID_PROCESSING, ...config }
    this.bufferSize = platform === 'ios' ? 4096 : 8192
  }

  public process(inputData: Float32Array): Float32Array {
    // Create output buffer
    const outputData = new Float32Array(inputData.length)

    // Apply noise reduction
    this.applyNoiseReduction(inputData, outputData)

    // Apply automatic gain control
    this.applyGainControl(outputData)

    // Apply echo cancellation
    this.applyEchoCancellation(outputData)

    // Apply clarity enhancement
    this.applyClarityEnhancement(outputData)

    // Store current frame for next processing
    this.previousFrame = new Float32Array(inputData)

    return outputData
  }

  private applyNoiseReduction(input: Float32Array, output: Float32Array): void {
    const noiseFloor = 0.005
    const threshold = noiseFloor * this.config.noiseReductionLevel

    for (let i = 0; i < input.length; i++) {
      // Simple noise gate
      if (Math.abs(input[i]) < threshold) {
        output[i] = 0
      } else {
        // Soft noise reduction
        const reduction = Math.max(0, Math.abs(input[i]) - threshold)
        output[i] = Math.sign(input[i]) * reduction
      }
    }
  }

  private applyGainControl(buffer: Float32Array): void {
    const targetRMS = 0.2 * this.config.gainLevel
    let currentRMS = 0

    // Calculate current RMS
    for (let i = 0; i < buffer.length; i++) {
      currentRMS += buffer[i] * buffer[i]
    }
    currentRMS = Math.sqrt(currentRMS / buffer.length)

    if (currentRMS > 0) {
      // Calculate gain adjustment
      const gainAdjustment = targetRMS / currentRMS
      
      // Apply gain with smoothing
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] *= gainAdjustment
        
        // Prevent clipping
        if (buffer[i] > 1) buffer[i] = 1
        if (buffer[i] < -1) buffer[i] = -1
      }
    }
  }

  private applyEchoCancellation(buffer: Float32Array): void {
    if (!this.previousFrame) return

    const strength = this.config.echoCancellationStrength
    const delay = Math.floor(this.bufferSize * 0.1) // 10% of buffer size

    for (let i = delay; i < buffer.length; i++) {
      if (i - delay >= 0 && this.previousFrame[i - delay]) {
        // Subtract delayed signal
        buffer[i] -= this.previousFrame[i - delay] * strength
      }
    }
  }

  private applyClarityEnhancement(buffer: Float32Array): void {
    const enhancement = this.config.clarityEnhancement
    
    // Apply high-shelf filter for clarity
    const frequency = 2000 // Hz
    const sampleRate = this.platform === 'ios' ? 44100 : 48000
    const alpha = Math.exp(-2 * Math.PI * frequency / sampleRate)

    let filtered = 0
    for (let i = 0; i < buffer.length; i++) {
      filtered = alpha * (filtered + (1 - alpha) * buffer[i])
      buffer[i] = buffer[i] + (buffer[i] - filtered) * enhancement
      
      // Prevent clipping
      if (buffer[i] > 1) buffer[i] = 1
      if (buffer[i] < -1) buffer[i] = -1
    }
  }

  public updateConfig(newConfig: Partial<AudioProcessingConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig
    }
  }

  public getConfig(): AudioProcessingConfig {
    return { ...this.config }
  }
} 