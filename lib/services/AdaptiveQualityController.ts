import { Platform } from '../utils/platform'
import { AudioProcessingConfig } from './AudioProcessor'

export interface DeviceMetrics {
  batteryLevel: number
  memoryUsage: number
  networkQuality: number
  processingLoad: number
}

export interface QualityProfile {
  sampleRate: number
  bitDepth: number
  channels: number
  bufferSize: number
  processingConfig: AudioProcessingConfig
}

export class AdaptiveQualityController {
  private platform: Platform
  private currentProfile: QualityProfile
  private metricsHistory: DeviceMetrics[] = []
  private readonly historySize = 10
  private readonly updateInterval = 5000 // 5 seconds

  private readonly HIGH_QUALITY: QualityProfile = {
    sampleRate: 48000,
    bitDepth: 24,
    channels: 2,
    bufferSize: this.platform === 'ios' ? 4096 : 8192,
    processingConfig: {
      noiseReductionLevel: 0.8,
      gainLevel: 0.9,
      echoCancellationStrength: 0.9,
      clarityEnhancement: 0.9
    }
  }

  private readonly MEDIUM_QUALITY: QualityProfile = {
    sampleRate: 44100,
    bitDepth: 16,
    channels: 1,
    bufferSize: this.platform === 'ios' ? 4096 : 8192,
    processingConfig: {
      noiseReductionLevel: 0.6,
      gainLevel: 0.7,
      echoCancellationStrength: 0.7,
      clarityEnhancement: 0.7
    }
  }

  private readonly LOW_QUALITY: QualityProfile = {
    sampleRate: 22050,
    bitDepth: 16,
    channels: 1,
    bufferSize: this.platform === 'ios' ? 8192 : 16384,
    processingConfig: {
      noiseReductionLevel: 0.4,
      gainLevel: 0.5,
      echoCancellationStrength: 0.5,
      clarityEnhancement: 0.4
    }
  }

  constructor(platform: Platform) {
    this.platform = platform
    this.currentProfile = this.MEDIUM_QUALITY
  }

  public updateMetrics(metrics: DeviceMetrics): void {
    this.metricsHistory.push(metrics)
    if (this.metricsHistory.length > this.historySize) {
      this.metricsHistory.shift()
    }
    this.adjustQuality()
  }

  private getAverageMetrics(): DeviceMetrics {
    const sum = this.metricsHistory.reduce((acc, metrics) => ({
      batteryLevel: acc.batteryLevel + metrics.batteryLevel,
      memoryUsage: acc.memoryUsage + metrics.memoryUsage,
      networkQuality: acc.networkQuality + metrics.networkQuality,
      processingLoad: acc.processingLoad + metrics.processingLoad
    }))

    const count = this.metricsHistory.length
    return {
      batteryLevel: sum.batteryLevel / count,
      memoryUsage: sum.memoryUsage / count,
      networkQuality: sum.networkQuality / count,
      processingLoad: sum.processingLoad / count
    }
  }

  private adjustQuality(): void {
    const metrics = this.getAverageMetrics()
    const score = this.calculateHealthScore(metrics)

    if (score >= 0.8) {
      this.currentProfile = this.HIGH_QUALITY
    } else if (score >= 0.5) {
      this.currentProfile = this.MEDIUM_QUALITY
    } else {
      this.currentProfile = this.LOW_QUALITY
    }

    // Platform-specific adjustments
    if (this.platform === 'ios') {
      this.applyIOSOptimizations(metrics)
    } else if (this.platform === 'android') {
      this.applyAndroidOptimizations(metrics)
    }
  }

  private calculateHealthScore(metrics: DeviceMetrics): number {
    const weights = {
      batteryLevel: 0.3,
      memoryUsage: 0.3,
      networkQuality: 0.2,
      processingLoad: 0.2
    }

    return (
      metrics.batteryLevel * weights.batteryLevel +
      (1 - metrics.memoryUsage) * weights.memoryUsage +
      metrics.networkQuality * weights.networkQuality +
      (1 - metrics.processingLoad) * weights.processingLoad
    )
  }

  private applyIOSOptimizations(metrics: DeviceMetrics): void {
    // iOS-specific quality adjustments
    if (metrics.batteryLevel < 0.2) {
      this.currentProfile.processingConfig.noiseReductionLevel *= 0.7
      this.currentProfile.processingConfig.clarityEnhancement *= 0.7
    }

    if (metrics.memoryUsage > 0.8) {
      this.currentProfile.bufferSize *= 2
    }
  }

  private applyAndroidOptimizations(metrics: DeviceMetrics): void {
    // Android-specific quality adjustments
    if (metrics.batteryLevel < 0.2) {
      this.currentProfile.processingConfig.noiseReductionLevel *= 0.6
      this.currentProfile.processingConfig.clarityEnhancement *= 0.6
    }

    if (metrics.processingLoad > 0.8) {
      this.currentProfile.sampleRate = Math.min(this.currentProfile.sampleRate, 22050)
    }
  }

  public getCurrentProfile(): QualityProfile {
    return { ...this.currentProfile }
  }

  public forceQualityProfile(profile: Partial<QualityProfile>): void {
    this.currentProfile = {
      ...this.currentProfile,
      ...profile
    }
  }
} 