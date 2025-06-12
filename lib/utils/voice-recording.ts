import { createClient } from '@/lib/supabase/client'
import { TranscriptionService } from './transcription'
import { StreamingTranscriptionService } from './streaming-transcription'

export interface VoiceRecordingConfig {
  sampleRate: number
  channels: number
  quality: 'low' | 'medium' | 'high'
  maxDuration: number
  format: 'wav' | 'mp3'
}

export interface WhisperConfig {
  model: 'base' | 'small' | 'medium' | 'large'
  language: string
  task: 'transcribe' | 'translate'
}

export interface TranscriptionCallbacks {
  onPartialTranscript?: (text: string) => void
  onFinalTranscript?: (text: string) => void
  onError?: (error: Error) => void
}

export const DEFAULT_RECORDING_CONFIG: VoiceRecordingConfig = {
  sampleRate: 44100,
  channels: 1,
  quality: 'medium',
  maxDuration: 300, // 5 minutes
  format: 'wav'
}

export const DEFAULT_WHISPER_CONFIG: WhisperConfig = {
  model: 'base',
  language: 'en',
  task: 'transcribe'
}

class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private startTime: number = 0
  private config: VoiceRecordingConfig
  private stream: MediaStream | null = null

  constructor(config: Partial<VoiceRecordingConfig> = {}) {
    this.config = { ...DEFAULT_RECORDING_CONFIG, ...config }
  }

  async requestPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      this.stream = stream
      return true
    } catch (error) {
      console.error('Error requesting microphone permission:', error)
      return false
    }
  }

  async start(): Promise<void> {
    if (!this.stream) {
      const hasPermission = await this.requestPermission()
      if (!hasPermission) {
        throw new Error('Microphone permission denied')
      }
    }

    this.audioChunks = []
    this.startTime = Date.now()

    const options: MediaRecorderOptions = {
      mimeType: this.config.format === 'wav' ? 'audio/wav' : 'audio/mpeg',
    }

    try {
      this.mediaRecorder = new MediaRecorder(this.stream!, options)
    } catch (e) {
      // Fallback to default format if the preferred format is not supported
      this.mediaRecorder = new MediaRecorder(this.stream!)
    }

    this.mediaRecorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data)
      }
    })

    this.mediaRecorder.start()

    // Stop recording if max duration is reached
    if (this.config.maxDuration > 0) {
      setTimeout(() => {
        if (this.mediaRecorder?.state === 'recording') {
          this.stop()
        }
      }, this.config.maxDuration * 1000)
    }
  }

  async stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('Recording not started'))
        return
      }

      this.mediaRecorder.addEventListener('stop', () => {
        const duration = (Date.now() - this.startTime) / 1000
        const audioBlob = new Blob(this.audioChunks, {
          type: this.config.format === 'wav' ? 'audio/wav' : 'audio/mpeg'
        })
        this.cleanup()
        resolve(audioBlob)
      })

      this.mediaRecorder.stop()
    })
  }

  pause(): void {
    this.mediaRecorder?.pause()
  }

  resume(): void {
    this.mediaRecorder?.resume()
  }

  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null
    }
    this.mediaRecorder = null
    this.audioChunks = []
  }

  getDuration(): number {
    return this.startTime ? (Date.now() - this.startTime) / 1000 : 0
  }

  get config(): VoiceRecordingConfig {
    return this.config
  }
}

export class VoiceRecordingManager {
  private recorder: AudioRecorder
  private supabase = createClient()
  private offlineStorage: IDBDatabase | null = null
  private transcriptionService: TranscriptionService | null = null
  private streamingTranscription: StreamingTranscriptionService | null = null
  private transcriptionCallbacks: TranscriptionCallbacks = {}
  private currentStream: MediaStream | null = null

  constructor(
    config: Partial<VoiceRecordingConfig> = {},
    openAIKey?: string,
    whisperConfig?: Partial<WhisperConfig>
  ) {
    this.recorder = new AudioRecorder(config)
    this.initOfflineStorage()
    
    if (openAIKey) {
      this.transcriptionService = new TranscriptionService(openAIKey, whisperConfig)
      this.streamingTranscription = new StreamingTranscriptionService(openAIKey, whisperConfig)
    }
  }

  setTranscriptionCallbacks(callbacks: TranscriptionCallbacks) {
    this.transcriptionCallbacks = callbacks
  }

