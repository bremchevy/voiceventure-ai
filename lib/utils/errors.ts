export enum ErrorCodes {
  // Authentication errors
  AUTH_NOT_AUTHENTICATED = 'AUTH_NOT_AUTHENTICATED',
  AUTH_INVALID_TOKEN = 'AUTH_INVALID_TOKEN',

  // Voice recording errors
  VOICE_RECORDING_PERMISSION_DENIED = 'VOICE_RECORDING_PERMISSION_DENIED',
  VOICE_RECORDING_NOT_SUPPORTED = 'VOICE_RECORDING_NOT_SUPPORTED',
  VOICE_RECORDING_FAILED = 'VOICE_RECORDING_FAILED',
  VOICE_RECORDING_UPLOAD_FAILED = 'VOICE_RECORDING_UPLOAD_FAILED',
  VOICE_RECORDING_NOT_STARTED = 'VOICE_RECORDING_NOT_STARTED',

  // General errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

const ERROR_MESSAGES: Record<ErrorCodes, string> = {
  [ErrorCodes.AUTH_NOT_AUTHENTICATED]: 'You must be logged in to perform this action',
  [ErrorCodes.AUTH_INVALID_TOKEN]: 'Your session has expired. Please log in again',
  
  [ErrorCodes.VOICE_RECORDING_PERMISSION_DENIED]: 'Microphone access was denied. Please enable microphone access in your browser settings',
  [ErrorCodes.VOICE_RECORDING_NOT_SUPPORTED]: 'Voice recording is not supported in your browser',
  [ErrorCodes.VOICE_RECORDING_FAILED]: 'Failed to record audio. Please try again',
  [ErrorCodes.VOICE_RECORDING_UPLOAD_FAILED]: 'Failed to upload recording. Please try again',
  [ErrorCodes.VOICE_RECORDING_NOT_STARTED]: 'Recording has not been started',
  
  [ErrorCodes.NETWORK_ERROR]: 'Network error. Please check your internet connection',
  [ErrorCodes.UNKNOWN_ERROR]: 'An unknown error occurred. Please try again'
}

export interface AppError extends Error {
  code: ErrorCodes
}

export function createError(code: ErrorCodes, message?: string): AppError {
  const error = new Error(message || ERROR_MESSAGES[code]) as AppError
  error.code = code
  return error
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof Error && 'code' in error
}

export function getErrorMessage(error: unknown): string {
  if (isAppError(error)) {
    return error.message || ERROR_MESSAGES[error.code]
  }
  
  if (error instanceof Error) {
    return error.message
  }
  
  return ERROR_MESSAGES[ErrorCodes.UNKNOWN_ERROR]
} 