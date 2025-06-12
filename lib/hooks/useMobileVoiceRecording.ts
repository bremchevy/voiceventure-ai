import { useState, useEffect, useCallback, useRef } from 'react'
import { MobileVoiceRecordingManager } from '../services/MobileVoiceRecordingManager'
import { isMobileDevice } from '../utils/platform'

interface VoiceRecordingState {
  isRecording: boolean
  isPaused: boolean
  error: string | null
  duration: number
}

interface UseMobileVoiceRecordingResult {
  state: VoiceRecordingState
  startRecording: () => Promise<void>
  stopRecording: () => Promise<Blob>
  pauseRecording: () => Promise<void>
  resumeRecording: () => Promise<void>
  resetError: () => void
}

export function useMobileVoiceRecording(): UseMobileVoiceRecordingResult {
  const [state, setState] = useState<VoiceRecordingState>({
    isRecording: false,
    isPaused: false,
    error: null,
    duration: 0
  })

  const recorderRef = useRef<MobileVoiceRecordingManager | null>(null)
  const durationIntervalRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)

  useEffect(() => {
    // Initialize recorder only on mobile devices
    if (isMobileDevice()) {
      recorderRef.current = new MobileVoiceRecordingManager()
    }

    return () => {
      if (durationIntervalRef.current) {
        window.clearInterval(durationIntervalRef.current)
      }
    }
  }, [])

  const updateDuration = useCallback(() => {
    if (startTimeRef.current && !state.isPaused) {
      setState(prev => ({
        ...prev,
        duration: Math.floor((Date.now() - startTimeRef.current) / 1000)
      }))
    }
  }, [state.isPaused])

  const startRecording = useCallback(async () => {
    try {
      if (!recorderRef.current) {
        throw new Error('Recording is only available on mobile devices')
      }

      await recorderRef.current.startRecording()
      startTimeRef.current = Date.now()
      
      // Start duration timer
      durationIntervalRef.current = window.setInterval(updateDuration, 1000)
      
      setState(prev => ({
        ...prev,
        isRecording: true,
        error: null
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to start recording'
      }))
    }
  }, [updateDuration])

  const stopRecording = useCallback(async () => {
    try {
      if (!recorderRef.current) {
        throw new Error('No recording in progress')
      }

      const recordedBlob = await recorderRef.current.stopRecording()
      
      // Clear duration timer
      if (durationIntervalRef.current) {
        window.clearInterval(durationIntervalRef.current)
      }

      setState(prev => ({
        ...prev,
        isRecording: false,
        isPaused: false,
        duration: 0
      }))

      return recordedBlob
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to stop recording'
      }))
      throw error
    }
  }, [])

  const pauseRecording = useCallback(async () => {
    try {
      if (!recorderRef.current) {
        throw new Error('No recording in progress')
      }

      await recorderRef.current.pauseRecording()
      setState(prev => ({
        ...prev,
        isPaused: true
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to pause recording'
      }))
    }
  }, [])

  const resumeRecording = useCallback(async () => {
    try {
      if (!recorderRef.current) {
        throw new Error('No recording in progress')
      }

      await recorderRef.current.resumeRecording()
      setState(prev => ({
        ...prev,
        isPaused: false
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to resume recording'
      }))
    }
  }, [])

  const resetError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null
    }))
  }, [])

  return {
    state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetError
  }
} 