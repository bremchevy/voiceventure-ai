import { NLPResult } from './CommandProcessor';

export interface FormField {
  id: string;
  value: any;
  isValid: boolean;
  isTouched: boolean;
  errorMessage?: string;
  warningMessage?: string;
}

export interface FormState {
  fields: Record<string, FormField>;
  isValid: boolean;
  isDirty: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
  suggestedFix?: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface PopulationResult {
  formState: FormState;
  validation: ValidationResult;
  requiresConfirmation: boolean;
  suggestedCorrections?: Record<string, string>;
}

export class FormPopulator {
  private formState: FormState;
  private initialFields: Record<string, any>;

  constructor(initialFields: Record<string, any> = {}) {
    this.initialFields = initialFields;
    this.formState = {
      fields: Object.entries(initialFields).reduce((acc, [key, value]) => {
        acc[key] = {
          id: key,
          value: value || '',  // Initialize with empty string if no value
          isValid: true,
          isTouched: false
        };
        return acc;
      }, {} as Record<string, FormField>),
      isValid: false,
      isDirty: false
    };
  }

  public getFormState(): FormState {
    return this.formState;
  }

  private updateField(fieldId: string, value: any): void {
    // Only update if value is not null/undefined and different from current
    if (value != null && value !== this.formState.fields[fieldId]?.value) {
      this.formState.fields[fieldId] = {
        ...this.formState.fields[fieldId],
        id: fieldId,
        value,
        isValid: true,
        isTouched: true
      };
      this.formState.isDirty = true;
    }
  }

  public resetForm(): void {
    this.formState = {
      fields: Object.entries(this.initialFields).reduce((acc, [key, value]) => {
        acc[key] = {
          id: key,
          value: value || '',
          isValid: true,
          isTouched: false
        };
        return acc;
      }, {} as Record<string, FormField>),
      isValid: false,
      isDirty: false
    };
  }

  /**
   * Map NLP result to form fields
   */
  public populateForm(nlpResult: NLPResult): PopulationResult {
    console.log('🔄 Starting form population with NLP result:', nlpResult);
    
    const { gradeLevel, subject, resourceType, specifications, confidence } = nlpResult;
    const requiresConfirmation = confidence < 0.8;
    const suggestedCorrections: Record<string, string> = {};
    const validation: ValidationResult = { 
      isValid: true,
      errors: [], 
      warnings: [] 
    };

    // Only update fields if values were actually detected
    if (gradeLevel) {
      console.log('📝 Updating grade level:', gradeLevel);
      this.updateField('gradeLevel', gradeLevel);
    } else {
      console.log('⚠️ Missing grade level');
      validation.errors.push({
        field: 'gradeLevel',
        message: 'Grade level was not detected in your voice input',
        suggestedFix: 'Please try saying the grade level clearly (e.g., "third grade" or "grade 3")'
      });
    }

    if (subject) {
      console.log('📝 Updating subject:', subject);
      this.updateField('subject', subject);
    } else {
      console.log('⚠️ Missing subject');
      validation.errors.push({
        field: 'subject',
        message: 'Subject was not detected in your voice input',
        suggestedFix: 'Please try saying the subject clearly (e.g., "math" or "reading")'
      });
    }

    if (resourceType) {
      console.log('📝 Updating resource type:', resourceType);
      this.updateField('resourceType', resourceType);
    } else {
      console.log('⚠️ Missing resource type');
      validation.errors.push({
        field: 'resourceType',
        message: 'Resource type was not detected in your voice input',
        suggestedFix: 'Please try saying the resource type clearly (e.g., "worksheet" or "quiz")'
      });
    }

    // Handle specifications only if they were detected
    if (specifications.format) {
      console.log('📝 Updating format:', specifications.format);
      this.updateField('format', specifications.format);
    }
    
    if (specifications.theme) {
      this.updateField('theme', specifications.theme);
      
      // If it's a spelling worksheet with a theme, automatically enable vocabulary
      if (subject === 'Reading' && resourceType === 'worksheet' && specifications.theme) {
        this.updateField('includeVocabulary', true);
        this.updateField('focus', ['vocabulary', 'spelling']);
      }
    }

    if (specifications.difficulty) {
      this.updateField('difficulty', specifications.difficulty);
    }

    if (specifications.questionCount) {
      this.updateField('problemCount', specifications.questionCount);
    }

    if (specifications.topicArea) {
      this.updateField('topicArea', specifications.topicArea);
    } else {
      validation.warnings.push({
        field: 'topicArea',
        message: 'No specific topic area was detected',
        suggestion: 'You can specify a topic area for more focused content'
      });
    }

    if (specifications.customInstructions) {
      this.updateField('customInstructions', specifications.customInstructions);
    }

    // Validate the populated form
    const formValidation = this.validateForm();
    validation.errors.push(...formValidation.errors);
    validation.warnings.push(...formValidation.warnings);

    // Update isValid based on whether there are any errors
    validation.isValid = validation.errors.length === 0;

    console.log('✅ Form population complete:', {
      requiresConfirmation,
      suggestedCorrections,
      validation,
      formState: this.getFormState()
    });

    return {
      formState: this.getFormState(),
      validation,
      requiresConfirmation,
      suggestedCorrections: Object.keys(suggestedCorrections).length > 0 ? suggestedCorrections : undefined
    };
  }

