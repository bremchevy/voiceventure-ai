import { NLPResult, ValidationResult, ValidationError, ValidationWarning } from './CommandProcessor';

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

export interface PopulationResult {
  formState: FormState;
  validation: ValidationResult;
  requiresConfirmation: boolean;
  suggestedCorrections?: Record<string, string>;
}

export class FormPopulator {
  private formState: FormState = {
    fields: {},
    isValid: false,
    isDirty: false
  };

  /**
   * Initialize form state with default values
   * @param fields Initial form fields configuration
   */
  constructor(fields: Record<string, any> = {}) {
    this.formState.fields = Object.entries(fields).reduce((acc, [id, value]) => {
      acc[id] = {
        id,
        value,
        isValid: true,
        isTouched: false
      };
      return acc;
    }, {} as Record<string, FormField>);
  }

  /**
   * Map NLP result to form fields
   * @param nlpResult The processed command result
   * @returns Population result with form state and validation
   */
  public populateForm(nlpResult: NLPResult): PopulationResult {
    const { gradeLevel, subject, resourceType, specifications, confidence } = nlpResult;
    const requiresConfirmation = confidence < 0.8;
    const suggestedCorrections: Record<string, string> = {};

    // Update form fields based on NLP result
    this.updateField('gradeLevel', gradeLevel);
    this.updateField('subject', subject);
    this.updateField('resourceType', resourceType);

    // Handle specifications
    if (specifications.theme) {
      this.updateField('theme', specifications.theme);
    }
    if (specifications.difficulty) {
      this.updateField('difficulty', specifications.difficulty);
    }
    if (specifications.problemCount) {
      this.updateField('problemCount', specifications.problemCount);
    }
    if (specifications.topicArea) {
      this.updateField('topicArea', specifications.topicArea);
    }
    if (specifications.customInstructions) {
      this.updateField('customInstructions', specifications.customInstructions);
    }

    // Validate the populated form
    const validation = this.validateForm();

    // Generate suggested corrections for low confidence fields
    if (confidence < 0.8) {
      if (gradeLevel && confidence < 0.7) {
        suggestedCorrections.gradeLevel = this.suggestGradeLevel(gradeLevel);
      }
      if (subject && confidence < 0.7) {
        suggestedCorrections.subject = this.suggestSubject(subject);
      }
    }

    return {
      formState: this.formState,
      validation,
      requiresConfirmation,
      suggestedCorrections: Object.keys(suggestedCorrections).length > 0 ? suggestedCorrections : undefined
    };
  }

  /**
   * Update a single form field
   * @param fieldId Field identifier
   * @param value New field value
   */
  private updateField(fieldId: string, value: any): void {
    this.formState.fields[fieldId] = {
      id: fieldId,
      value,
      isValid: true,
      isTouched: true
    };
    this.formState.isDirty = true;
  }

  /**
   * Validate the current form state
   * @returns Validation result
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
          message: `${fieldId} is required`,
          suggestedFix: `Please specify a ${fieldId.toLowerCase()}`
        });
      }
    }

    // Field-specific validation
    const problemCount = this.formState.fields.problemCount?.value;
    if (problemCount && (problemCount < 1 || problemCount > 50)) {
      warnings.push({
        field: 'problemCount',
        message: 'Problem count should be between 1 and 50',
        suggestion: 'Using default problem count of 10'
      });
    }

    this.formState.isValid = errors.length === 0;

    return {
      isValid: this.formState.isValid,
      errors,
      warnings
    };
  }

  /**
   * Suggest a correction for grade level
   * @param currentGrade Current grade level value
   * @returns Suggested grade level
   */
  private suggestGradeLevel(currentGrade: string): string {
    const gradeMap: Record<string, string> = {
      'first': '1st Grade',
      'second': '2nd Grade',
      'third': '3rd Grade',
      'fourth': '4th Grade',
      'fifth': '5th Grade',
      // Add more mappings as needed
    };
    return gradeMap[currentGrade.toLowerCase()] || currentGrade;
  }

  /**
   * Suggest a correction for subject
   * @param currentSubject Current subject value
   * @returns Suggested subject
   */
  private suggestSubject(currentSubject: string): string {
    const subjectMap: Record<string, string> = {
      'mathematics': 'Math',
      'english': 'Reading',
      'ela': 'Reading',
      'general knowledge': 'General',
      'general studies': 'General',
      'general': 'General'
      // Add more mappings as needed
    };
    return subjectMap[currentSubject.toLowerCase()] || currentSubject;
  }

  /**
   * Get the current form state
   * @returns Current form state
   */
  public getFormState(): FormState {
    return this.formState;
  }

  /**
   * Reset the form to its initial state
   */
  public resetForm(): void {
    Object.keys(this.formState.fields).forEach(fieldId => {
      this.formState.fields[fieldId] = {
        id: fieldId,
        value: null,
        isValid: true,
        isTouched: false
      };
    });
    this.formState.isValid = false;
    this.formState.isDirty = false;
  }
} 