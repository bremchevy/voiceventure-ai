interface AudioMetrics {
  snr: number;              // Signal-to-noise ratio
  clarity: number;          // Speech clarity score (0-1)
  volume: number;           // Average volume level (dB)
  clippingRatio: number;    // Ratio of clipped samples
  backgroundNoise: number;  // Background noise level (dB)
}

interface PerformanceMetrics {
  processingTime: number;      // Time taken to process audio (ms)
  memoryUsage: number;         // Memory usage in MB
  batteryImpact: number;       // Estimated battery impact (0-1)
  cpuUtilization: number;      // CPU utilization (0-1)
  latency: number;             // Processing latency (ms)
}

export class PerformanceMonitoringService {
  private metrics: {
    audio: AudioMetrics;
    performance: PerformanceMetrics;
  };

  private readonly CLIPPING_THRESHOLD = 0.99;
  private readonly MEMORY_THRESHOLD = 100; // MB
  private readonly LATENCY_THRESHOLD = 100; // ms
  private readonly CPU_THRESHOLD = 0.8; // 80%

  constructor() {
    this.metrics = {
      audio: {
        snr: 0,
        clarity: 0,
        volume: 0,
        clippingRatio: 0,
        backgroundNoise: 0
      },
      performance: {
        processingTime: 0,
        memoryUsage: 0,
        batteryImpact: 0,
        cpuUtilization: 0,
        latency: 0
      }
    };
  }

  public async analyzeAudioQuality(buffer: AudioBuffer): Promise<AudioMetrics> {
    const startTime = performance.now();
    const channelData = buffer.getChannelData(0); // Analyze first channel

    // Calculate volume in dB
    const rms = Math.sqrt(channelData.reduce((sum, x) => sum + x * x, 0) / channelData.length);
    const volumeDb = 20 * Math.log10(rms);

    // Calculate clipping ratio
    const clippedSamples = channelData.reduce((count, sample) => 
      count + (Math.abs(sample) >= this.CLIPPING_THRESHOLD ? 1 : 0), 0);
    const clippingRatio = clippedSamples / channelData.length;

    // Estimate background noise using lowest 10% of samples
    const sortedMagnitudes = Array.from(channelData).map(Math.abs).sort();
    const noiseFloor = sortedMagnitudes[Math.floor(sortedMagnitudes.length * 0.1)];
    const backgroundNoiseDb = 20 * Math.log10(noiseFloor);

    // Calculate SNR
    const signalPower = rms * rms;
    const noisePower = noiseFloor * noiseFloor;
    const snr = 10 * Math.log10(signalPower / noisePower);

    // Estimate clarity based on SNR and clipping
    const clarity = Math.max(0, Math.min(1, 
      (snr / 60) * (1 - clippingRatio) * (1 - Math.abs(volumeDb) / 60)
    ));

    this.metrics.audio = {
      snr,
      clarity,
      volume: volumeDb,
      clippingRatio,
      backgroundNoise: backgroundNoiseDb
    };

    // Update performance metrics
    this.metrics.performance.processingTime = performance.now() - startTime;

    return this.metrics.audio;
  }

  public async measurePerformance(): Promise<PerformanceMetrics> {
    // Measure memory usage
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.performance.memoryUsage = memory.usedJSHeapSize / (1024 * 1024);
    }

    // Estimate CPU utilization using timing measurements
    const startTime = performance.now();
    let count = 0;
    const endTime = startTime + 100; // Measure for 100ms
    
    while (performance.now() < endTime) {
      count++;
    }

    const actualTime = performance.now() - startTime;
    const cpuUtilization = Math.min(1, actualTime / 100);
    
    // Estimate battery impact based on CPU and memory usage
    const batteryImpact = (cpuUtilization + (this.metrics.performance.memoryUsage / this.MEMORY_THRESHOLD)) / 2;

    this.metrics.performance = {
      ...this.metrics.performance,
      cpuUtilization,
      batteryImpact,
      latency: this.metrics.performance.processingTime // Use processing time as latency estimate
    };

    return this.metrics.performance;
  }

  public getQualityScore(): number {
    const { audio, performance } = this.metrics;
    
    // Weight factors for different metrics
    const weights = {
      clarity: 0.3,
      snr: 0.2,
      clipping: 0.15,
      latency: 0.15,
      cpu: 0.1,
      battery: 0.1
    };

    // Normalize metrics to 0-1 range
    const normalizedMetrics = {
      clarity: audio.clarity,
      snr: Math.max(0, Math.min(1, audio.snr / 60)),
      clipping: 1 - audio.clippingRatio,
      latency: Math.max(0, 1 - (performance.latency / this.LATENCY_THRESHOLD)),
      cpu: 1 - performance.cpuUtilization,
      battery: 1 - performance.batteryImpact
    };

    // Calculate weighted average
    return Object.entries(weights).reduce((score, [metric, weight]) => 
      score + (normalizedMetrics[metric as keyof typeof normalizedMetrics] * weight), 0);
  }

  public getMetrics() {
    return {
      ...this.metrics,
      qualityScore: this.getQualityScore()
    };
  }

  public getWarnings(): string[] {
    const warnings: string[] = [];
    const { audio, performance } = this.metrics;

    if (audio.clippingRatio > 0.05) {
      warnings.push('High audio clipping detected - reduce input volume');
    }
    if (audio.snr < 15) {
      warnings.push('Low signal-to-noise ratio - check microphone placement');
    }
    if (performance.memoryUsage > this.MEMORY_THRESHOLD) {
      warnings.push('High memory usage - consider clearing buffer');
    }
    if (performance.latency > this.LATENCY_THRESHOLD) {
      warnings.push('High latency detected - check system resources');
    }
    if (performance.cpuUtilization > this.CPU_THRESHOLD) {
      warnings.push('High CPU usage - consider reducing processing load');
    }

    return warnings;
  }

  public reset(): void {
    this.metrics = {
      audio: {
        snr: 0,
        clarity: 0,
        volume: 0,
        clippingRatio: 0,
        backgroundNoise: 0
      },
      performance: {
        processingTime: 0,
        memoryUsage: 0,
        batteryImpact: 0,
        cpuUtilization: 0,
        latency: 0
      }
    };
  }
} 