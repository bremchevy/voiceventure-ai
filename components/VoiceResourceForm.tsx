'use client';

import React, { useEffect, useState } from 'react';
import { useVoiceFormPopulation } from '@/lib/hooks/useVoiceFormPopulation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

interface VoiceResourceFormProps {
  onSubmit?: (formData: any) => void;
  className?: string;
}

export function VoiceResourceForm({ onSubmit, className }: VoiceResourceFormProps) {
  const {
    startListening,
    stopListening,
    resetForm,
    updateField,
    isProcessing,
    isListening,
    formState,
    lastTranscript,
    requiresConfirmation,
    suggestedCorrections,
    errors,
    warnings
  } = useVoiceFormPopulation({
    initialFields: {
      gradeLevel: '',
      subject: '',
      resourceType: 'worksheet',
      theme: '',
      difficulty: 'medium',
      problemCount: 10,
      topicArea: '',
      customInstructions: '',
      includeQuestions: true,
      includeVisuals: true,
      includeExperiments: false,
      includeDiagrams: false,
      includeVocabulary: false,
      readingLevel: 'intermediate',
      genre: 'fiction',
      wordCount: 300,
      focus: ['comprehension']
    }
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.isValid) return;

    try {
      setIsSubmitting(true);
      await onSubmit?.(formState.fields);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle voice command button
  const handleVoiceCommand = async () => {
    if (isListening) {
      await stopListening();
    } else {
      await startListening();
    }
  };

  // Add subject-specific options
  const renderSubjectOptions = () => {
    if (!formState.fields.subject?.value) return null;

    switch (formState.fields.subject.value.toLowerCase()) {
      case 'reading':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="genre">Genre</Label>
              <Select
                id="genre"
                value={formState.fields.genre?.value || 'fiction'}
                onChange={(e) => updateField('genre', e.target.value)}
              >
                <option value="fiction">Fiction</option>
                <option value="non-fiction">Non-Fiction</option>
                <option value="poetry">Poetry</option>
                <option value="biography">Biography</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="readingLevel">Reading Level</Label>
              <Select
                id="readingLevel"
                value={formState.fields.readingLevel?.value || 'intermediate'}
                onChange={(e) => updateField('readingLevel', e.target.value)}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wordCount">Word Count</Label>
              <Input
                id="wordCount"
                type="number"
                min={100}
                max={1000}
                value={formState.fields.wordCount?.value || 300}
                onChange={(e) => updateField('wordCount', parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>Focus Areas</Label>
              <div className="space-y-2">
                {['comprehension', 'vocabulary', 'analysis', 'inference'].map((focus) => (
                  <div key={focus} className="flex items-center">
                    <input
                      type="checkbox"
                      id={focus}
                      checked={formState.fields.focus?.value?.includes(focus)}
                      onChange={(e) => {
                        const currentFocus = formState.fields.focus?.value || [];
                        updateField('focus', 
                          e.target.checked 
                            ? [...currentFocus, focus]
                            : currentFocus.filter(f => f !== focus)
                        );
                      }}
                      className="mr-2"
                    />
                    <Label htmlFor={focus}>{focus.charAt(0).toUpperCase() + focus.slice(1)}</Label>
                  </div>
                ))}
              </div>
            </div>
          </>
        );

      case 'science':
        return (
          <>
            <div className="space-y-2">
              <Label>Include Features</Label>
              <div className="space-y-2">
                {[
                  { id: 'includeExperiments', label: 'Experiments' },
                  { id: 'includeDiagrams', label: 'Diagrams' },
                  { id: 'includeQuestions', label: 'Questions' }
                ].map(({ id, label }) => (
                  <div key={id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={id}
                      checked={formState.fields[id]?.value || false}
                      onChange={(e) => updateField(id, e.target.checked)}
                      className="mr-2"
                    />
                    <Label htmlFor={id}>{label}</Label>
                  </div>
                ))}
              </div>
            </div>
          </>
        );

      case 'math':
        return (
          <>
            <div className="space-y-2">
              <Label>Include Features</Label>
              <div className="space-y-2">
                {[
                  { id: 'includeVisuals', label: 'Visual Aids' },
                  { id: 'includeQuestions', label: 'Word Problems' }
                ].map(({ id, label }) => (
                  <div key={id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={id}
                      checked={formState.fields[id]?.value || false}
                      onChange={(e) => updateField(id, e.target.checked)}
                      className="mr-2"
                    />
                    <Label htmlFor={id}>{label}</Label>
                  </div>
                ))}
              </div>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Card className={cn('p-6 space-y-6', className)}>
      {/* Voice Command Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            onClick={handleVoiceCommand}
            variant={isListening ? 'destructive' : 'default'}
            className="w-full"
            disabled={isProcessing}
          >
            {isListening ? 'Stop Recording' : 'Start Voice Command'}
          </Button>
        </div>

        {isProcessing && (
          <div className="flex items-center justify-center p-4">
            <Spinner className="w-8 h-8" />
            <span className="ml-3">Processing voice command...</span>
          </div>
        )}

        {lastTranscript && (
          <Alert>
            <AlertDescription>
              Transcript: {lastTranscript}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Form Fields */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Grade Level */}
        <div className="space-y-2">
          <Label htmlFor="gradeLevel">Grade Level</Label>
          <Select
            id="gradeLevel"
            value={formState.fields.gradeLevel?.value || ''}
            onChange={(e) => updateField('gradeLevel', e.target.value)}
          >
            <option value="">Select Grade Level</option>
            <option value="Kindergarten">Kindergarten</option>
            <option value="1st Grade">1st Grade</option>
            <option value="2nd Grade">2nd Grade</option>
            <option value="3rd Grade">3rd Grade</option>
            <option value="4th Grade">4th Grade</option>
            <option value="5th Grade">5th Grade</option>
          </Select>
        </div>

        {/* Subject */}
        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Select
            id="subject"
            value={formState.fields.subject?.value || ''}
            onChange={(e) => updateField('subject', e.target.value)}
          >
            <option value="">Select Subject</option>
            <option value="Math">Math</option>
            <option value="Reading">Reading</option>
            <option value="Science">Science</option>
            <option value="History">History</option>
          </Select>
        </div>

        {/* Add subject-specific options */}
        {renderSubjectOptions()}

        {/* Resource Type */}
        <div className="space-y-2">
          <Label htmlFor="resourceType">Resource Type</Label>
          <Select
            id="resourceType"
            value={formState.fields.resourceType?.value || 'worksheet'}
            onChange={(e) => updateField('resourceType', e.target.value)}
          >
            <option value="worksheet">Worksheet</option>
            <option value="quiz">Quiz</option>
            <option value="rubric">Rubric</option>
            <option value="lesson_plan">Lesson Plan</option>
            <option value="exit_slip">Exit Slip</option>
          </Select>
        </div>

        {/* Theme */}
        <div className="space-y-2">
          <Label htmlFor="theme">Theme (Optional)</Label>
          <Select
            id="theme"
            value={formState.fields.theme?.value || ''}
            onChange={(e) => updateField('theme', e.target.value)}
          >
            <option value="">No Theme</option>
            <option value="Halloween">Halloween</option>
            <option value="Winter">Winter</option>
            <option value="Spring">Spring</option>
          </Select>
        </div>

        {/* Difficulty */}
        <div className="space-y-2">
          <Label htmlFor="difficulty">Difficulty</Label>
          <Select
            id="difficulty"
            value={formState.fields.difficulty?.value || 'medium'}
            onChange={(e) => updateField('difficulty', e.target.value)}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </Select>
        </div>

        {/* Problem Count */}
        <div className="space-y-2">
          <Label htmlFor="problemCount">Number of Problems</Label>
          <Input
            id="problemCount"
            type="number"
            min={1}
            max={50}
            value={formState.fields.problemCount?.value || 10}
            onChange={(e) => updateField('problemCount', parseInt(e.target.value))}
          />
        </div>

        {/* Topic Area */}
        <div className="space-y-2">
          <Label htmlFor="topicArea">Topic Area (Optional)</Label>
          <Input
            id="topicArea"
            value={formState.fields.topicArea?.value || ''}
            onChange={(e) => updateField('topicArea', e.target.value)}
            placeholder="e.g., Addition, Fractions, etc."
          />
        </div>

        {/* Custom Instructions */}
        <div className="space-y-2">
          <Label htmlFor="customInstructions">Custom Instructions (Optional)</Label>
          <Input
            id="customInstructions"
            value={formState.fields.customInstructions?.value || ''}
            onChange={(e) => updateField('customInstructions', e.target.value)}
            placeholder="Any specific requirements or notes"
          />
        </div>

        {/* Error Messages */}
        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              <ul className="list-disc pl-4">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Warning Messages */}
        {warnings.length > 0 && (
          <Alert>
            <AlertDescription>
              <ul className="list-disc pl-4">
                {warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Suggested Corrections */}
        {suggestedCorrections && Object.keys(suggestedCorrections).length > 0 && (
          <Alert>
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">Suggested Corrections:</p>
                <ul className="list-disc pl-4">
                  {Object.entries(suggestedCorrections).map(([field, suggestion]) => (
                    <li key={field}>
                      {field}: {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Form Actions */}
        <div className="flex space-x-4">
          <Button
            type="submit"
            disabled={!formState.isValid || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <Spinner className="w-4 h-4 mr-2" />
                Generating...
              </>
            ) : (
              'Generate Resource'
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={resetForm}
            disabled={isSubmitting}
            className="flex-1"
          >
            Reset Form
          </Button>
        </div>
      </form>
    </Card>
  );
}