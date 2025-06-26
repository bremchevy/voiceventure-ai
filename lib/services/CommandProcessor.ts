import { ResourceType } from '@/types';

export interface NLPResult {
  gradeLevel: string | null;
  subject: string | null;
  resourceType: ResourceType;
  specifications: ResourceSpecs;
  confidence: number;
}

export interface ResourceSpecs {
  theme?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  topicArea?: string;
  customInstructions?: string;
  problemCount?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
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

export class CommandProcessor {
  // Grade level patterns with confidence scores
  private readonly gradePatterns = [
    { pattern: /\b(kindergarten|kinder|k)\b/i, grade: "Kindergarten", confidence: 1.0 },
    { pattern: /\b(1st\s+grade|first\s+grade|grade\s+1|grade\s+one)\b/i, grade: "1st Grade", confidence: 1.0 },
    { pattern: /\b(2nd\s+grade|second\s+grade|grade\s+2|grade\s+two)\b/i, grade: "2nd Grade", confidence: 1.0 },
    { pattern: /\b(3rd\s+grade|third\s+grade|grade\s+3|grade\s+three)\b/i, grade: "3rd Grade", confidence: 1.0 },
    { pattern: /\b(4th\s+grade|fourth\s+grade|grade\s+4|grade\s+four)\b/i, grade: "4th Grade", confidence: 1.0 },
    { pattern: /\b(5th\s+grade|fifth\s+grade|grade\s+5|grade\s+five)\b/i, grade: "5th Grade", confidence: 1.0 },
    // Partial matches with lower confidence
    { pattern: /\b(1st|first)\b/i, grade: "1st Grade", confidence: 0.8 },
    { pattern: /\b(2nd|second)\b/i, grade: "2nd Grade", confidence: 0.8 },
    { pattern: /\b(3rd|third)\b/i, grade: "3rd Grade", confidence: 0.8 },
    { pattern: /\b(4th|fourth)\b/i, grade: "4th Grade", confidence: 0.8 },
    { pattern: /\b(5th|fifth)\b/i, grade: "5th Grade", confidence: 0.8 },
  ];

  // Subject patterns with confidence scores
  private readonly subjectPatterns = [
    // Primary subject matches with high confidence
    { pattern: /\b(math|mathematics)\b/i, subject: "Math", confidence: 1.0 },
    { pattern: /\b(reading|english|language\s+arts|ela)\b/i, subject: "Reading", confidence: 1.0 },
    { pattern: /\b(science)\b/i, subject: "Science", confidence: 1.0 },
    { pattern: /\b(general|general\s+knowledge|general\s+studies)\b/i, subject: "General", confidence: 1.0 },
    
    // Subject-specific contexts with high confidence
    { pattern: /\b(science\s+worksheet|science\s+experiment|science\s+lab|science\s+lesson)\b/i, subject: "Science", confidence: 1.0 },
    { pattern: /\b(book\s+report|reading\s+comprehension)\b/i, subject: "Reading", confidence: 1.0 },
    { pattern: /\b(math\s+problems|math\s+practice)\b/i, subject: "Math", confidence: 1.0 },
    { pattern: /\b(quiz|test|assessment|general\s+review)\b/i, subject: "General", confidence: 0.8 },
    
    // Science topics with high confidence
    { pattern: /\b(biology|chemistry|physics|earth science|environmental science)\b/i, subject: "Science", confidence: 1.0 },
    { pattern: /\b(water\s+cycle|solar\s+system|weather|climate|ecosystem|food\s+chain|food\s+web)\b/i, subject: "Science", confidence: 1.0 },
    { pattern: /\b(plants|animals|habitats|life\s+cycle|adaptation|evolution|cells|organism)\b/i, subject: "Science", confidence: 1.0 },
    { pattern: /\b(matter|energy|forces|motion|gravity|magnetism|electricity|sound|light)\b/i, subject: "Science", confidence: 1.0 },
    { pattern: /\b(rocks|minerals|volcanoes|earthquakes|plate\s+tectonics|erosion|weathering)\b/i, subject: "Science", confidence: 1.0 },
    { pattern: /\b(planets|stars|space|moon|phases|constellations|universe|galaxy)\b/i, subject: "Science", confidence: 1.0 },
    { pattern: /\b(human\s+body|organs|muscles|bones|digestive|respiratory|circulatory)\b/i, subject: "Science", confidence: 1.0 },
    { pattern: /\b(pollution|conservation|recycling|environment|habitat|biodiversity)\b/i, subject: "Science", confidence: 1.0 },
    { pattern: /\b(chemical\s+reactions|molecules|atoms|elements|compounds|mixtures)\b/i, subject: "Science", confidence: 1.0 },
    
    // Math topics with high confidence
    { pattern: /\b(algebra|geometry|arithmetic|calculus|trigonometry)\b/i, subject: "Math", confidence: 0.9 },
    { pattern: /\b(addition|subtraction|multiplication|division|fractions|decimals|percentages)\b/i, subject: "Math", confidence: 0.9 },
    
    // Reading topics with high confidence
    { pattern: /\b(comprehension|literacy|vocabulary|grammar|punctuation)\b/i, subject: "Reading", confidence: 0.9 },
    { pattern: /\b(story|narrative|poetry|fiction|non-fiction|literature)\b/i, subject: "Reading", confidence: 0.9 },
    
    // General topics with high confidence
    { pattern: /\b(history|geography|social\s+studies|current\s+events)\b/i, subject: "General", confidence: 0.9 },
    { pattern: /\b(critical\s+thinking|study\s+skills|test\s+prep|review)\b/i, subject: "General", confidence: 0.9 },
    
    // Partial matches with lower confidence - only use if no higher confidence matches
    { pattern: /\b(numbers|counting)\b/i, subject: "Math", confidence: 0.7 },
    { pattern: /\b(book|writing)\b/i, subject: "Reading", confidence: 0.7 },
    { pattern: /\b(nature|experiment|lab)\b/i, subject: "Science", confidence: 0.7 },
    { pattern: /\b(knowledge|learning|education)\b/i, subject: "General", confidence: 0.7 }
  ];

