import {
  Platform,
  detectPlatform,
  getOptimalAudioConstraints,
  checkBatteryStatus,
  checkMemoryStatus,
  checkNetworkCondition,
  checkDeviceCapabilities
} from '../utils/platform'
import { AudioProcessor, AudioProcessingConfig } from './AudioProcessor'
import { AdaptiveQualityController, DeviceMetrics } from './AdaptiveQualityController'
import { PerformanceMonitor, PerformanceMetrics } from './PerformanceMonitor'
import { ErrorRecoveryManager, ErrorContext } from './ErrorRecoveryManager'
import { BrowserCompatibilityManager } from '../utils/BrowserCompatibilityManager'
import { ConfigurationService, VoiceRecordingConfig, WhisperConfig } from './ConfigurationService'
import { WhisperService, TranscriptionResult, TranslationResult } from './WhisperService'
import { AudioFormatConverter, AudioFormat } from '../utils/AudioFormatConverter'
import { OfflineStorageService } from './OfflineStorageService'
import { OfflineTranscriptionManager } from './OfflineTranscriptionManager'

interface RecordingOptions {
  sampleRate?: number
  numberOfChannels?: number
  bitsPerSample?: number
  bufferSize?: number
  mimeType?: string
}

export class MobileVoiceRecordingManager {
  private mediaRecorder: MediaRecorder | null = null
  private audioContext: AudioContext | null = null
  private audioInput: MediaStreamAudioSourceNode | null = null
  private processor: ScriptProcessorNode | null = null
  private stream: MediaStream | null = null
  private chunks: Blob[] = []
  private isRecording = false
  private isPaused = false
  private platform: Platform
  private lowBatteryThreshold = 0.15
  private lowMemoryThreshold = 0.9
  private audioProcessor: AudioProcessor
  private qualityController: AdaptiveQualityController
  private metricsUpdateInterval: number | null = null
  private lastProcessingTime = 0
  private performanceMonitor: PerformanceMonitor
  private lastAudioTimestamp: number = 0
  private audioGapThreshold = 50 // ms
  private errorRecoveryManager: ErrorRecoveryManager
  private browserCompat: BrowserCompatibilityManager
  private configService: ConfigurationService
  private whisperService: WhisperService | null = null
  private audioConverter: AudioFormatConverter
  private offlineStorage: OfflineStorageService
  private offlineTranscriptionManager: OfflineTranscriptionManager | null = null

  // VAD properties
  private vadNode: AnalyserNode | null = null
  private vadBuffer: Uint8Array | null = null
  private vadFrameId: number | null = null
  private silenceStart: number | null = null
  private readonly silenceThreshold = 128 // Adjust this value (0-255)
  private readonly silenceDuration = 2000 // Changed from 1500 to 2000ms

  constructor() {
    this.platform = detectPlatform()
    this.audioProcessor = new AudioProcessor(this.platform)
    this.qualityController = new AdaptiveQualityController(this.platform)
    this.performanceMonitor = new PerformanceMonitor()
    this.errorRecoveryManager = new ErrorRecoveryManager(this.platform)
    this.browserCompat = BrowserCompatibilityManager.getInstance()
    this.configService = new ConfigurationService()
    this.audioConverter = new AudioFormatConverter()
    this.offlineStorage = new OfflineStorageService()
  }

  private startMonitoring(): void {
    if (!this.stream || !this.isRecording) return

    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    
    if (!this.vadNode) {
      const source = this.audioContext.createMediaStreamSource(this.stream)
      this.vadNode = this.audioContext.createAnalyser()
      this.vadNode.fftSize = 256
      source.connect(this.vadNode)
      this.vadBuffer = new Uint8Array(this.vadNode.frequencyBinCount)
    }

    const checkSilence = () => {
      if (!this.isRecording || this.isPaused || !this.vadNode || !this.vadBuffer) {
        this.vadFrameId = requestAnimationFrame(checkSilence)
        return
      }

      this.vadNode.getByteFrequencyData(this.vadBuffer)
      const sum = this.vadBuffer.reduce((a, b) => a + b, 0)
      const avg = sum / this.vadBuffer.length

      if (avg < this.silenceThreshold) {
        if (this.silenceStart === null) {
          this.silenceStart = Date.now()
        } else if (Date.now() - this.silenceStart > this.silenceDuration) {
          this.stopRecording() // Auto-stop recording
          this.stopMonitoring()
          return
        }
      } else {
        this.silenceStart = null
      }
      this.vadFrameId = requestAnimationFrame(checkSilence)
    }
    this.vadFrameId = requestAnimationFrame(checkSilence)
  }

