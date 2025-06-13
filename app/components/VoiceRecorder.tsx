'use client'

import { useState, useEffect } from 'react'
import { useVoiceRecording } from '@/lib/hooks/use-voice-recording'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mic, MicOff, Pause, Play, Square, Type, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

interface VoiceRecorderProps {
  onRecordingComplete?: (recordingId: string, transcription?: string) => void
  className?: string
  openAIKey?: string
  whisperConfig?: {
    model?: 'base' | 'small' | 'medium' | 'large'
    language?: string
    temperature?: number
    prompt?: string
  }
}

export function VoiceRecorder({
  onRecordingComplete,
  className,
  openAIKey,
  whisperConfig
}: VoiceRecorderProps) {
  const [transcriptionEnabled, setTranscriptionEnabled] = useState(!!openAIKey)
  const [realTimeEnabled, setRealTimeEnabled] = useState(false)
  const [partialTranscript, setPartialTranscript] = useState('')
  const [canGenerate, setCanGenerate] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const {
    isRecording,
    isPaused,
    duration,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetError,
    transcription,
    setTranscriptionCallbacks
  } = useVoiceRecording({
    openAIKey: transcriptionEnabled ? openAIKey : undefined,
    config: whisperConfig ? {
      model: whisperConfig.model || 'base',
      language: whisperConfig.language || 'en',
      temperature: whisperConfig.temperature ?? 0,
      prompt: whisperConfig.prompt,
      task: 'transcribe'
    } : undefined
  })

  const [isProcessing, setIsProcessing] = useState(false)

  // Set up transcription callbacks
  useEffect(() => {
    if (transcriptionEnabled && realTimeEnabled) {
      setTranscriptionCallbacks({
        onPartialTranscript: (text) => {
          setPartialTranscript(text)
        },
        onFinalTranscript: (text) => {
          setPartialTranscript('')
        },
        onError: (error) => {
          console.error('Transcription error:', error)
        }
      })
    }
  }, [transcriptionEnabled, realTimeEnabled, setTranscriptionCallbacks])

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const handleStartRecording = async () => {
    try {
      await startRecording(transcriptionEnabled && realTimeEnabled)
    } catch (error) {
      console.error('Failed to start recording:', error)
    }
  }

  const handleStopRecording = async () => {
    try {
      setIsProcessing(true)
      const recordingId = await stopRecording()
      if (recordingId && onRecordingComplete) {
        onRecordingComplete(recordingId, transcription)
      }
      setCanGenerate(true)
    } catch (error) {
      console.error('Failed to stop recording:', error)
    } finally {
      setIsProcessing(false)
      setPartialTranscript('')
    }
  }

  const handleGenerateContent = async () => {
    setIsGenerating(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
    } finally {
      setIsGenerating(false)
    }
  }

  const handleError = (error: any) => {
    console.error("Voice recorder error:", error);
    
    let errorMessage = "An error occurred. Please try again.";
    
    if (error.name === "NotAllowedError") {
      errorMessage = "Microphone access was denied. Please enable microphone access in your browser settings.";
    } else if (error.name === "NotFoundError") {
      errorMessage = "No microphone found. Please connect a microphone and try again.";
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    }
    
    setError(errorMessage);
    setIsRecording(false);
    setIsProcessing(false);
  };

  return (
    <Card className={cn('p-4', className)}>
      <div className="flex flex-col items-center gap-4">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              {error}
              <Button
                variant="link"
                className="ml-2 h-auto p-0 text-destructive underline"
                onClick={resetError}
              >
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {openAIKey && (
          <div className="flex flex-col gap-4 w-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="transcription"
                  checked={transcriptionEnabled}
                  onCheckedChange={setTranscriptionEnabled}
                  disabled={isRecording || isProcessing}
                />
                <Label htmlFor="transcription" className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  Enable Transcription
                </Label>
              </div>
              
              {transcriptionEnabled && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="realtime"
                    checked={realTimeEnabled}
                    onCheckedChange={setRealTimeEnabled}
                    disabled={isRecording || isProcessing}
                  />
                  <Label htmlFor="realtime">Real-time</Label>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            disabled={isProcessing}
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            className={cn(
              'h-12 w-12',
              isRecording && 'bg-red-100 hover:bg-red-200'
            )}
          >
            {isRecording ? (
              <Square className="h-6 w-6" />
            ) : (
              <Mic className="h-6 w-6" />
            )}
          </Button>

          {isRecording && (
            <Button
              variant="outline"
              disabled={isProcessing}
              onClick={isPaused ? resumeRecording : pauseRecording}
              className="px-4 h-12"
            >
              {isPaused ? (
                <div className="flex items-center gap-2">
                  <Play className="h-6 w-6" />
                  <span>Resume</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Pause className="h-6 w-6" />
                  <span>Pause</span>
                </div>
              )}
            </Button>
          )}
        </div>

        {(isRecording || duration > 0) && (
          <div className="text-sm text-muted-foreground">
            {formatDuration(duration)}
          </div>
        )}

        {isProcessing && (
          <div className="text-sm text-muted-foreground">
            {transcriptionEnabled ? 'Processing and transcribing...' : 'Processing recording...'}
          </div>
        )}

        {(partialTranscript || transcription) && (
          <div className="mt-4 w-full">
            <Label className="mb-2">
              {partialTranscript ? 'Live Transcription' : 'Transcription'}
            </Label>
            <div className="rounded-md bg-muted p-3 text-sm">
              {partialTranscript || transcription}
            </div>
          </div>
        )}

        {canGenerate && transcription && !isRecording && (
          <Button
            onClick={handleGenerateContent}
            disabled={isGenerating}
            className="w-full mt-4"
          >
            {isGenerating ? (
              <>
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Generating Content...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Content
              </>
            )}
          </Button>
        )}
      </div>
    </Card>
  )
} 