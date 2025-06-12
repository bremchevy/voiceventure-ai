import React, { useEffect, useState } from 'react'
import { useMobileVoiceRecording } from '../lib/hooks/useMobileVoiceRecording'
import { isMobileDevice } from '../lib/utils/platform'
import { Button } from './ui/button'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Loader2, Mic, Pause, Play, Square, AlertTriangle } from 'lucide-react'

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob) => void
  className?: string
}

export function VoiceRecorder({ onRecordingComplete, className = '' }: VoiceRecorderProps) {
  const {
    state: { isRecording, isPaused, error, duration },
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetError
  } = useMobileVoiceRecording()

  const [isInitializing, setIsInitializing] = useState(false)

  const handleStartRecording = async () => {
    setIsInitializing(true)
    try {
      await startRecording()
    } finally {
      setIsInitializing(false)
    }
  }

  const handleStopRecording = async () => {
    try {
      const blob = await stopRecording()
      onRecordingComplete(blob)
    } catch (error) {
      console.error('Failed to stop recording:', error)
    }
  }

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Show device-specific message if not on mobile
  if (!isMobileDevice()) {
    return (
      <Alert className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Device Not Supported</AlertTitle>
        <AlertDescription>
          Voice recording is currently optimized for mobile devices only. Please use a mobile device to record audio.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={resetError}
          >
            Dismiss
          </Button>
        </Alert>
      )}

      <div className="flex items-center gap-4">
        {!isRecording ? (
          <Button
            onClick={handleStartRecording}
            disabled={isInitializing}
            className="w-full"
          >
            {isInitializing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Initializing...
              </>
            ) : (
              <>
                <Mic className="mr-2 h-4 w-4" />
                Start Recording
              </>
            )}
          </Button>
        ) : (
          <>
            <Button
              onClick={isPaused ? resumeRecording : pauseRecording}
              variant="outline"
              className="flex-1"
            >
              {isPaused ? (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="mr-2 h-4 w-4" />
                  Pause
                </>
              )}
            </Button>
            <Button
              onClick={handleStopRecording}
              variant="destructive"
              className="flex-1"
            >
              <Square className="mr-2 h-4 w-4" />
              Stop
            </Button>
          </>
        )}
      </div>

      {isRecording && (
        <div className="text-center text-sm text-gray-500">
          Recording duration: {formatDuration(duration)}
          {isPaused && <span className="ml-2">(Paused)</span>}
        </div>
      )}
    </div>
  )
} 