  /**
   * Validate the current form state
   */
  private validateForm(): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required fields validation
    const requiredFields = ['gradeLevel', 'subject', 'resourceType'];
    for (const fieldId of requiredFields) {
      const field = this.formState.fields[fieldId];
      if (!field?.value) {
        errors.push({
          field: fieldId,
          message: `${this.formatFieldName(fieldId)} is required`,
          suggestedFix: `Please specify a ${this.formatFieldName(fieldId).toLowerCase()}`
        });
      }
    }

    // Resource type specific validation
    const resourceType = this.formState.fields.resourceType?.value;
    const format = this.formState.fields.format?.value;

    if (resourceType && format) {
      const validFormats = this.getValidFormatsForType(resourceType);
      if (validFormats && !validFormats.includes(format)) {
        warnings.push({
          field: 'format',
          message: `Invalid format "${format}" for ${resourceType}`,
          suggestion: `Available formats: ${validFormats.join(', ')}`
        });
      }
    }

    // Problem count validation
    const problemCount = this.formState.fields.problemCount?.value;
    if (problemCount !== undefined) {
      if (problemCount < 1 || problemCount > 50) {
        warnings.push({
          field: 'problemCount',
          message: 'Number of problems should be between 1 and 50',
          suggestion: 'Using default of 10 problems'
        });
      }
    }

    // Subject-specific validation
    const subject = this.formState.fields.subject?.value;
    if (subject) {
      this.validateSubjectSpecificFields(subject, warnings);
    }

    this.formState.isValid = errors.length === 0;

    return {
      isValid: this.formState.isValid,
      errors,
      warnings
    };
  }

  /**
   * Get valid formats for a resource type
   */
  private getValidFormatsForType(resourceType: string): string[] | null {
    const formatMap: Record<string, string[]> = {
      worksheet: ['standard', 'guided', 'interactive'],
      quiz: ['multiple_choice', 'true_false', 'short_answer'],
      rubric: ['4_point', '3_point', 'checklist'],
      lesson_plan: ['full_lesson', 'mini_lesson', 'activity'],
      exit_slip: ['multiple_choice', 'open_response', 'rating_scale']
    };

    return formatMap[resourceType] || null;
  }

  /**
   * Validate subject-specific fields
   */
  private validateSubjectSpecificFields(subject: string, warnings: ValidationWarning[]): void {
    switch (subject.toLowerCase()) {
      case 'reading':
        this.validateReadingFields(warnings);
        break;
      case 'math':
        this.validateMathFields(warnings);
        break;
      case 'science':
        this.validateScienceFields(warnings);
        break;
    }
  }

  /**
   * Validate reading-specific fields
   */
  private validateReadingFields(warnings: ValidationWarning[]): void {
    const wordCount = this.formState.fields.wordCount?.value;
    if (wordCount && (wordCount < 100 || wordCount > 1000)) {
      warnings.push({
        field: 'wordCount',
        message: 'Word count should be between 100 and 1000',
        suggestion: 'Using default of 300 words'
      });
    }

    const readingLevel = this.formState.fields.readingLevel?.value;
    if (readingLevel && !['beginner', 'intermediate', 'advanced'].includes(readingLevel)) {
      warnings.push({
        field: 'readingLevel',
        message: 'Invalid reading level',
        suggestion: 'Using default of intermediate'
      });
    }
  }

  /**
   * Validate math-specific fields
   */
  private validateMathFields(warnings: ValidationWarning[]): void {
    // Add math-specific validations here
  }

  /**
   * Validate science-specific fields
   */
  private validateScienceFields(warnings: ValidationWarning[]): void {
    // Add science-specific validations here
  }

  /**
   * Format field name for display
   */
  private formatFieldName(fieldId: string): string {
    return fieldId
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Suggest a correction for grade level
   */
  private suggestGradeLevel(currentGrade: string): string {
    const gradeMap: Record<string, string> = {
      'k': 'Kindergarten',
      'kinder': 'Kindergarten',
      '1': '1st Grade',
      '2': '2nd Grade',
      '3': '3rd Grade',
      '4': '4th Grade',
      '5': '5th Grade'
    };
    return gradeMap[currentGrade.toLowerCase()] || currentGrade;
  }

  /**
   * Suggest a correction for subject
   */
  private suggestSubject(currentSubject: string): string {
    const subjectMap: Record<string, string> = {
      'mathematics': 'Math',
      'english': 'Reading',
      'ela': 'Reading',
      'language arts': 'Reading'
    };
    return subjectMap[currentSubject.toLowerCase()] || currentSubject;
  }

  /**
   * Suggest a correction for resource type
   */
  private suggestResourceType(currentType: string): string {
    const typeMap: Record<string, string> = {
      'test': 'quiz',
      'assessment': 'quiz',
      'exam': 'quiz',
      'practice': 'worksheet',
      'exercise': 'worksheet',
      'activity': 'worksheet',
      'grading guide': 'rubric',
      'scoring guide': 'rubric',
      'teaching plan': 'lesson_plan',
      'exit ticket': 'exit_slip'
    };
    return typeMap[currentType.toLowerCase()] || currentType;
  }
} 