  // Resource type patterns with confidence scores
  private readonly resourceTypePatterns = [
    { pattern: /\b(worksheet|practice\s+sheet|activity\s+sheet)\b/i, type: "worksheet", confidence: 1.0 },
    { pattern: /\b(quiz|test|assessment|exam)\b/i, type: "quiz", confidence: 1.0 },
    { pattern: /\b(rubric|grading\s+guide|scoring\s+guide)\b/i, type: "rubric", confidence: 1.0 },
    { pattern: /\b(lesson\s+plan|teaching\s+plan)\b/i, type: "lesson_plan", confidence: 1.0 },
    { pattern: /\b(exit\s+slip|exit\s+ticket)\b/i, type: "exit_slip", confidence: 1.0 },
    // Partial matches with lower confidence
    { pattern: /\b(practice|exercise|activity)\b/i, type: "worksheet", confidence: 0.7 },
    { pattern: /\b(questions|problems)\b/i, type: "worksheet", confidence: 0.6 },
  ];

  /**
   * Parse the grade level from the transcript
   * @param transcript The voice command transcript
   * @returns The detected grade level and confidence score
   */
  public parseGradeLevel(transcript: string): { grade: string | null; confidence: number } {
    for (const { pattern, grade, confidence } of this.gradePatterns) {
      if (pattern.test(transcript)) {
        return { grade, confidence };
      }
    }
    return { grade: null, confidence: 0 };
  }

  /**
   * Parse the subject from the transcript
   * @param transcript The voice command transcript
   * @returns The detected subject and confidence score
   */
  public parseSubject(transcript: string): { subject: string | null; confidence: number } {
    let bestMatch = { subject: null, confidence: 0 };

    // Check each pattern and keep track of the best match
    for (const { pattern, subject, confidence } of this.subjectPatterns) {
      if (pattern.test(transcript)) {
        // Only update if we find a higher confidence match
        if (confidence > bestMatch.confidence) {
          bestMatch = { subject, confidence };
        }
      }
    }

    return bestMatch;
  }

  /**
   * Parse the resource type from the transcript
   * @param transcript The voice command transcript
   * @returns The detected resource type and confidence score
   */
  public parseResourceType(transcript: string): { type: ResourceType; confidence: number } {
    for (const { pattern, type, confidence } of this.resourceTypePatterns) {
      if (pattern.test(transcript)) {
        return { type: type as ResourceType, confidence };
      }
    }
    // Default to worksheet with low confidence
    return { type: "worksheet", confidence: 0.5 };
  }

