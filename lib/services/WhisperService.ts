import { WhisperConfig } from './ConfigurationService';

export interface TranscriptionResult {
  text: string;
  segments: Array<{
    text: string;
    start: number;
    end: number;
    confidence: number;
  }>;
  language: string;
}

export interface TranslationResult extends TranscriptionResult {
  originalText: string;
  originalLanguage: string;
}

export class WhisperService {
  private apiKey: string;
  private apiEndpoint: string;
  private config: WhisperConfig;

  constructor(apiKey: string, config: WhisperConfig) {
    this.apiKey = apiKey;
    this.apiEndpoint = 'https://api.openai.com/v1/audio';
    this.config = config;
  }

  public async transcribe(audioBlob: Blob): Promise<TranscriptionResult> {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', `whisper-${this.config.model}`);
    formData.append('language', this.config.language);
    formData.append('response_format', 'verbose_json');

    try {
      const response = await fetch(`${this.apiEndpoint}/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.statusText}`);
      }

      const result = await response.json();
      return this.formatTranscriptionResult(result);
    } catch (error) {
      console.error('Transcription error:', error);
      throw error;
    }
  }

  public async translate(audioBlob: Blob): Promise<TranslationResult> {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', `whisper-${this.config.model}`);
    formData.append('response_format', 'verbose_json');

    try {
      const response = await fetch(`${this.apiEndpoint}/translations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Translation failed: ${response.statusText}`);
      }

      const result = await response.json();
      return this.formatTranslationResult(result);
    } catch (error) {
      console.error('Translation error:', error);
      throw error;
    }
  }

  private formatTranscriptionResult(apiResponse: any): TranscriptionResult {
    return {
      text: apiResponse.text,
      segments: apiResponse.segments.map((segment: any) => ({
        text: segment.text,
        start: segment.start,
        end: segment.end,
        confidence: segment.confidence
      })),
      language: apiResponse.language
    };
  }

  private formatTranslationResult(apiResponse: any): TranslationResult {
    return {
      ...this.formatTranscriptionResult(apiResponse),
      originalText: apiResponse.original_text,
      originalLanguage: apiResponse.original_language
    };
  }

  public updateConfig(config: Partial<WhisperConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public getConfig(): WhisperConfig {
    return { ...this.config };
  }
} 