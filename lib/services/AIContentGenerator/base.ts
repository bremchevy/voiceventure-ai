import OpenAI from 'openai';
import { createAIClient, validateEnvironment, AIServiceError, getErrorDetails } from './config';

export interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
  stream?: boolean;
  timeout?: number;
  customInstructions?: string;
}

export interface GenerationResult {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class BaseAIContentGenerator {
  protected client: OpenAI;
  protected defaultOptions: GenerationOptions = {
    temperature: 0.7,
    maxTokens: 2000,
    model: 'gpt-3.5-turbo',
    stream: false,
    timeout: 30000,
  };

  constructor() {
    validateEnvironment();
    this.client = createAIClient({ 
      apiKey: process.env.OPENAI_API_KEY!,
      timeout: this.defaultOptions.timeout,
      maxRetries: 2
    });
  }

  protected async generateContent(
    prompt: string,
    options: GenerationOptions = {}
  ): Promise<GenerationResult> {
    try {
      const mergedOptions = { ...this.defaultOptions, ...options };
      
      console.log('🤖 Generating content with options:', {
        model: mergedOptions.model,
        maxTokens: mergedOptions.maxTokens,
        temperature: mergedOptions.temperature,
        timeout: mergedOptions.timeout,
        hasCustomInstructions: !!mergedOptions.customInstructions
      });

      // Add custom instructions to the prompt if provided
      const enhancedPrompt = mergedOptions.customInstructions 
        ? `${prompt}\n\nCustom Requirements:\n${mergedOptions.customInstructions}`
        : prompt;

      const response = await this.client.chat.completions.create({
        model: mergedOptions.model!,
        messages: [{ role: 'user', content: enhancedPrompt }],
        temperature: mergedOptions.temperature,
        max_tokens: mergedOptions.maxTokens,
        stream: mergedOptions.stream,
      });

      if (mergedOptions.stream) {
        throw new AIServiceError('Streaming not implemented in base generator');
      }

      console.log('✅ Content generated successfully');

      return {
        content: response.choices[0].message.content || '',
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      console.error('❌ Error generating content:', error);
      
      if (error instanceof AIServiceError) {
        throw error;
      }

      const errorDetails = getErrorDetails(error);
      throw new AIServiceError(errorDetails.message, errorDetails.code);
    }
  }

  protected async validatePrompt(prompt: string): Promise<void> {
    if (!prompt || prompt.trim().length === 0) {
      throw new AIServiceError('Prompt cannot be empty', 'INVALID_PROMPT');
    }
  }

  protected async enhancePrompt(prompt: string, context: any = {}): Promise<string> {
    // Base implementation - can be overridden by subject-specific generators
    return prompt;
  }
} 