  private async initOfflineStorage() {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('voiceRecordings', 1)

      request.onerror = () => reject(request.error)

      request.onsuccess = () => {
        this.offlineStorage = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains('recordings')) {
          db.createObjectStore('recordings', { keyPath: 'id' })
        }
      }
    })
  }

  async startRecording(enableRealTimeTranscription: boolean = false): Promise<void> {
    await this.recorder.start()
    
    if (enableRealTimeTranscription && this.streamingTranscription) {
      try {
        // Get the current stream from the recorder
        this.currentStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        
        // Start streaming transcription
        await this.streamingTranscription.startStream(this.currentStream, {
          onPartialTranscript: (text) => {
            this.transcriptionCallbacks.onPartialTranscript?.(text)
          },
          onFinalTranscript: (text) => {
            this.transcriptionCallbacks.onFinalTranscript?.(text)
          },
          onError: (error) => {
            this.transcriptionCallbacks.onError?.(error)
          }
        })
      } catch (error) {
        console.error('Failed to start streaming transcription:', error)
        // Continue recording even if transcription fails
      }
    }
  }

  async stopRecording(): Promise<{ blob: Blob; duration: number }> {
    // Stop streaming transcription if active
    if (this.streamingTranscription?.isActive) {
      this.streamingTranscription.stopStream()
    }

    // Clean up media stream
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => track.stop())
      this.currentStream = null
    }

    const blob = await this.recorder.stop()
    const duration = this.recorder.getDuration()
    return { blob, duration }
  }

  pauseRecording(): void {
    this.recorder.pause()
    if (this.streamingTranscription?.isActive) {
      this.streamingTranscription.stopStream()
    }
  }

  resumeRecording(): void {
    this.recorder.resume()
    if (this.currentStream && this.streamingTranscription) {
      this.streamingTranscription.startStream(this.currentStream, this.transcriptionCallbacks)
    }
  }

  async uploadRecording(
    userId: string,
    blob: Blob,
    duration: number,
    isOnline: boolean = navigator.onLine
  ): Promise<string> {
    if (!isOnline) {
      return this.saveOffline(userId, blob, duration)
    }

    let transcription: string | undefined

    if (this.transcriptionService) {
      try {
        transcription = await this.transcriptionService.transcribe(blob)
      } catch (error) {
        console.error('Transcription failed:', error)
      }
    }

    const filename = `${userId}/${Date.now()}.${this.recorder.config.format}`
    const { data, error } = await this.supabase.storage
      .from('voice-recordings')
      .upload(filename, blob)

    if (error) {
      throw error
    }

    const { data: recordingData, error: dbError } = await this.supabase
      .from('voice_recordings')
      .insert([
        {
          user_id: userId,
          file_path: data.path,
          duration: Math.round(duration),
          transcription,
          metadata: {
            format: this.recorder.config.format,
            size: blob.size,
            type: blob.type
          }
        }
      ])
      .select()
      .single()

    if (dbError) {
      throw dbError
    }

    return recordingData.id
  }

  private async saveOffline(
    userId: string,
    blob: Blob,
    duration: number
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.offlineStorage) {
        reject(new Error('Offline storage not initialized'))
        return
      }

      const id = `offline_${Date.now()}`
      const transaction = this.offlineStorage.transaction(['recordings'], 'readwrite')
      const store = transaction.objectStore('recordings')

      const request = store.add({
        id,
        userId,
        blob,
        duration,
        timestamp: Date.now(),
        uploaded: false
      })

      request.onsuccess = () => resolve(id)
      request.onerror = () => reject(request.error)
    })
  }

  async syncOfflineRecordings(): Promise<void> {
    if (!this.offlineStorage || !navigator.onLine) return

    const transaction = this.offlineStorage.transaction(['recordings'], 'readwrite')
    const store = transaction.objectStore('recordings')
    const request = store.getAll()

    request.onsuccess = async () => {
      const recordings = request.result.filter(r => !r.uploaded)
      
      for (const recording of recordings) {
        try {
          await this.uploadRecording(
            recording.userId,
            recording.blob,
            recording.duration,
            true
          )
          
          // Mark as uploaded
          const updateTx = this.offlineStorage!.transaction(['recordings'], 'readwrite')
          const updateStore = updateTx.objectStore('recordings')
          updateStore.put({ ...recording, uploaded: true })
        } catch (error) {
          console.error('Error syncing offline recording:', error)
        }
      }
    }
  }
} 