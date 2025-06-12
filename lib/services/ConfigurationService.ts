import { z } from 'zod'

// Configuration Schemas
export const VoiceRecordingConfigSchema = z.object({
  sampleRate: z.number().int().min(8000).max(48000).default(44100),
  channels: z.number().int().min(1).max(2).default(1),
  quality: z.enum(['low', 'medium', 'high']).default('medium'),
  maxDuration: z.number().int().min(1).max(3600).default(300), // 5 minutes default
  format: z.enum(['wav', 'mp3', 'webm']).default('webm')
})

export const WhisperConfigSchema = z.object({
  // Use medium model by default for better accuracy
  model: z.enum(['base', 'small', 'medium', 'large']).default('medium'),
  
  // Language detection with fallback
  language: z.string().min(2).max(5).default('auto'),
  
  // Task type
  task: z.enum(['transcribe', 'translate']).default('transcribe'),
  
  // Additional options for better accuracy
  temperature: z.number().min(0).max(1).default(0.2), // Slight variation for better natural language understanding
  prompt: z.string().optional(), // Context prompt for domain-specific terms
  
  // Audio preprocessing options
  audioOptions: z.object({
    removeSilence: z.boolean().default(true),
    denoise: z.boolean().default(true),
    normalize: z.boolean().default(true),
    enhanceSpeech: z.boolean().default(true)
  }).default({}),
  
  // Response format options
  response_format: z.enum(['json', 'text', 'srt', 'verbose_json', 'vtt']).default('verbose_json'),
  
  // Timestamp options for better segmentation
  timestamp_granularities: z.array(z.enum(['word', 'segment'])).default(['word', 'segment'])
})

// Configuration Types
export type VoiceRecordingConfig = z.infer<typeof VoiceRecordingConfigSchema>
export type WhisperConfig = z.infer<typeof WhisperConfigSchema>

export interface ConfigurationOptions {
  persistKey?: string
  storage?: 'local' | 'session'
}

export class ConfigurationService {
  private voiceConfig: VoiceRecordingConfig
  private whisperConfig: WhisperConfig
  private readonly persistKey: string
  private readonly storage: Storage

  constructor(options: ConfigurationOptions = {}) {
    this.persistKey = options.persistKey || 'voice_recorder_config'
    this.storage = options.storage === 'session' ? sessionStorage : localStorage

    // Load or initialize configurations
    const savedConfig = this.loadPersistedConfig()
    
    if (savedConfig) {
      this.voiceConfig = VoiceRecordingConfigSchema.parse(savedConfig.voice)
      this.whisperConfig = WhisperConfigSchema.parse(savedConfig.whisper)
    } else {
      this.voiceConfig = this.getDefaultVoiceConfig()
      this.whisperConfig = this.getDefaultWhisperConfig()
      this.persistConfig()
    }
  }

  private getDefaultVoiceConfig(): VoiceRecordingConfig {
    return VoiceRecordingConfigSchema.parse({})
  }

  private getDefaultWhisperConfig(): WhisperConfig {
    return WhisperConfigSchema.parse({})
  }

  private loadPersistedConfig(): { voice: VoiceRecordingConfig; whisper: WhisperConfig } | null {
    try {
      const saved = this.storage.getItem(this.persistKey)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  }

  private persistConfig(): void {
    try {
      this.storage.setItem(this.persistKey, JSON.stringify({
        voice: this.voiceConfig,
        whisper: this.whisperConfig
      }))
    } catch (error) {
      console.error('Failed to persist configuration:', error)
    }
  }

  public updateVoiceConfig(config: Partial<VoiceRecordingConfig>): VoiceRecordingConfig {
    try {
      // Merge and validate new configuration
      const newConfig = VoiceRecordingConfigSchema.parse({
        ...this.voiceConfig,
        ...config
      })

      // Update if validation passes
      this.voiceConfig = newConfig
      this.persistConfig()

      return this.voiceConfig
    } catch (error) {
      throw new Error(`Invalid voice recording configuration: ${error.message}`)
    }
  }

  public updateWhisperConfig(config: Partial<WhisperConfig>): WhisperConfig {
    try {
      // Merge and validate new configuration
      const newConfig = WhisperConfigSchema.parse({
        ...this.whisperConfig,
        ...config
      })

      // Update if validation passes
      this.whisperConfig = newConfig
      this.persistConfig()

      return this.whisperConfig
    } catch (error) {
      throw new Error(`Invalid Whisper configuration: ${error.message}`)
    }
  }

  public getVoiceConfig(): VoiceRecordingConfig {
    return { ...this.voiceConfig }
  }

  public getWhisperConfig(): WhisperConfig {
    return { ...this.whisperConfig }
  }

  public validateVoiceConfig(config: Partial<VoiceRecordingConfig>): boolean {
    try {
      VoiceRecordingConfigSchema.parse(config)
      return true
    } catch {
      return false
    }
  }

  public validateWhisperConfig(config: Partial<WhisperConfig>): boolean {
    try {
      WhisperConfigSchema.parse(config)
      return true
    } catch {
      return false
    }
  }

  public reset(): void {
    this.voiceConfig = this.getDefaultVoiceConfig()
    this.whisperConfig = this.getDefaultWhisperConfig()
    this.persistConfig()
  }

  public exportConfig(): string {
    return JSON.stringify({
      voice: this.voiceConfig,
      whisper: this.whisperConfig
    }, null, 2)
  }

  public importConfig(configStr: string): void {
    try {
      const config = JSON.parse(configStr)
      this.voiceConfig = VoiceRecordingConfigSchema.parse(config.voice)
      this.whisperConfig = WhisperConfigSchema.parse(config.whisper)
      this.persistConfig()
    } catch (error) {
      throw new Error(`Invalid configuration format: ${error.message}`)
    }
  }
} 