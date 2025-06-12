import OpenAI from 'openai'
import { WhisperConfig } from './voice-recording'

export class TranscriptionService {
  private openai: OpenAI
  private config: WhisperConfig

  constructor(apiKey: string, config: Partial<WhisperConfig> = {}) {
    this.openai = new OpenAI({ apiKey })
    this.config = {
      model: 'base',
      language: 'en',
      task: 'transcribe',
      ...config
    }
  }

  async transcribe(audioBlob: Blob): Promise<string> {
    // Convert blob to File object
    const file = new File([audioBlob], 'audio.wav', { type: 'audio/wav' })

    try {
      const response = await this.openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        language: this.config.language,
        response_format: 'text'
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