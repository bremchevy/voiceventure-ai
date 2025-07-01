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
  detectedFormat?: string;
  confidence: number;
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
    warnings: [],
    confidence: 0
  });

  // Initialize services
  const commandProcessor = new CommandProcessor();
  const formPopulator = new FormPopulator(initialFields);
  const { startRecording, stopRecording, isRecording, transcription } = useVoiceRecording();

  // Process voice command and populate form
  const processCommand = useCallback(async (transcript: string) => {
    console.log('🎤 Processing voice command:', transcript);
    
    try {
      setState(prev => ({ ...prev, isProcessing: true }));

      // Process the command
      const nlpResult: NLPResult = commandProcessor.processCommand(transcript);
      console.log('🔍 NLP Result:', nlpResult);

      // Extract format from specifications
      const format = nlpResult.specifications.format;
      console.log('📄 Detected format:', format);

      // Populate the form
      const populationResult = formPopulator.populateForm(nlpResult);
      console.log('📝 Form population result:', populationResult);

      // Update state with results
      setState(prev => ({
        ...prev,
        isProcessing: false,
        formState: populationResult.formState,
        lastTranscript: transcript,
        requiresConfirmation: populationResult.requiresConfirmation,
        suggestedCorrections: populationResult.suggestedCorrections,
        errors: populationResult.validation.errors.map(e => e.message),
        warnings: populationResult.validation.warnings.map(w => w.message),
        detectedFormat: format,
        confidence: nlpResult.confidence
      }));

      // If we have a format, update the form
      if (format) {
        console.log('📄 Updating format field:', format);
        updateField('format', format);
      }

      // If we have a question count, update problemCount
      if (nlpResult.specifications.questionCount) {
        console.log('❓ Updating problem count:', nlpResult.specifications.questionCount);
        updateField('problemCount', nlpResult.specifications.questionCount);
      }

      // Notify completion
      onPopulationComplete?.(populationResult);

    } catch (error) {
      console.error('❌ Error processing voice command:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setState(prev => ({
        ...prev,
        isProcessing: false,
        errors: [...prev.errors, errorMessage]
      }));
      if (error instanceof Error) {
        onError?.(error);
      }
    }
  }, [commandProcessor, formPopulator, onPopulationComplete, onError]);

  // Start listening for voice commands
  const startListening = useCallback(async () => {
    try {
      // Reset form state before starting new voice command
      formPopulator.resetForm();
      setState(prev => ({ 
        ...prev, 
        isListening: true, 
        errors: [], 
        warnings: [],
        formState: formPopulator.getFormState(),
        lastTranscript: null,
        requiresConfirmation: false,
        suggestedCorrections: undefined,
        detectedFormat: undefined,
        confidence: 0
      }));
      await startRecording();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setState(prev => ({
        ...prev,
        isListening: false,
        errors: [...prev.errors, errorMessage]
      }));
      if (error instanceof Error) {
        onError?.(error);
      }
    }
  }, [startRecording, onError, formPopulator]);

  // Stop listening and process the command
  const stopListening = useCallback(async () => {
    try {
      await stopRecording();
      setState(prev => ({ ...prev, isListening: false }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setState(prev => ({
        ...prev,
        isListening: false,
        errors: [...prev.errors, errorMessage]
      }));
      if (error instanceof Error) {
        onError?.(error);
      }
    }
  }, [stopRecording, onError]);

  // Process transcript when it changes
  useEffect(() => {
    if (transcription && !isRecording) {
      processCommand(transcription);
    }
  }, [transcription, isRecording, processCommand]);

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
      warnings: [],
      detectedFormat: undefined,
      confidence: 0
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
    warnings: state.warnings,
    detectedFormat: state.detectedFormat,
    confidence: state.confidence
  };
} 