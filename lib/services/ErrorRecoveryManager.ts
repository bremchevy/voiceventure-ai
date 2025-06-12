import { Platform } from '../utils/platform'

export interface ErrorContext {
  errorType: 'audio' | 'processing' | 'device' | 'network' | 'transcription' | 'translation' | 'unknown'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  timestamp: number
  retryCount: number
  metadata?: Record<string, any>
}

export interface RecoveryStrategy {
  maxRetries: number
  backoffMs: number
  timeout: number
  cleanup?: () => Promise<void>
  recover: () => Promise<boolean>
}

export class ErrorRecoveryManager {
  private readonly MAX_RETRY_ATTEMPTS = 3
  private readonly BACKOFF_BASE_MS = 1000
  private readonly ERROR_HISTORY_SIZE = 50
  private readonly platform: Platform
  private errorHistory: ErrorContext[] = []
  private activeRecoveries = new Map<string, RecoveryStrategy>()
  private recoveryTimeouts = new Map<string, NodeJS.Timeout>()

  constructor(platform: Platform) {
    this.platform = platform
  }

  public async handleError(context: ErrorContext): Promise<boolean> {
    this.recordError(context)

    // Check if we're already trying to recover from this type of error
    const existingRecovery = this.activeRecoveries.get(context.errorType)
    if (existingRecovery) {
      return this.continueRecovery(context, existingRecovery)
    }

    // Create new recovery strategy
    const strategy = this.createRecoveryStrategy(context)
    this.activeRecoveries.set(context.errorType, strategy)

    // Set recovery timeout
    this.setRecoveryTimeout(context.errorType, strategy.timeout)

    return this.executeRecovery(context, strategy)
  }

  private recordError(error: ErrorContext): void {
    this.errorHistory.push(error)
    if (this.errorHistory.length > this.ERROR_HISTORY_SIZE) {
      this.errorHistory.shift()
    }
  }

  private async continueRecovery(
    context: ErrorContext,
    strategy: RecoveryStrategy
  ): Promise<boolean> {
    if (context.retryCount >= strategy.maxRetries) {
      await this.handleRecoveryFailure(context)
      return false
    }

    // Exponential backoff
    const backoffTime = strategy.backoffMs * Math.pow(2, context.retryCount)
    await new Promise(resolve => setTimeout(resolve, backoffTime))

    return strategy.recover()
  }

  private createRecoveryStrategy(context: ErrorContext): RecoveryStrategy {
    switch (context.errorType) {
      case 'audio':
        return this.createAudioRecoveryStrategy(context)
      case 'processing':
        return this.createProcessingRecoveryStrategy(context)
      case 'device':
        return this.createDeviceRecoveryStrategy(context)
      case 'network':
        return this.createNetworkRecoveryStrategy(context)
      default:
        return this.createDefaultRecoveryStrategy(context)
    }
  }

  private createAudioRecoveryStrategy(context: ErrorContext): RecoveryStrategy {
    return {
      maxRetries: 3,
      backoffMs: this.BACKOFF_BASE_MS,
      timeout: 10000,
      cleanup: async () => {
        // Release audio resources
        const stream = context.metadata?.stream as MediaStream
        if (stream) {
          stream.getTracks().forEach(track => track.stop())
        }
      },
      recover: async () => {
        try {
          // Request new audio permissions
          const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: context.metadata?.constraints || true 
          })
          return !!stream
        } catch {
          return false
        }
      }
    }
  }

  private createProcessingRecoveryStrategy(context: ErrorContext): RecoveryStrategy {
    return {
      maxRetries: 2,
      backoffMs: this.BACKOFF_BASE_MS,
      timeout: 5000,
      recover: async () => {
        try {
          // Attempt to recreate processing nodes
          const audioContext = context.metadata?.audioContext as AudioContext
          if (audioContext) {
            if (audioContext.state === 'suspended') {
              await audioContext.resume()
            }
            return audioContext.state === 'running'
          }
          return false
        } catch {
          return false
        }
      }
    }
  }

  private createDeviceRecoveryStrategy(context: ErrorContext): RecoveryStrategy {
    return {
      maxRetries: 1,
      backoffMs: this.BACKOFF_BASE_MS * 2,
      timeout: 15000,
      recover: async () => {
        try {
          // Check device capabilities again
          const devices = await navigator.mediaDevices.enumerateDevices()
          const hasAudioInput = devices.some(device => device.kind === 'audioinput')
          return hasAudioInput
        } catch {
          return false
        }
      }
    }
  }

  private createNetworkRecoveryStrategy(context: ErrorContext): RecoveryStrategy {
    return {
      maxRetries: 3,
      backoffMs: this.BACKOFF_BASE_MS,
      timeout: 30000,
      recover: async () => {
        try {
          // Check network connectivity
          const response = await fetch('/api/health-check')
          return response.ok
        } catch {
          return false
        }
      }
    }
  }

  private createDefaultRecoveryStrategy(context: ErrorContext): RecoveryStrategy {
    return {
      maxRetries: 1,
      backoffMs: this.BACKOFF_BASE_MS,
      timeout: 5000,
      recover: async () => {
        // Basic recovery: wait and retry
        await new Promise(resolve => setTimeout(resolve, 1000))
        return true
      }
    }
  }

  private setRecoveryTimeout(errorType: string, timeout: number): void {
    const existingTimeout = this.recoveryTimeouts.get(errorType)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    const timeoutId = setTimeout(() => {
      this.handleRecoveryTimeout(errorType)
    }, timeout)

    this.recoveryTimeouts.set(errorType, timeoutId)
  }

  private async handleRecoveryTimeout(errorType: string): Promise<void> {
    const strategy = this.activeRecoveries.get(errorType)
    if (strategy?.cleanup) {
      await strategy.cleanup()
    }

    this.activeRecoveries.delete(errorType)
    this.recoveryTimeouts.delete(errorType)
  }

  private async handleRecoveryFailure(context: ErrorContext): Promise<void> {
    // Clean up resources
    const strategy = this.activeRecoveries.get(context.errorType)
    if (strategy?.cleanup) {
      await strategy.cleanup()
    }

    // Remove recovery attempts
    this.activeRecoveries.delete(context.errorType)
    
    const timeoutId = this.recoveryTimeouts.get(context.errorType)
    if (timeoutId) {
      clearTimeout(timeoutId)
      this.recoveryTimeouts.delete(context.errorType)
    }

    // Log failure
    console.error(`Recovery failed for ${context.errorType} error after ${context.retryCount} attempts`)
  }

  public getErrorHistory(): ErrorContext[] {
    return [...this.errorHistory]
  }

  public clearErrorHistory(): void {
    this.errorHistory = []
  }

  public async cleanup(): Promise<void> {
    // Clean up all active recoveries
    for (const [errorType, strategy] of this.activeRecoveries.entries()) {
      if (strategy.cleanup) {
        await strategy.cleanup()
      }
      this.activeRecoveries.delete(errorType)
    }

    // Clear all timeouts
    for (const [errorType, timeoutId] of this.recoveryTimeouts.entries()) {
      clearTimeout(timeoutId)
      this.recoveryTimeouts.delete(errorType)
    }

    this.clearErrorHistory()
  }
} 