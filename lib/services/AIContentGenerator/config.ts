import OpenAI from 'openai';

// Types for our configuration
export interface AIConfig {
  apiKey: string;
  organization?: string;
  maxRetries?: number;
  timeout?: number;
}

// Error class for AI-related errors
export class AIServiceError extends Error {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

// Initialize OpenAI client with error handling
export function createAIClient(config: AIConfig): OpenAI {
  if (!config.apiKey) {
    throw new AIServiceError('OpenAI API key is required', 'MISSING_API_KEY');
  }

  return new OpenAI({
    apiKey: config.apiKey,
    organization: config.organization,
    maxRetries: config.maxRetries ?? 3,
    timeout: config.timeout ?? 30000,
  });
}

// Validate environment variables
export function validateEnvironment(): void {
  if (!process.env.OPENAI_API_KEY) {
    throw new AIServiceError('OPENAI_API_KEY is not set', 'MISSING_API_KEY');
  }
}

// Error type guards
export function isTimeoutError(error: any): boolean {
  return error.code === 'ETIMEDOUT' || 
         error.code === 'ECONNABORTED' ||
         error.message?.includes('timeout') ||
         error.message?.includes('Request timed out');
}

export function isRateLimitError(error: any): boolean {
  return error.status === 429 || 
         error.message?.includes('rate limit');
}

export function getErrorDetails(error: any): { message: string; code?: string } {
  if (isTimeoutError(error)) {
    return {
      message: 'Request timed out. Please try again.',
      code: 'TIMEOUT'
    };
  }
  
  if (isRateLimitError(error)) {
    return {
      message: 'Rate limit exceeded. Please try again in a few moments.',
      code: 'RATE_LIMIT'
    };
  }

  return {
    message: error.message || 'An unknown error occurred',
    code: error.code
  };
} 