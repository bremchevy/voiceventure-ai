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
  private noiseGate: number = -50 // dB threshold for noise gate
  private vadTimeout: number = 1500 // ms of silence before stopping
  private lastVoiceActivity: number = 0

  constructor(openAIKey: string, config: Partial<WhisperConfig> = {}) {
    this.openAIKey = openAIKey
    this.config = {
      model: 'medium', // Use medium model for better accuracy
      language: 'auto', // Auto language detection
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
    this.audioContext = new AudioContext({
      sampleRate: 16000,
      latencyHint: 'interactive'
    })

    // Create audio processing chain
    const source = this.audioContext.createMediaStreamSource(stream)
    
    // Create dynamics compressor for better audio levels
    const compressor = this.audioContext.createDynamicsCompressor()
    compressor.threshold.value = -24
    compressor.knee.value = 30
    compressor.ratio.value = 12
    compressor.attack.value = 0.003
    compressor.release.value = 0.25
    
    // Create noise gate
    const gainNode = this.audioContext.createGain()
    
    // Create analyzer for VAD
    const analyzer = this.audioContext.createAnalyser()
    analyzer.fftSize = 2048
    
    // Create processing node
    const processor = this.audioContext.createScriptProcessor(4096, 1, 1)
    
    // Connect the audio processing chain
    source
      .connect(compressor)
      .connect(gainNode)
      .connect(analyzer)
      .connect(processor)
      .connect(this.audioContext.destination)

    const bufferLength = analyzer.frequencyBinCount
    const dataArray = new Float32Array(bufferLength)

    processor.onaudioprocess = (e) => {
      if (!this.isProcessing) return

      // Get audio data
      analyzer.getFloatFrequencyData(dataArray)
      
      // Calculate RMS value for VAD
      const rms = Math.sqrt(dataArray.reduce((acc, val) => acc + (val * val), 0) / bufferLength)
      
      // Apply noise gate
      if (rms > this.noiseGate) {
        this.lastVoiceActivity = Date.now()
        gainNode.gain.value = 1
      } else {
        gainNode.gain.value = 0
        
        // Check for silence timeout
        if (Date.now() - this.lastVoiceActivity > this.vadTimeout) {
          this.callbacks.onPartialTranscript?.('')
          return
        }
      }

      // Send processed audio data
      if (this.socket?.readyState === WebSocket.OPEN) {
        const inputData = e.inputBuffer.getChannelData(0)
        const pcmData = this.convertToPCM(inputData)
        this.socket.send(pcmData.buffer)
      }
    }
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