'use client';

import React, { useEffect, useState, ChangeEvent } from 'react';
import { useVoiceFormPopulation } from '@/lib/hooks/useVoiceFormPopulation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

interface VoiceResourceFormProps {
  onSubmit?: (formData: any) => void;
  className?: string;
}

interface SelectOption {
  value: string;
  label: string;
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
    warnings,
    detectedFormat,
    confidence
  } = useVoiceFormPopulation({
    initialFields: {
      gradeLevel: '',
      subject: '',
      resourceType: '',
      format: '',
      difficulty: '',
      problemCount: '',
      topicArea: '',
      customInstructions: '',
      includeQuestions: false,
      includeVisuals: false,
      includeExperiments: false,
      includeDiagrams: false,
      includeVocabulary: false,
      readingLevel: '',
      genre: '',
      wordCount: '',
      focus: []
    }
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit && formState.isValid) {
      setIsSubmitting(true);
      try {
        await onSubmit(formState.fields);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Handle voice command button
  const handleVoiceCommand = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Get valid formats for current resource type
  const getFormatsForType = (type: string): SelectOption[] => {
    const formatMap: Record<string, SelectOption[]> = {
      worksheet: [
        { value: 'standard', label: 'Standard' },
        { value: 'guided', label: 'Guided Practice' },
        { value: 'interactive', label: 'Interactive' }
      ],
      quiz: [
        { value: 'multiple_choice', label: 'Multiple Choice' },
        { value: 'true_false', label: 'True/False' },
        { value: 'short_answer', label: 'Short Answer' }
      ],
      rubric: [
        { value: '4_point', label: '4-Point Scale' },
        { value: '3_point', label: '3-Point Scale' },
        { value: 'checklist', label: 'Checklist' }
      ],
      lesson_plan: [
        { value: 'full_lesson', label: 'Full Lesson' },
        { value: 'mini_lesson', label: 'Mini-Lesson' },
        { value: 'activity', label: 'Activity' }
      ],
      exit_slip: [
        { value: 'reflection_prompt', label: 'Reflection Prompt' },
        { value: 'vocabulary_check', label: 'Vocabulary Check' },
        { value: 'skill_assessment', label: 'Skill Assessment' }
      ]
    };

    return formatMap[type] || [];
  };

  // Enhanced subject-specific options
  const renderSubjectOptions = () => {
    if (!formState.fields.subject?.value) return null;

    switch (formState.fields.subject.value.toLowerCase()) {
      case 'reading':
        return (
          <>
            <div className="space-y-2">
              <Label>Genre</Label>
              <Select value={formState.fields.genre?.value || ''} onValueChange={(value) => updateField('genre', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Genre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fiction">Fiction</SelectItem>
                  <SelectItem value="non-fiction">Non-Fiction</SelectItem>
                  <SelectItem value="poetry">Poetry</SelectItem>
                  <SelectItem value="biography">Biography</SelectItem>
                  <SelectItem value="informational">Informational Text</SelectItem>
                  <SelectItem value="narrative">Narrative</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Reading Level</Label>
              <Select value={formState.fields.readingLevel?.value || ''} onValueChange={(value) => updateField('readingLevel', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Reading Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Word Count</Label>
              <Input
                type="number"
                min={100}
                max={1000}
                value={formState.fields.wordCount?.value || 300}
                onChange={(e: ChangeEvent<HTMLInputElement>) => updateField('wordCount', parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>Focus Areas</Label>
              <div className="space-y-2">
                {[
                  { id: 'comprehension', label: 'Reading Comprehension' },
                  { id: 'vocabulary', label: 'Vocabulary' },
                  { id: 'analysis', label: 'Text Analysis' },
                  { id: 'inference', label: 'Making Inferences' },
                  { id: 'main_idea', label: 'Main Idea' },
                  { id: 'details', label: 'Supporting Details' }
                ].map(({ id, label }) => (
                  <div key={id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={id}
                      checked={formState.fields.focus?.value?.includes(id)}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        const currentFocus = formState.fields.focus?.value || [];
                        updateField('focus', 
                          e.target.checked 
                            ? [...currentFocus, id]
                            : currentFocus.filter((f: string) => f !== id)
                        );
                      }}
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
                  { id: 'includeWordProblems', label: 'Word Problems' },
                  { id: 'includeExamples', label: 'Example Problems' },
                  { id: 'includeStepByStep', label: 'Step-by-Step Solutions' },
                  { id: 'includeChallenge', label: 'Challenge Problems' }
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

      case 'science':
        return (
          <>
            <div className="space-y-2">
              <Label>Include Features</Label>
              <div className="space-y-2">
                {[
                  { id: 'includeExperiments', label: 'Experiments' },
                  { id: 'includeDiagrams', label: 'Diagrams' },
                  { id: 'includeQuestions', label: 'Questions' },
                  { id: 'includeObservations', label: 'Observations' },
                  { id: 'includeHypothesis', label: 'Hypothesis Formation' },
                  { id: 'includeDataAnalysis', label: 'Data Analysis' }
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
        <div className="flex items-center gap-4">
          <Button
            type="button"
            onClick={handleVoiceCommand}
            className={cn(
              "relative",
              isListening && "animate-pulse"
            )}
          >
            {isListening ? "Stop Recording" : "Start Recording"}
          </Button>
          {isProcessing && <Spinner />}
        </div>

        {/* Validation Messages */}
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

        {/* Last Transcript */}
        {lastTranscript && (
          <Alert>
            <AlertDescription>
              <strong>Last voice input:</strong> {lastTranscript}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Form Fields */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Grade Level */}
        <div className="space-y-2">
          <Label>Grade Level</Label>
          <Select value={formState.fields.gradeLevel?.value || ''} onValueChange={(value) => updateField('gradeLevel', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select Grade Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="k">Kindergarten</SelectItem>
              <SelectItem value="1">1st Grade</SelectItem>
              <SelectItem value="2">2nd Grade</SelectItem>
              <SelectItem value="3">3rd Grade</SelectItem>
              <SelectItem value="4">4th Grade</SelectItem>
              <SelectItem value="5">5th Grade</SelectItem>
            </SelectContent>
          </Select>
          {!formState.fields.gradeLevel?.value && (
            <div className="text-sm text-red-500">Please select a grade</div>
          )}
        </div>

        {/* Subject */}
        <div className="space-y-2">
          <Label>Subject</Label>
          <Select value={formState.fields.subject?.value || ''} onValueChange={(value) => updateField('subject', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select Subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="math">Math</SelectItem>
              <SelectItem value="reading">Reading</SelectItem>
              <SelectItem value="science">Science</SelectItem>
            </SelectContent>
          </Select>
          {!formState.fields.subject?.value && (
            <div className="text-sm text-red-500">Please select a subject</div>
          )}
        </div>

        {/* Resource Type */}
        <div className="space-y-2">
          <Label>Resource Type</Label>
          <Select value={formState.fields.resourceType?.value || ''} onValueChange={(value) => updateField('resourceType', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select Resource Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="worksheet">Worksheet</SelectItem>
              <SelectItem value="quiz">Quiz</SelectItem>
              <SelectItem value="lesson_plan">Lesson Plan</SelectItem>
              <SelectItem value="rubric">Rubric</SelectItem>
              <SelectItem value="exit_slip">Exit Slip</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Format Selection */}
        {formState.fields.resourceType?.value && (
          <div className="space-y-2">
            <Label>Format</Label>
            <Select value={formState.fields.format?.value || ''} onValueChange={(value) => updateField('format', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select Format" />
              </SelectTrigger>
              <SelectContent>
                {getFormatsForType(formState.fields.resourceType.value).map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Add subject-specific options */}
        {renderSubjectOptions()}

        {/* Difficulty */}
        <div className="space-y-2">
          <Label>Difficulty</Label>
          <Select value={formState.fields.difficulty?.value || 'medium'} onValueChange={(value) => updateField('difficulty', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Problem Count */}
        <div className="space-y-2">
          <Label>Number of Problems</Label>
          <Input
            type="number"
            min={1}
            max={50}
            value={formState.fields.problemCount?.value || 10}
            onChange={(e: ChangeEvent<HTMLInputElement>) => updateField('problemCount', parseInt(e.target.value))}
          />
        </div>

        {/* Topic Area */}
        <div className="space-y-2">
          <Label>Topic Area</Label>
          <Input
            value={formState.fields.topicArea?.value || ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) => updateField('topicArea', e.target.value)}
            placeholder="e.g., Addition, Fractions, etc."
          />
        </div>

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
            disabled={!formState.isValid || isSubmitting || errors.length > 0}
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