  private stopMonitoring(): void {
    if (this.vadFrameId) {
      cancelAnimationFrame(this.vadFrameId)
      this.vadFrameId = null
    }
    this.vadNode?.disconnect()
    this.vadNode = null
    this.silenceStart = null
  }

  private async initializeBrowserSupport(): Promise<void> {
    await this.browserCompat.initialize()

    // Check for critical features
    if (!this.browserCompat.isFeatureSupported('getUserMedia')) {
      throw new Error('Microphone access is not supported in this browser')
    }

    if (!this.browserCompat.isFeatureSupported('webAudio')) {
      await this.browserCompat.applyFallbackStrategy('webAudio')
    }

    if (!this.browserCompat.isFeatureSupported('mediaRecorder')) {
      await this.browserCompat.applyFallbackStrategy('mediaRecorder')
    }

    // Apply configuration based on browser capabilities
    const browserConfig = this.browserCompat.getOptimalAudioConfig()
    this.configService.updateVoiceConfig({
      sampleRate: browserConfig.sampleRate,
      channels: browserConfig.channelCount,
      format: browserConfig.mimeType.includes('webm') ? 'webm' : 
             browserConfig.mimeType.includes('mp3') ? 'mp3' : 'wav'
    })

    // Start monitoring for device metrics
    this.metricsUpdateInterval = window.setInterval(() => this.updateDeviceMetrics(), 5000)

    this.isRecording = true
    this.isPaused = false

    // Start VAD
    this.startMonitoring()
  }

  private async checkDeviceStatus(): Promise<{ canRecord: boolean; reason?: string }> {
    // Check battery status
    const battery = await checkBatteryStatus()
    if (battery && battery.level < this.lowBatteryThreshold && !battery.charging) {
      return { canRecord: false, reason: 'Low battery. Please connect charger.' }
    }

    // Check memory status
    const memory = checkMemoryStatus()
    if (memory.totalJSHeapSize && memory.usedJSHeapSize) {
      const memoryUsage = memory.usedJSHeapSize / memory.totalJSHeapSize
      if (memoryUsage > this.lowMemoryThreshold) {
        return { canRecord: false, reason: 'Low memory. Please close other apps.' }
      }
    }

    // Check network for streaming transcription
    const network = await checkNetworkCondition()
    if (network.effectiveType === '2g' || network.effectiveType === 'slow-2g') {
      return { canRecord: false, reason: 'Poor network connection.' }
    }

    // Check device capabilities
    const capabilities = await checkDeviceCapabilities()
    if (!capabilities.hasGetUserMedia || !capabilities.hasAudioContext) {
      return { canRecord: false, reason: 'Missing required audio capabilities.' }
    }

    return { canRecord: true }
  }

  private getOptimalRecordingOptions(): RecordingOptions {
    switch (this.platform) {
      case 'ios':
        return {
          sampleRate: 44100,
          numberOfChannels: 1,
          bitsPerSample: 16,
          bufferSize: 4096,
          mimeType: 'audio/mp4'
        }
      case 'android':
        return {
          sampleRate: 44100,
          numberOfChannels: 1,
          bitsPerSample: 16,
          bufferSize: 8192, // Larger buffer for Android
          mimeType: 'audio/webm'
        }
      default:
        return {
          sampleRate: 44100,
          numberOfChannels: 1,
          bitsPerSample: 16,
          bufferSize: 4096,
          mimeType: 'audio/webm'
        }
    }
  }

