import { WhisperConfig } from './voice-recording'

interface TranscriptionCallbacks {
  onPartialTranscript?: (text: string) => void
  onFinalTranscript?: (text: string) => void
  onError?: (error: Error) => void
}

export class StreamingTranscriptionService {
  private socket: WebSocket | null = null
  private audioContext: AudioContext | null = null
  private mediaRecorder: MediaRecorder | null = null
  private processingStream: MediaStreamAudioDestinationNode | null = null
  private config: WhisperConfig
  private openAIKey: string
  private callbacks: TranscriptionCallbacks = {}
  private isProcessing: boolean = false
  private audioChunks: Blob[] = []
  private transcriptionBuffer: string = ''
  private retryCount: number = 0
  private maxRetries: number = 3

  constructor(openAIKey: string, config: Partial<WhisperConfig> = {}) {
    this.openAIKey = openAIKey
    this.config = {
      model: 'base',
      language: 'en',
      task: 'transcribe',
      ...config
    }
  }

  async startStream(stream: MediaStream, callbacks: TranscriptionCallbacks = {}) {
    this.callbacks = callbacks
    this.isProcessing = true
    this.audioChunks = []
    this.transcriptionBuffer = ''

    try {
      await this.initializeAudioContext(stream)
      this.initializeWebSocket()
      this.startRecording()
    } catch (error) {
      this.handleError(error as Error)
    }
  }

  private async initializeAudioContext(stream: MediaStream) {
    // Create audio context and processing nodes
    this.audioContext = new AudioContext({
      sampleRate: 16000, // Whisper works best with 16kHz audio
      latencyHint: 'interactive'
    })

    // Create processing stream for real-time audio
    this.processingStream = this.audioContext.createMediaStreamDestination()

    // Connect input stream to processing
    const source = this.audioContext.createMediaStreamSource(stream)
    
    // Add a script processor to handle audio chunks
    const bufferSize = 4096
    const processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1)
    
    processor.onaudioprocess = (e) => {
      if (this.isProcessing && this.socket?.readyState === WebSocket.OPEN) {
        // Get audio data from input channel
        const inputData = e.inputBuffer.getChannelData(0)
        
        // Convert to 16-bit PCM
        const pcmData = this.convertToPCM(inputData)
        
        // Send audio data through WebSocket
        this.socket.send(pcmData.buffer)
      }
    }

    // Connect the processing chain
    source.connect(processor)
    processor.connect(this.processingStream)
  }

  private initializeWebSocket() {
    // Connect to Whisper API via WebSocket
    this.socket = new WebSocket('wss://api.openai.com/v1/audio/transcriptions')

    // Add authentication header
    this.socket.onopen = () => {
      if (this.socket) {
        this.socket.send(JSON.stringify({
          authorization: `Bearer ${this.openAIKey}`,
          model: 'whisper-1',
          language: this.config.language,
          task: this.config.task
        }))
      }
    }

    this.socket.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data)
        
        if (response.type === 'partial') {
          this.transcriptionBuffer = response.text
          this.callbacks.onPartialTranscript?.(response.text)
        } else if (response.type === 'final') {
          const finalText = response.text
          this.transcriptionBuffer = ''
          this.callbacks.onFinalTranscript?.(finalText)
        }
      } catch (error) {
        console.error('Error parsing transcription response:', error)
      }
    }

    this.socket.onerror = (error) => {
      this.handleError(new Error('WebSocket error: ' + error.toString()))
    }

    this.socket.onclose = () => {
      if (this.isProcessing && this.retryCount < this.maxRetries) {
        // Attempt to reconnect
        this.retryCount++
        setTimeout(() => this.initializeWebSocket(), 1000 * this.retryCount)
      }
    }
  }

  private startRecording() {
    if (!this.processingStream) return

    this.mediaRecorder = new MediaRecorder(this.processingStream.stream)
    
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data)
      }
    }

    this.mediaRecorder.start(250) // Collect data every 250ms
  }

  stopStream() {
    this.isProcessing = false
    this.retryCount = 0

    // Stop recording
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop()
    }

    // Close WebSocket
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }

    // Clean up audio context
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    this.processingStream = null
    this.mediaRecorder = null
  }

  private convertToPCM(float32Array: Float32Array): Int16Array {
    const pcmData = new Int16Array(float32Array.length)
    
    for (let i = 0; i < float32Array.length; i++) {
      // Convert float32 to int16
      const s = Math.max(-1, Math.min(1, float32Array[i]))
      pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
    }
    
    return pcmData
  }

  private handleError(error: Error) {
    console.error('Streaming transcription error:', error)
    this.callbacks.onError?.(error)
    this.stopStream()
  }

  get isActive(): boolean {
    return this.isProcessing
  }

  get currentTranscript(): string {
    return this.transcriptionBuffer
  }
} 