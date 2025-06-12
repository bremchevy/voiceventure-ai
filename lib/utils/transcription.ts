import OpenAI from 'openai'

export interface WhisperConfig {
  model: 'base' | 'small' | 'medium' | 'large';
  language?: string;
  task: 'transcribe' | 'translate';
  temperature?: number;
  prompt?: string;
  response_format?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
}

export class TranscriptionService {
  private openai: OpenAI
  private config: WhisperConfig

  constructor(apiKey: string, config: Partial<WhisperConfig> = {}) {
    this.openai = new OpenAI({ apiKey })
    this.config = {
      model: 'base',
      language: 'en',
      task: 'transcribe',
      temperature: 0,  // Default to most accurate
      response_format: 'text',
      ...config
    }
  }

  async transcribe(audioBlob: Blob, options: Partial<WhisperConfig> = {}): Promise<string> {
    // Convert blob to File object
    const file = new File([audioBlob], 'audio.wav', { type: 'audio/wav' })

    try {
      const response = await this.openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        language: options.language || this.config.language,
        temperature: options.temperature || this.config.temperature,
        prompt: options.prompt,  // Context prompt to improve accuracy
        response_format: (options.response_format || this.config.response_format) as 'text'
      })

      return response
    } catch (error) {
      console.error('Transcription error:', error)
      throw error
    }
  }

  async translate(audioBlob: Blob): Promise<string> {
    if (this.config.task !== 'translate') {
      throw new Error('Translation is not enabled in the current configuration')
    }

    const file = new File([audioBlob], 'audio.wav', { type: 'audio/wav' })

    try {
      const response = await this.openai.audio.translations.create({
        file,
        model: 'whisper-1',
        response_format: 'text'
      })

      return response
    } catch (error) {
      console.error('Translation error:', error)
      throw error
    }
  }
} 