  private async updateDeviceMetrics(): Promise<void> {
    const startTime = performance.now()

    // Get battery status
    const battery = await checkBatteryStatus()
    const batteryLevel = battery?.level ?? 1

    // Get memory status
    const memory = checkMemoryStatus()
    const memoryUsage = memory.usedJSHeapSize && memory.totalJSHeapSize
      ? memory.usedJSHeapSize / memory.totalJSHeapSize
      : 0

    // Record performance metrics
    this.recordPerformanceMetrics({
      batteryDrain: 1 - batteryLevel, // Convert to drain percentage
      memoryUsage
    })

    // Update quality controller
    const metrics: DeviceMetrics = {
      batteryLevel,
      memoryUsage,
      networkQuality: this.calculateNetworkQuality(await checkNetworkCondition()),
      processingLoad: Math.min((performance.now() - startTime) / 100, 1)
    }

    this.qualityController.updateMetrics(metrics)
    
    // Update audio processing config based on new quality profile
    const profile = this.qualityController.getCurrentProfile()
    this.audioProcessor.updateConfig(profile.processingConfig)

    // Check for performance alerts
    const recentAlerts = this.performanceMonitor.getRecentAlerts(1)
    if (recentAlerts.length > 0) {
      const alert = recentAlerts[0]
      if (alert.type === 'error') {
        // Handle critical performance issues
        await this.handlePerformanceError(alert)
      }
    }
  }

  private calculateNetworkQuality(network: { 
    type: string; 
    downlink?: number; 
    rtt?: number; 
    effectiveType?: string 
  }): number {
    if (network.effectiveType === '4g') return 1
    if (network.effectiveType === '3g') return 0.7
    if (network.effectiveType === '2g') return 0.3
    if (network.effectiveType === 'slow-2g') return 0.1
    
    // Fallback calculation based on downlink and RTT if available
    if (network.downlink && network.rtt) {
      const normalizedDownlink = Math.min(network.downlink / 10, 1)
      const normalizedRtt = Math.max(0, 1 - network.rtt / 1000)
      return (normalizedDownlink + normalizedRtt) / 2
    }

    return 0.5 // Default to medium quality if we can't determine
  }

  private async handlePerformanceError(alert: { message: string }): Promise<void> {
    // Attempt to recover from performance issues
    const profile = this.qualityController.getCurrentProfile()
    
    // Step 1: Reduce quality settings
    this.qualityController.forceQualityProfile({
      ...profile,
      sampleRate: Math.min(profile.sampleRate, 22050),
      channels: 1,
      bufferSize: profile.bufferSize * 2
    })

    // Step 2: Apply reduced processing
    this.audioProcessor.updateConfig({
      noiseReductionLevel: 0.3,
      gainLevel: 0.5,
      echoCancellationStrength: 0.3,
      clarityEnhancement: 0.3
    })

    // Step 3: If recording, briefly pause and resume to apply new settings
    if (this.isRecording && !this.isPaused) {
      await this.pauseRecording()
      await new Promise(resolve => setTimeout(resolve, 100))
      await this.resumeRecording()
    }

    console.warn('Performance issue detected:', alert.message)
  }

  private recordPerformanceMetrics(metrics: Partial<PerformanceMetrics>): void {
    this.performanceMonitor.recordMetrics(metrics)
  }

  private async handleError(error: Error, type: ErrorContext['errorType'], severity: ErrorContext['severity'], metadata?: Record<string, any>): Promise<boolean> {
    const context: ErrorContext = {
      errorType: type,
      severity,
      message: error.message,
      timestamp: Date.now(),
      retryCount: 0,
      metadata
    }

    return this.errorRecoveryManager.handleError(context)
  }