  /**
   * Parse additional specifications from the transcript
   * @param transcript The voice command transcript
   * @returns The detected specifications
   */
  public parseSpecifications(transcript: string): ResourceSpecs {
    const specs: ResourceSpecs = {};
    const lowerTranscript = transcript.toLowerCase();

    // Detect theme
    if (lowerTranscript.includes('halloween') || lowerTranscript.includes('spooky')) {
      specs.theme = 'Halloween';
    } else if (lowerTranscript.includes('winter') || lowerTranscript.includes('christmas')) {
      specs.theme = 'Winter';
    } else if (lowerTranscript.includes('spring') || lowerTranscript.includes('garden')) {
      specs.theme = 'Spring';
    }

    // Detect difficulty
    if (lowerTranscript.includes('easy') || lowerTranscript.includes('basic')) {
      specs.difficulty = 'easy';
    } else if (lowerTranscript.includes('hard') || lowerTranscript.includes('advanced')) {
      specs.difficulty = 'hard';
    } else {
      specs.difficulty = 'medium';
    }

    // Extract topic area
    const topicMatch = lowerTranscript.match(/\babout\s+([^,.]+)/i);
    if (topicMatch) {
      specs.topicArea = topicMatch[1].trim();
    }

    // Extract problem count
    const countMatch = lowerTranscript.match(/\b(\d+)\s*(questions|problems|exercises)\b/i);
    if (countMatch) {
      specs.problemCount = parseInt(countMatch[1]);
    }

    // Extract custom instructions
    const instructionsMatch = lowerTranscript.match(/\bwith\s+([^,.]+)/i);
    if (instructionsMatch) {
      specs.customInstructions = instructionsMatch[1].trim();
    }

    return specs;
  }

  /**
   * Process the complete voice command and return structured NLP result
   * @param transcript The voice command transcript
   * @returns Structured NLP result with all detected information
   */
  public processCommand(transcript: string): NLPResult {
    const { grade, confidence: gradeConfidence } = this.parseGradeLevel(transcript);
    const { subject, confidence: subjectConfidence } = this.parseSubject(transcript);
    const { type: resourceType, confidence: resourceConfidence } = this.parseResourceType(transcript);
    const specifications = this.parseSpecifications(transcript);

    // Validate subject detection
    let validatedSubject = subject;
    let validatedConfidence = subjectConfidence;

    // If we have a topic area, use it to validate or override the subject
    if (specifications.topicArea) {
      const topicLower = specifications.topicArea.toLowerCase();
      
      // Science topics should override with high confidence
      if (topicLower.includes('water cycle') || 
          topicLower.includes('solar system') ||
          topicLower.includes('weather') ||
          topicLower.includes('climate') ||
          topicLower.includes('ecosystem') ||
          topicLower.includes('biology') ||
          topicLower.includes('chemistry') ||
          topicLower.includes('physics')) {
        validatedSubject = 'Science';
        validatedConfidence = 1.0;
      }
      
      // Math topics should override with high confidence
      else if (topicLower.includes('algebra') ||
               topicLower.includes('geometry') ||
               topicLower.includes('arithmetic') ||
               topicLower.includes('multiplication') ||
               topicLower.includes('division') ||
               topicLower.includes('fraction')) {
        validatedSubject = 'Math';
        validatedConfidence = 1.0;
      }
    }

    // Calculate overall confidence based on required fields
    const confidence = (gradeConfidence + validatedConfidence + resourceConfidence) / 3;

    return {
      gradeLevel: grade,
      subject: validatedSubject,
      resourceType,
      specifications,
      confidence
    };
  }

  /**
   * Validate the form data after population
   * @param formData The populated form data
   * @returns Validation result with any errors or warnings
   */
  public validatePopulation(formData: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required fields validation
    if (!formData.gradeLevel) {
      errors.push({
        field: 'gradeLevel',
        message: 'Grade level is required',
        suggestedFix: 'Please specify a grade level (e.g., "3rd grade")'
      });
    }

    if (!formData.subject) {
      errors.push({
        field: 'subject',
        message: 'Subject is required',
        suggestedFix: 'Please specify a subject (e.g., "math")'
      });
    }

    // Specifications validation
    if (formData.specifications?.problemCount) {
      if (formData.specifications.problemCount < 1 || formData.specifications.problemCount > 50) {
        warnings.push({
          field: 'problemCount',
          message: 'Problem count should be between 1 and 50',
          suggestion: 'Using default problem count of 10'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}