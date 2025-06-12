export interface iOSConfig {
  audioSession: 'playAndRecord' | 'record' | 'multiRoute'
  category: 'ambient' | 'soloAmbient' | 'playback' | 'record'
  allowBluetoothInput: boolean
  defaultToSpeaker: boolean
  mixWithOthers: boolean
}

export interface AndroidConfig {
  audioSource: 'mic' | 'voiceRecognition' | 'camcorder'
  outputFormat: 'mpeg4' | 'aac' | 'ogg'
  audioEncoder: 'aac' | 'opus' | 'vorbis'
  noiseSuppression: boolean
  echoCancellation: boolean
  sampleRate: number
}

export interface PlatformConfig {
  ios: iOSConfig
  android: AndroidConfig
}

export const DEFAULT_IOS_CONFIG: iOSConfig = {
  audioSession: 'playAndRecord',
  category: 'record',
  allowBluetoothInput: true,
  defaultToSpeaker: false,
  mixWithOthers: false
}

export const DEFAULT_ANDROID_CONFIG: AndroidConfig = {
  audioSource: 'voiceRecognition',
  outputFormat: 'aac',
  audioEncoder: 'aac',
  noiseSuppression: true,
  echoCancellation: true,
  sampleRate: 44100
}

export const DEFAULT_PLATFORM_CONFIG: PlatformConfig = {
  ios: DEFAULT_IOS_CONFIG,
  android: DEFAULT_ANDROID_CONFIG
}

export type Platform = 'ios' | 'android' | 'web'

export function detectPlatform(): Platform {
  const userAgent = navigator.userAgent.toLowerCase()
  
  if (/iphone|ipad|ipod/.test(userAgent)) {
    return 'ios'
  }
  
  if (/android/.test(userAgent)) {
    return 'android'
  }
  
  return 'web'
}

export function isMobileDevice(): boolean {
  return detectPlatform() !== 'web'
}

export function getOptimalAudioConstraints(platform: Platform): MediaTrackConstraints {
  const base: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  }

  switch (platform) {
    case 'ios':
      return {
        ...base,
        // iOS-specific constraints
        sampleRate: 44100,
        channelCount: 1,
        // Use voice processing if available
        echoCancellation: { ideal: true },
        noiseSuppression: { ideal: true },
        autoGainControl: { ideal: true }
      }

    case 'android':
      return {
        ...base,
        // Android-specific constraints
        sampleRate: { ideal: 44100, min: 22050 },
        channelCount: { ideal: 1 },
        // Android typically has good built-in processing
        echoCancellation: { ideal: true },
        noiseSuppression: { ideal: true },
        autoGainControl: { ideal: true }
      }

    default:
      return base
  }
}

// Battery optimization utilities
export async function checkBatteryStatus(): Promise<{ level: number; charging: boolean } | null> {
  if ('getBattery' in navigator) {
    try {
      const battery = await (navigator as any).getBattery()
      return {
        level: battery.level,
        charging: battery.charging
      }
    } catch (error) {
      console.warn('Battery status not available:', error)
      return null
    }
  }
  return null
}

// Memory management utilities
export function checkMemoryStatus(): { totalJSHeapSize?: number; usedJSHeapSize?: number } {
  if ('memory' in performance) {
    const memory = (performance as any).memory
    return {
      totalJSHeapSize: memory.totalJSHeapSize,
      usedJSHeapSize: memory.usedJSHeapSize
    }
  }
  return {}
}

// Network condition check
export async function checkNetworkCondition(): Promise<{
  type: string
  downlink?: number
  rtt?: number
  effectiveType?: string
}> {
  if ('connection' in navigator) {
    const connection = (navigator as any).connection
    return {
      type: connection.type,
      downlink: connection.downlink,
      rtt: connection.rtt,
      effectiveType: connection.effectiveType
    }
  }
  return { type: 'unknown' }
}

// Device capability check
export async function checkDeviceCapabilities(): Promise<{
  hasGetUserMedia: boolean
  hasAudioContext: boolean
  hasWebSocket: boolean
  hasIndexedDB: boolean
}> {
  return {
    hasGetUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    hasAudioContext: 'AudioContext' in window || 'webkitAudioContext' in window,
    hasWebSocket: 'WebSocket' in window,
    hasIndexedDB: 'indexedDB' in window
  }
} 