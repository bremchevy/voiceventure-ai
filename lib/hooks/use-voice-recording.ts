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

  const setTranscriptionCallbacks = useCallback((callbacks: TranscriptionCallbacks) => {
    manager.setTranscriptionCallbacks(callbacks)
  }, [manager])

  const startRecording = useCallback(async (enableRealTimeTranscription: boolean = false) => {
    if (!user) {
      throw createError(ErrorCodes.AUTH_NOT_AUTHENTICATED)
    }

    try {
      await manager.startRecording(enableRealTimeTranscription)
      setState({
        isRecording: true,
        isPaused: false,
        duration: 0,
        error: null
      })
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as Error
      }))
      throw error
    }
  }, [user, manager])

  const stopRecording = useCallback(async () => {
    if (!state.isRecording) {
      return
    }

    try {
      const { blob, duration } = await manager.stopRecording()
      const recordingId = await manager.uploadRecording(user!.id, blob, duration)
      
      // Get the recording details to check for transcription
      const { data: recordingData, error: fetchError } = await manager.supabase
        .from('voice_recordings')
        .select('transcription')
        .eq('id', recordingId)
        .single()

      if (fetchError) {
        throw fetchError
      }

      setState({
        isRecording: false,
        isPaused: false,
        duration: 0,
        error: null,
        transcription: recordingData.transcription
      })

      return recordingId
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as Error
      }))
      throw error
    }
  }, [user, manager, state.isRecording])

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