  public async startRecording(): Promise<void> {
    try {
      // Initialize browser support and configuration
      await this.initializeBrowserSupport()

      // Reset monitoring systems
      this.performanceMonitor.reset()
      this.lastAudioTimestamp = 0
      this.errorRecoveryManager.clearErrorHistory()

      const status = await this.checkDeviceStatus()
      if (!status.canRecord) {
        throw new Error(status.reason)
      }

      // Get configurations
      const voiceConfig = this.configService.getVoiceConfig()
      const optimalConfig = this.browserCompat.getOptimalAudioConfig()
      const profile = this.qualityController.getCurrentProfile()

      try {
        // Merge browser constraints with configuration
        const constraints = {
          ...optimalConfig.constraints,
          sampleRate: { ideal: voiceConfig.sampleRate },
          channelCount: { ideal: voiceConfig.channels }
        }

        this.stream = await navigator.mediaDevices.getUserMedia({ audio: constraints })
      } catch (error) {
        const recovered = await this.handleError(
          error as Error,
          'audio',
          'high',
          { constraints: optimalConfig.constraints }
        )
        if (!recovered) throw error
      }

      try {
        // Initialize AudioContext with configuration
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: voiceConfig.sampleRate,
          latencyHint: 'interactive'
        })

        this.audioInput = this.audioContext.createMediaStreamSource(this.stream!)
        
        // Create processor with configured settings
        this.processor = this.audioContext.createScriptProcessor(
          profile.bufferSize,
          voiceConfig.channels,
          voiceConfig.channels
        )

        this.audioInput.connect(this.processor)
        this.processor.connect(this.audioContext.destination)
      } catch (error) {
        const recovered = await this.handleError(
          error as Error,
          'processing',
          'high',
          { audioContext: this.audioContext }
        )
        if (!recovered) throw error
      }

