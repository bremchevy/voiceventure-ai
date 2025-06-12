interface BrowserFeatures {
  webAudio: boolean
  mediaRecorder: boolean
  audioWorklet: boolean
  webWorker: boolean
  indexedDB: boolean
  webSocket: boolean
  getUserMedia: boolean
  permissions: boolean
  batteryAPI: boolean
  performanceAPI: boolean
}

interface BrowserSupport {
  features: BrowserFeatures
  mimeTypes: string[]
  constraints: MediaTrackConstraints
  sampleRates: number[]
  channelCounts: number[]
  bufferSizes: number[]
}

export class BrowserCompatibilityManager {
  private static instance: BrowserCompatibilityManager
  private browserSupport: BrowserSupport | null = null
  private fallbackStrategies: Map<string, () => Promise<void>>

  private constructor() {
    this.fallbackStrategies = new Map()
    this.initializeFallbackStrategies()
  }

  public static getInstance(): BrowserCompatibilityManager {
    if (!BrowserCompatibilityManager.instance) {
      BrowserCompatibilityManager.instance = new BrowserCompatibilityManager()
    }
    return BrowserCompatibilityManager.instance
  }

  private async detectBrowserFeatures(): Promise<BrowserFeatures> {
    return {
      webAudio: typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined',
      mediaRecorder: typeof MediaRecorder !== 'undefined',
      audioWorklet: typeof AudioWorkletNode !== 'undefined',
      webWorker: typeof Worker !== 'undefined',
      indexedDB: typeof indexedDB !== 'undefined',
      webSocket: typeof WebSocket !== 'undefined',
      getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      permissions: typeof navigator.permissions !== 'undefined',
      batteryAPI: typeof (navigator as any).getBattery !== 'undefined',
      performanceAPI: typeof performance !== 'undefined'
    }
  }

  private async detectMimeTypeSupport(): Promise<string[]> {
    const mimeTypes = [
      'audio/webm',
      'audio/webm;codecs=opus',
      'audio/ogg;codecs=opus',
      'audio/wav',
      'audio/mp4',
      'audio/mpeg'
    ]

    return mimeTypes.filter(type => {
      try {
        return MediaRecorder.isTypeSupported(type)
      } catch {
        return false
      }
    })
  }

  private async detectAudioConstraints(): Promise<MediaTrackConstraints> {
    const constraints: MediaTrackConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const audioDevice = devices.find(device => device.kind === 'audioinput')
      if (audioDevice) {
        const capabilities = (audioDevice as any).getCapabilities?.()
        if (capabilities) {
          if (capabilities.sampleRate) {
            constraints.sampleRate = { ideal: capabilities.sampleRate.max }
          }
          if (capabilities.channelCount) {
            constraints.channelCount = { ideal: capabilities.channelCount.max }
          }
        }
      }
    } catch {
      // Use default constraints if detection fails
    }

    return constraints
  }

  private async detectSampleRates(): Promise<number[]> {
    const defaultRates = [8000, 11025, 16000, 22050, 32000, 44100, 48000]
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const maxRate = audioContext.sampleRate
      audioContext.close()
      return defaultRates.filter(rate => rate <= maxRate)
    } catch {
      return defaultRates
    }
  }

  private initializeFallbackStrategies(): void {
    // WebAudio fallback
    this.fallbackStrategies.set('webAudio', async () => {
      if (!this.browserSupport?.features.webAudio) {
        console.warn('WebAudio API not supported, using legacy audio processing')
        // Implement legacy audio processing
      }
    })

    // MediaRecorder fallback
    this.fallbackStrategies.set('mediaRecorder', async () => {
      if (!this.browserSupport?.features.mediaRecorder) {
        console.warn('MediaRecorder not supported, using manual audio buffering')
        // Implement manual audio buffering
      }
    })

    // AudioWorklet fallback
    this.fallbackStrategies.set('audioWorklet', async () => {
      if (!this.browserSupport?.features.audioWorklet) {
        console.warn('AudioWorklet not supported, using ScriptProcessor')
        // Use ScriptProcessor as fallback
      }
    })

    // WebWorker fallback
    this.fallbackStrategies.set('webWorker', async () => {
      if (!this.browserSupport?.features.webWorker) {
        console.warn('WebWorker not supported, using main thread processing')
        // Implement main thread processing
      }
    })

    // IndexedDB fallback
    this.fallbackStrategies.set('indexedDB', async () => {
      if (!this.browserSupport?.features.indexedDB) {
        console.warn('IndexedDB not supported, using memory storage')
        // Implement in-memory storage
      }
    })
  }

  public async initialize(): Promise<void> {
    this.browserSupport = {
      features: await this.detectBrowserFeatures(),
      mimeTypes: await this.detectMimeTypeSupport(),
      constraints: await this.detectAudioConstraints(),
      sampleRates: await this.detectSampleRates(),
      channelCounts: [1, 2],
      bufferSizes: [256, 512, 1024, 2048, 4096, 8192, 16384]
    }

    // Apply fallback strategies for unsupported features
    for (const [feature, strategy] of this.fallbackStrategies.entries()) {
      if (!this.browserSupport.features[feature as keyof BrowserFeatures]) {
        await strategy()
      }
    }
  }

  public getOptimalAudioConfig(): {
    mimeType: string
    sampleRate: number
    channelCount: number
    bufferSize: number
    constraints: MediaTrackConstraints
  } {
    if (!this.browserSupport) {
      throw new Error('BrowserCompatibilityManager not initialized')
    }

    return {
      mimeType: this.browserSupport.mimeTypes[0] || 'audio/webm',
      sampleRate: Math.max(...this.browserSupport.sampleRates),
      channelCount: Math.max(...this.browserSupport.channelCounts),
      bufferSize: 4096, // Default optimal size
      constraints: this.browserSupport.constraints
    }
  }

  public isFeatureSupported(feature: keyof BrowserFeatures): boolean {
    return this.browserSupport?.features[feature] || false
  }

  public getSupportedMimeTypes(): string[] {
    return this.browserSupport?.mimeTypes || []
  }

  public getSupportedSampleRates(): number[] {
    return this.browserSupport?.sampleRates || []
  }

  public getAudioConstraints(): MediaTrackConstraints {
    return this.browserSupport?.constraints || {}
  }

  public async applyFallbackStrategy(feature: string): Promise<void> {
    const strategy = this.fallbackStrategies.get(feature)
    if (strategy) {
      await strategy()
    }
  }
} 