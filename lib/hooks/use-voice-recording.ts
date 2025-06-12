'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/context/auth-context'
import {
  VoiceRecordingManager,
  VoiceRecordingConfig,
  TranscriptionCallbacks
} from '@/lib/utils/voice-recording'
import { createError, ErrorCodes } from '@/lib/utils/errors'

export interface VoiceRecordingState {
  isRecording: boolean
  isPaused: boolean
  duration: number
  error: Error | null
  transcription?: string
}

interface UseVoiceRecordingOptions {
  config?: Partial<VoiceRecordingConfig>
  openAIKey?: string
}

export function useVoiceRecording({ config, openAIKey }: UseVoiceRecordingOptions = {}) {
  const { user } = useAuth()
  const [manager] = useState(() => new VoiceRecordingManager(config, openAIKey))
  const [state, setState] = useState<VoiceRecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    error: null
  })
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])

  // Update duration every second while recording
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (state.isRecording && !state.isPaused) {
      interval = setInterval(() => {
        setState(prev => ({ ...prev, duration: prev.duration + 1 }))
      }, 1000)
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [state.isRecording, state.isPaused])

  // Sync offline recordings when coming back online
  useEffect(() => {
    const handleOnline = () => {
      manager.syncOfflineRecordings().catch(console.error)
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [manager])

  // Initialize media recorder
  useEffect(() => {
    if (typeof window === 'undefined') return

    const initializeRecorder = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const recorder = new MediaRecorder(stream)
        
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            setAudioChunks(chunks => [...chunks, event.data])
          }
        }

        setMediaRecorder(recorder)
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: createError(ErrorCodes.VOICE_RECORDING_PERMISSION_DENIED)
        }))
      }
    }

    initializeRecorder()
  }, [])

  const setTranscriptionCallbacks = useCallback((callbacks: TranscriptionCallbacks) => {
    manager.setTranscriptionCallbacks(callbacks)
  }, [manager])

  const startRecording = useCallback(async (enableRealTimeTranscription: boolean = false) => {
    if (!user) {
      throw createError(ErrorCodes.AUTH_NOT_AUTHENTICATED)
    }

    if (!mediaRecorder) {
      setState(prev => ({
        ...prev,
        error: createError(ErrorCodes.VOICE_RECORDING_NOT_SUPPORTED)
      }))
      return
    }

    try {
      await manager.startRecording(enableRealTimeTranscription)
      setAudioChunks([])
      setState({
        isRecording: true,
        isPaused: false,
        duration: 0,
        error: null
      })
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: createError(ErrorCodes.VOICE_RECORDING_FAILED)
      }))
      throw error
    }
  }, [user, manager, mediaRecorder])

  const stopRecording = useCallback(async () => {
    if (!user) {
      throw createError(ErrorCodes.AUTH_NOT_AUTHENTICATED)
    }

    if (!mediaRecorder || !state.isRecording) {
      setState(prev => ({
        ...prev,
        error: createError(ErrorCodes.VOICE_RECORDING_NOT_STARTED)
      }))
      return null
    }

    try {
      await manager.stopRecording()
      setState({
        isRecording: false,
        isPaused: false,
        duration: 0,
        error: null
      })

      // Convert chunks to blob
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
      
      // Convert blob to base64
      const base64Audio = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64String = reader.result as string
          resolve(base64String.split(',')[1]) // Remove the data URL prefix
        }
        reader.readAsDataURL(audioBlob)
      })

      const recordingId = await manager.uploadRecording(user!.id, audioBlob, state.duration)
      return recordingId
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: createError(ErrorCodes.VOICE_RECORDING_FAILED)
      }))
      return null
    }
  }, [user, manager, state.isRecording, audioChunks])

  const pauseRecording = useCallback(() => {
    if (!state.isRecording || state.isPaused) {
      return
    }

    manager.pauseRecording()
    setState(prev => ({ ...prev, isPaused: true }))
  }, [manager, state.isRecording, state.isPaused])

  const resumeRecording = useCallback(() => {
    if (!state.isRecording || !state.isPaused) {
      return
    }

    manager.resumeRecording()
    setState(prev => ({ ...prev, isPaused: false }))
  }, [manager, state.isRecording, state.isPaused])

  const resetError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return {
    ...state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetError,
    setTranscriptionCallbacks
  }
} 