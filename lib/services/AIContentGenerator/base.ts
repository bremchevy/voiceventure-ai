import OpenAI from 'openai';
import { createAIClient, validateEnvironment, AIServiceError, getErrorDetails } from './config';

export interface GenerationOptions {
  prompt: string | Record<string, any>;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
  hasCustomInstructions?: boolean;
}

export interface GenerationResult {
  title?: string;
  instructions?: string;
  content?: string;
  problems?: any[];
  [key: string]: any;
}

export class BaseAIContentGenerator {
  protected client: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }

    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: 3,
      timeout: 60000 // Increased timeout for larger responses
    });
  }

  protected async generateContent(options: GenerationOptions): Promise<string> {
    try {
      const mergedOptions = {
        model: 'gpt-3.5-turbo',
        maxTokens: 2000, // Adjusted for GPT-3.5 Turbo's typical response length
        temperature: 0.7,
        timeout: 60000,
        hasCustomInstructions: false,
        ...options
      };

      const enhancedPrompt = typeof options.prompt === 'string' 
        ? options.prompt 
        : JSON.stringify(options.prompt);

      console.log('🔄 Making API request with model:', mergedOptions.model);
      
      const response = await this.client.chat.completions.create({
        model: mergedOptions.model,
        messages: [
          {
            role: "system",
            content: "You are an expert educational content creator. Always return valid JSON responses that exactly match the requested format and number of items. Never return partial or incomplete responses."
          },
          {
            role: "user",
            content: enhancedPrompt
          }
        ],
        temperature: mergedOptions.temperature,
        max_tokens: mergedOptions.maxTokens,
        response_format: { type: "json_object" } // Enforce JSON response
      });

      if (!response.choices?.[0]?.message?.content) {
        throw new Error('No content generated from OpenAI API');
      }

      return response.choices[0].message.content;
    } catch (error: any) {
      console.error('Error generating content:', error);
      
      // Handle specific OpenAI API errors
      if (error?.status === 429) {
        throw new AIServiceError('Rate limit exceeded. Please try again later.', 'rate_limit_error');
      }
      
      if (error?.status === 401) {
        throw new AIServiceError('Invalid API key. Please check your OpenAI API key.', 'auth_error');
      }

      if (error?.status === 400) {
        throw new AIServiceError('Invalid request to OpenAI API. Please check your inputs.', 'invalid_request');
      }

      // Handle network/connection errors
      if (error?.code === 'ECONNREFUSED' || error?.code === 'ECONNRESET' || error?.code === 'ETIMEDOUT') {
        throw new AIServiceError('Connection error. Please check your internet connection.', 'connection_error');
      }

      // Generic error handling
      const message = error?.message || 'An unexpected error occurred';
      const code = error?.code || 'unknown_error';
      throw new AIServiceError(message, code);
    }
  }

  protected async validatePrompt(prompt: string): Promise<void> {
    if (!prompt || prompt.trim().length === 0) {
      throw new AIServiceError('Prompt cannot be empty', 'INVALID_PROMPT');
    }
  }

  protected async enhancePrompt(prompt: string, context: any = {}): Promise<string> {
    return prompt;
  }
} 