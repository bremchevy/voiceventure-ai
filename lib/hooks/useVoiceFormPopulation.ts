import { useState, useCallback, useEffect } from 'react';
import { CommandProcessor, NLPResult } from '../services/CommandProcessor';
import { FormPopulator, FormState, PopulationResult } from '../services/FormPopulator';
import { useVoiceRecording } from './use-voice-recording';

export interface VoiceFormPopulationState {
  isProcessing: boolean;
  isListening: boolean;
  formState: FormState;
  lastTranscript: string | null;
  requiresConfirmation: boolean;
  suggestedCorrections?: Record<string, string>;
  errors: string[];
  warnings: string[];
}

export interface VoiceFormPopulationOptions {
  initialFields?: Record<string, any>;
  confidenceThreshold?: number;
  onPopulationComplete?: (result: PopulationResult) => void;
  onError?: (error: Error) => void;
}

export function useVoiceFormPopulation(options: VoiceFormPopulationOptions = {}) {
  const {
    initialFields = {},
    confidenceThreshold = 0.8,
    onPopulationComplete,
    onError
  } = options;

  const [state, setState] = useState<VoiceFormPopulationState>({
    isProcessing: false,
    isListening: false,
    formState: {
      fields: {},
      isValid: false,
      isDirty: false
    },
    lastTranscript: null,
    requiresConfirmation: false,
    errors: [],
    warnings: []
  });

  // Initialize services
  const commandProcessor = new CommandProcessor();
  const formPopulator = new FormPopulator(initialFields);
  const { startRecording, stopRecording, isRecording, transcript } = useVoiceRecording();

  // Process voice command and populate form
  const processCommand = useCallback(async (transcript: string) => {
    try {
      setState(prev => ({ ...prev, isProcessing: true }));

      // Process the command
      const nlpResult: NLPResult = commandProcessor.processCommand(transcript);

      // Populate the form
      const populationResult = formPopulator.populateForm(nlpResult);

      // Update state with results
      setState(prev => ({
        ...prev,
        isProcessing: false,
        formState: populationResult.formState,
        lastTranscript: transcript,
        requiresConfirmation: populationResult.requiresConfirmation,
        suggestedCorrections: populationResult.suggestedCorrections,
        errors: populationResult.validation.errors.map(e => e.message),
        warnings: populationResult.validation.warnings.map(w => w.message)
      }));

      // Notify completion
      onPopulationComplete?.(populationResult);

    } catch (error) {
      setState(prev => ({
        ...prev,
        isProcessing: false,
        errors: [...prev.errors, error.message]
      }));
      onError?.(error);
    }
  }, [commandProcessor, formPopulator, onPopulationComplete, onError]);

  // Start listening for voice commands
  const startListening = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isListening: true, errors: [], warnings: [] }));
      await startRecording();
    } catch (error) {
      setState(prev => ({
        ...prev,
        isListening: false,
        errors: [...prev.errors, error.message]
      }));
      onError?.(error);
    }
  }, [startRecording, onError]);

  // Stop listening and process the command
  const stopListening = useCallback(async () => {
    try {
      await stopRecording();
      setState(prev => ({ ...prev, isListening: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isListening: false,
        errors: [...prev.errors, error.message]
      }));
      onError?.(error);
    }
  }, [stopRecording, onError]);

  // Process transcript when it changes
  useEffect(() => {
    if (transcript && !isRecording) {
      processCommand(transcript);
    }
  }, [transcript, isRecording, processCommand]);

  // Reset form state
  const resetForm = useCallback(() => {
    formPopulator.resetForm();
    setState(prev => ({
      ...prev,
      formState: formPopulator.getFormState(),
      lastTranscript: null,
      requiresConfirmation: false,
      suggestedCorrections: undefined,
      errors: [],
      warnings: []
    }));
  }, [formPopulator]);

  // Update a single form field
  const updateField = useCallback((fieldId: string, value: any) => {
    const currentState = formPopulator.getFormState();
    const updatedFields = {
      ...currentState.fields,
      [fieldId]: {
        ...currentState.fields[fieldId],
        value,
        isTouched: true
      }
    };
    
    const newFormState = {
      ...currentState,
      fields: updatedFields,
      isDirty: true
    };

    setState(prev => ({
      ...prev,
      formState: newFormState
    }));
  }, [formPopulator]);

  return {
    startListening,
    stopListening,
    resetForm,
    updateField,
    isProcessing: state.isProcessing,
    isListening: state.isListening,
    formState: state.formState,
    lastTranscript: state.lastTranscript,
    requiresConfirmation: state.requiresConfirmation,
    suggestedCorrections: state.suggestedCorrections,
    errors: state.errors,
    warnings: state.warnings
  };
} 