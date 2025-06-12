import { WhisperConfig } from './ConfigurationService';
import { AudioProcessor } from './AudioProcessor';

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
  private audioProcessor: AudioProcessor;

  constructor(apiKey: string, config: WhisperConfig) {
    this.apiKey = apiKey;
    this.apiEndpoint = 'https://api.openai.com/v1/audio';
    this.config = config;
    this.audioProcessor = new AudioProcessor();
  }

  private async preprocessAudio(audioBlob: Blob): Promise<Blob> {
    // Convert to optimal format for Whisper (16kHz mono WAV)
    const processedBlob = await this.audioProcessor.process(audioBlob, {
      sampleRate: 16000,
      channels: 1,
      format: 'wav',
      normalize: true, // Normalize audio levels
      removeSilence: true, // Remove silence for better accuracy
      denoise: true // Apply noise reduction
    });
    return processedBlob;
  }

  public async transcribe(audioBlob: Blob): Promise<TranscriptionResult> {
    // Preprocess audio for optimal results
    const processedBlob = await this.preprocessAudio(audioBlob);
    
    const formData = new FormData();
    formData.append('file', processedBlob, 'audio.wav');
    formData.append('model', `whisper-${this.config.model}`);
    formData.append('language', this.config.language);
    formData.append('response_format', 'verbose_json');
    
    // Add timestamp tokens for better segmentation
    formData.append('timestamp_granularities', ['word', 'segment']);
    
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