      try {
        // Initialize MediaRecorder with configured format
        const mimeType = this.getMimeType(voiceConfig.format)
        this.mediaRecorder = new MediaRecorder(this.stream!, {
          mimeType
        })

        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.chunks.push(event.data)
          }
        }

        this.mediaRecorder.start(100)
        this.isRecording = true

        // Set up audio processing
        this.processor!.onaudioprocess = this.handleAudioProcess.bind(this)

        // Start metrics monitoring
        this.metricsUpdateInterval = window.setInterval(
          () => this.updateDeviceMetrics(),
          5000
        )

        // Set recording duration limit
        if (voiceConfig.maxDuration > 0) {
          setTimeout(() => {
            if (this.isRecording) {
              this.stopRecording()
            }
          }, voiceConfig.maxDuration * 1000)
        }
      } catch (error) {
        const recovered = await this.handleError(
          error as Error,
          'device',
          'critical',
          { stream: this.stream }
        )
        if (!recovered) throw error
      }

    } catch (error) {
      this.cleanup()
      throw error
    }
  }

  private getMimeType(format: VoiceRecordingConfig['format']): string {
    const mimeTypes = {
      webm: ['audio/webm', 'audio/webm;codecs=opus'],
      mp3: ['audio/mp3', 'audio/mpeg'],
      wav: ['audio/wav', 'audio/wave']
    }

    const supported = mimeTypes[format].find(type => {
      try {
        return MediaRecorder.isTypeSupported(type)
      } catch {
        return false
      }
    })

    if (!supported) {
      throw new Error(`Format ${format} is not supported by this browser`)
    }

    return supported
  }

  private async handleAudioProcess(event: AudioProcessingEvent) {
    if (!this.isRecording || this.isPaused) return

    try {
      const currentTime = performance.now()
      
      // Detect audio dropouts
      if (this.lastAudioTimestamp > 0) {
        const gap = currentTime - this.lastAudioTimestamp
        if (gap > this.audioGapThreshold) {
          this.recordPerformanceMetrics({
            audioDropouts: gap / 1000 // Convert to seconds
          })

          // Try to recover from significant audio dropouts
          if (gap > 1000) { // 1 second
            await this.handleError(
              new Error('Significant audio dropout detected'),
              'audio',
              'medium',
              { dropoutDuration: gap }
            )
          }
        }
      }
      this.lastAudioTimestamp = currentTime

      const processingStart = performance.now()
      
      const input = event.inputBuffer.getChannelData(0)
      const processedData = this.audioProcessor.process(input)
      
      // Copy processed data to output buffer
      const output = event.outputBuffer.getChannelData(0)
      processedData.forEach((sample, i) => {
        output[i] = sample
      })

      // Record processing latency
      const processingEnd = performance.now()
      const latency = (processingEnd - processingStart) / 1000
      this.recordPerformanceMetrics({
        processingLatency: latency
      })

      // Check for processing performance issues
      if (latency > 0.1) { // 100ms threshold
        await this.handleError(
          new Error('High processing latency detected'),
          'processing',
          'medium',
          { latency }
        )
      }
    } catch (error) {
      console.error('Audio processing error:', error)
      await this.handleError(
        error as Error,
        'processing',
        'high'
      )
    }
  }

  public async pauseRecording(): Promise<void> {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.pause()
      this.isPaused = true
      
      // Suspend AudioContext to save battery
      if (this.audioContext) {
        await this.audioContext.suspend()
      }
    }
  }

  public async resumeRecording(): Promise<void> {
    if (this.mediaRecorder && this.isRecording && this.isPaused) {
      this.mediaRecorder.resume()
      this.isPaused = false
      
      // Resume AudioContext
      if (this.audioContext) {
        await this.audioContext.resume()
      }
    }
  }

  public async stopRecording(options?: { 
    transcribe?: boolean; 
    translate?: boolean;
    format?: AudioFormat;
    storeOffline?: boolean;
  }): Promise<{
    audio: Blob;
    transcription?: TranscriptionResult;
    translation?: TranslationResult;
    recordingId?: string;
  }> {
    if (!this.isRecording) {
      await this.handleError(new Error('No recording in progress to stop'), 'stop_recording', 'warning')
      // Return a default or empty response
      return {
        audio: new Blob(),
      }
    }

    // Stop VAD
    this.stopMonitoring()

    this.mediaRecorder?.stop()

    // The rest of the logic happens in the 'onstop' event handler
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No recording in progress'));
        return;
      }

      this.mediaRecorder.onstop = async () => {
        try {
          let audioBlob = new Blob(this.chunks, { type: this.getOptimalRecordingOptions().mimeType });
          
          // Convert format if requested
          if (options?.format) {
            audioBlob = await this.convertFormat(audioBlob, options.format);
          }

          const result: {
            audio: Blob;
            transcription?: TranscriptionResult;
            translation?: TranslationResult;
            recordingId?: string;
          } = { audio: audioBlob };

          // Store offline if requested
          if (options?.storeOffline) {
            const metadata = await this.audioConverter.getMetadata(audioBlob);
            const recordingId = await this.offlineStorage.storeRecording({
              id: crypto.randomUUID(),
              blob: audioBlob,
              format: metadata.format,
              timestamp: Date.now(),
              duration: metadata.duration,
              metadata: {
                sampleRate: metadata.sampleRate,
                channels: metadata.channels
              }
            });
            result.recordingId = recordingId;

            // Queue for transcription/translation if requested
            if (options.transcribe) {
              await this.offlineStorage.queueForTranscription(recordingId, 'transcription');
            }
            if (options.translate) {
              await this.offlineStorage.queueForTranscription(recordingId, 'translation');
            }
          } else {
            // Immediate transcription/translation
            if (options?.transcribe) {
              result.transcription = await this.transcribeRecording(audioBlob);
            }
            if (options?.translate) {
              result.translation = await this.translateRecording(audioBlob);
            }
          }

          this.cleanup();
          resolve(result);
        } catch (error) {
          this.cleanup();
          reject(error);
        }
      };
    });
  }

  private cleanup(): void {
    if (this.metricsUpdateInterval) {
      window.clearInterval(this.metricsUpdateInterval)
      this.metricsUpdateInterval = null
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
    }
    
    if (this.processor && this.audioInput && this.audioContext) {
      this.processor.disconnect()
      this.audioInput.disconnect()
      this.audioContext.close()
    }

    this.mediaRecorder = null
    this.audioContext = null
    this.audioInput = null
    this.processor = null
    this.stream = null
    this.chunks = []
    this.isRecording = false
    this.isPaused = false

    // Reset monitoring systems
    this.performanceMonitor.reset()
    this.lastAudioTimestamp = 0
    this.errorRecoveryManager.cleanup()
  }

  public isActive(): boolean {
    return this.isRecording
  }

  public isPausedState(): boolean {
    return this.isPaused
  }

  public updateAudioProcessing(config: Partial<AudioProcessingConfig>): void {
    this.audioProcessor.updateConfig(config)
  }

  public getPerformanceMetrics(): {
    averageLatency: number
    totalDropouts: number
    averageMemoryUsage: number
    batteryDrainRate: number
  } {
    return this.performanceMonitor.getMetricsSummary()
  }

  public getErrorHistory(): ErrorContext[] {
    return this.errorRecoveryManager.getErrorHistory()
  }

  public getBrowserSupport(): {
    features: string[]
    mimeTypes: string[]
    sampleRates: number[]
  } {
    const features = [
      'webAudio',
      'mediaRecorder',
      'audioWorklet',
      'webWorker',
      'indexedDB',
      'webSocket',
      'getUserMedia',
      'permissions',
      'batteryAPI',
      'performanceAPI'
    ] as const;
    
    return {
      features: features.filter(feature => this.browserCompat.isFeatureSupported(feature)),
      mimeTypes: this.browserCompat.getSupportedMimeTypes(),
      sampleRates: this.browserCompat.getSupportedSampleRates()
    }
  }

  public getConfiguration(): {
    voice: VoiceRecordingConfig
    whisper: WhisperConfig
  } {
    return {
      voice: this.configService.getVoiceConfig(),
      whisper: this.configService.getWhisperConfig()
    }
  }

  public updateConfiguration(config: {
    voice?: Partial<VoiceRecordingConfig>
    whisper?: Partial<WhisperConfig>
  }): void {
    if (config.voice) {
      this.configService.updateVoiceConfig(config.voice)
    }
    if (config.whisper) {
      this.configService.updateWhisperConfig(config.whisper)
    }
  }

  public initializeWhisperService(apiKey: string): void {
    this.whisperService = new WhisperService(apiKey, this.configService.getWhisperConfig());
    this.offlineTranscriptionManager = new OfflineTranscriptionManager(
      this.offlineStorage,
      this.whisperService
    );
    this.offlineTranscriptionManager.startProcessing();
  }

  public async transcribeRecording(audioBlob: Blob): Promise<TranscriptionResult> {
    if (!this.whisperService) {
      throw new Error('Whisper service not initialized. Call initializeWhisperService first.');
    }

    try {
      return await this.whisperService.transcribe(audioBlob);
    } catch (error) {
      await this.handleError(
        error as Error,
        'transcription',
        'high',
        { audioSize: audioBlob.size }
      );
      throw error;
    }
  }

  public async translateRecording(audioBlob: Blob): Promise<TranslationResult> {
    if (!this.whisperService) {
      throw new Error('Whisper service not initialized. Call initializeWhisperService first.');
    }

    try {
      return await this.whisperService.translate(audioBlob);
    } catch (error) {
      await this.handleError(
        error as Error,
        'translation',
        'high',
        { audioSize: audioBlob.size }
      );
      throw error;
    }
  }

  private async convertFormat(blob: Blob, targetFormat: AudioFormat): Promise<Blob> {
    try {
      return await this.audioConverter.convert(blob, targetFormat);
    } catch (error) {
      await this.handleError(
        error as Error,
        'processing',
        'medium',
        { sourceFormat: blob.type, targetFormat }
      );
      throw error;
    }
  }

  public async getStoredRecording(id: string): Promise<{
    audio: Blob;
    transcription?: TranscriptionResult;
    translation?: TranslationResult;
  } | null> {
    const recording = await this.offlineStorage.getRecording(id);
    if (!recording) return null;

    return {
      audio: recording.blob,
      transcription: recording.transcription,
      translation: recording.translation
    };
  }

  public dispose(): void {
    this.cleanup();
    this.audioConverter.dispose();
    if (this.offlineTranscriptionManager) {
      this.offlineTranscriptionManager.stopProcessing();
    }
  }
} 