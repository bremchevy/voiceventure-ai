import { ResourceType, Subject, Format, MathFormat, ReadingFormat, ScienceFormat } from '@/lib/types/generator-types';

export interface NLPResult {
  subject: string | null;
  grade: string | null;
  resourceType: string | null;
  specifications: ResourceSpecs;
  confidence: number;
}

interface ResourceSpecs {
  topicArea?: string;
  difficulty?: string;
  format?: string;
  questionCount?: number;
  customInstructions?: string;
  theme?: string;
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

type SubjectFormats = {
  [K in Subject]?: Format[];
} & {
  all?: string[];
};

interface ResourceTypePattern {
  pattern: RegExp;
  type: ResourceType;
  confidence: number;
  formats: SubjectFormats;
}

function isValidSubject(subject: string): subject is Subject {
  return ['Math', 'Reading', 'Science'].includes(subject);
}

export class CommandProcessor {
  // Grade normalization mapping
  private readonly gradeNormalization: Record<string, string> = {
    // Numbers to grade
    "1": "1st Grade",
    "2": "2nd Grade",
    "3": "3rd Grade",
    "4": "4th Grade",
    "5": "5th Grade",
    "6": "6th Grade",
    "7": "7th Grade",
    "8": "8th Grade",
    "9": "9th Grade",
    "10": "10th Grade",
    "11": "11th Grade",
    "12": "12th Grade",
    
    // Words to grade
    "first": "1st Grade",
    "second": "2nd Grade",
    "third": "3rd Grade",
    "fourth": "4th Grade",
    "fifth": "5th Grade",
    "sixth": "6th Grade",
    "seventh": "7th Grade",
    "eighth": "8th Grade",
    "ninth": "9th Grade",
    "tenth": "10th Grade",
    "eleventh": "11th Grade",
    "twelfth": "12th Grade",
    
    // Ordinals to grade
    "1st": "1st Grade",
    "2nd": "2nd Grade",
    "3rd": "3rd Grade",
    "4th": "4th Grade",
    "5th": "5th Grade",
    "6th": "6th Grade",
    "7th": "7th Grade",
    "8th": "8th Grade",
    "9th": "9th Grade",
    "10th": "10th Grade",
    "11th": "11th Grade",
    "12th": "12th Grade",
    
    // Special cases
    "k": "Kindergarten",
    "kindergarten": "Kindergarten",
    "kinder": "Kindergarten"
  };

  // Educational context terms to boost confidence
  private readonly educationalTerms = [
    /\b(?:teach|teaching|teacher|student|students|class|classroom|lesson|curriculum|education|school|learning|learners?)\b/i,
    /\b(?:for|in|to|with)\b.*?\b(?:grade|graders?)\b/i,
    /\b(?:elementary|middle|high)\s*school\b/i
  ];

  // Helper function to normalize grade format
  private normalizeGrade(grade: string): string | null {
    console.log('📝 Normalizing grade:', grade);

    // Handle Kindergarten
    if (/kindergarten/i.test(grade)) {
      return 'Kindergarten';
    }

    // Extract numeric grade
    const numericMatch = grade.match(/(\d+)/);
    if (numericMatch) {
      const gradeNum = parseInt(numericMatch[1]);
      if (gradeNum >= 1 && gradeNum <= 12) {
        const suffix = gradeNum === 1 ? 'st' : 
                      gradeNum === 2 ? 'nd' : 
                      gradeNum === 3 ? 'rd' : 'th';
        return `${gradeNum}${suffix} Grade`;
      }
    }

    // Handle grade ranges
    if (/elementary/i.test(grade)) return '3rd Grade';
    if (/middle/i.test(grade)) return '7th Grade';
    if (/high/i.test(grade)) return '10th Grade';

    console.log('⚠️ Could not normalize grade:', grade);
    return grade; // Return the original grade if we can't normalize it
  }

  // Helper function to check educational context
  private hasEducationalContext(transcript: string): boolean {
    return this.educationalTerms.some(pattern => pattern.test(transcript));
  }

  // Grade patterns with confidence scores and improved matching
  private readonly gradePatterns: Array<{
    pattern: RegExp;
    grade: string;
    confidence: number;
    requiresContext?: boolean;
  }> = [
    // Exact grade matches with word boundaries and variations
    { 
      pattern: /\b(?:kindergarten|kinder)\b|\bk\b(?!\w)/i, 
      grade: "Kindergarten", 
      confidence: 1.0 
    },
    { 
      pattern: /\b(?:1st|first)\s*grade\b|\bgrade\s*(?:1|one)\b|\b(?:1st|first)\s*graders?\b/i,
      grade: "1st Grade", 
      confidence: 1.0 
    },
    { 
      pattern: /\b(?:2nd|second)\s*grade\b|\bgrade\s*(?:2|two)\b|\b(?:2nd|second)\s*graders?\b/i,
      grade: "2nd Grade", 
      confidence: 1.0 
    },
    { 
      pattern: /\b(?:3rd|third)\s*grade\b|\bgrade\s*(?:3|three)\b|\b(?:3rd|third)\s*graders?\b/i,
      grade: "3rd Grade", 
      confidence: 1.0 
    },
    { 
      pattern: /\b(?:4th|fourth)\s*grade\b|\bgrade\s*(?:4|four)\b|\b(?:4th|fourth)\s*graders?\b|\b4\s*graders?\b/i,
      grade: "4th Grade", 
      confidence: 1.0 
    },
    { 
      pattern: /\b(?:5th|fifth)\s*grade\b|\bgrade\s*(?:5|five)\b|\b(?:5th|fifth)\s*graders?\b|\b5\s*graders?\b|\bfifth[-\s]?graders?\b/i,
      grade: "5th Grade", 
      confidence: 1.0 
    },
    { 
      pattern: /\b(?:6th|sixth)\s*grade\b|\bgrade\s*(?:6|six)\b|\b(?:6th|sixth)\s*graders?\b|\b6\s*graders?\b|\bsixth[-\s]?graders?\b/i,
      grade: "6th Grade", 
      confidence: 1.0 
    },
    { 
      pattern: /\b(?:7th|seventh)\s*grade\b|\bgrade\s*(?:7|seven)\b|\b(?:7th|seventh)\s*graders?\b|\b7\s*graders?\b|\bseventh[-\s]?graders?\b/i,
      grade: "7th Grade", 
      confidence: 1.0 
    },
    { 
      pattern: /\b(?:8th|eighth)\s*grade\b|\bgrade\s*(?:8|eight)\b|\b(?:8th|eighth)\s*graders?\b|\b8\s*graders?\b|\beighth[-\s]?graders?\b/i,
      grade: "8th Grade", 
      confidence: 1.0 
    },
    { 
      pattern: /\b(?:9th|ninth)\s*grade\b|\bgrade\s*(?:9|nine)\b|\b(?:9th|ninth)\s*graders?\b|\b9\s*graders?\b|\bninth[-\s]?graders?\b/i,
      grade: "9th Grade", 
      confidence: 1.0 
    },
    { 
      pattern: /\b(?:10th|tenth)\s*grade\b|\bgrade\s*(?:10|ten)\b|\b(?:10th|tenth)\s*graders?\b|\b10\s*graders?\b|\btenth[-\s]?graders?\b/i,
      grade: "10th Grade", 
      confidence: 1.0 
    },
    { 
      pattern: /\b(?:11th|eleventh)\s*grade\b|\bgrade\s*(?:11|eleven)\b|\b(?:11th|eleventh)\s*graders?\b|\b11\s*graders?\b|\beleventh[-\s]?graders?\b/i,
      grade: "11th Grade", 
      confidence: 1.0 
    },
    { 
      pattern: /\b(?:12th|twelfth)\s*grade\b|\bgrade\s*(?:12|twelve)\b|\b(?:12th|twelfth)\s*graders?\b|\b12\s*graders?\b|\btwelfth[-\s]?graders?\b/i,
      grade: "12th Grade", 
      confidence: 1.0 
    },
    // Grade bands with context requirement
    { 
      pattern: /\b(?:elementary|primary)\s*school\b/i,
      grade: "Elementary School", 
      confidence: 0.6,
      requiresContext: true
    },
    { 
      pattern: /\b(?:middle|intermediate)\s*school\b/i,
      grade: "Middle School",
      confidence: 0.6,
      requiresContext: true
    },
    { 
      pattern: /\bhigh\s*school\b/i,
      grade: "High School",
      confidence: 0.6,
      requiresContext: true
    }
  ];

  // Subject detection patterns
  private readonly SUBJECT_PATTERNS = {
    Reading: /\b(?:reading|literacy|english|language\s*arts|ela|spelling|vocabulary|phonics|writing|grammar|main\s*idea|comprehension|literature|story|text|book)\b/i,
    Math: /\b(?:math|mathematics|arithmetic|algebra|geometry|calculus|fractions?|decimals?|percentages?|ratios?|equations?|multiplication|division|addition|subtraction)\b/i,
    Science: /\b(?:science|biology|chemistry|physics|earth\s*science|photosynthesis|cells?|atoms?|molecules?|ecosystem|plants?|animals?|weather|energy|force|matter|experiments?|lab(?:oratory)?|scientific|observation|hypothesis)\b/i
  };

  // Grade level detection patterns
  private readonly GRADE_PATTERNS = {
    explicit: /\b(\d+)(?:st|nd|rd|th)?\s*grade\b/i,
    numeric: /\b(\d+)\b/,
    kindergarten: /\bkindergarten\b/i,
    gradeRanges: {
      elementary: /\b(?:elementary|primary)\b/i,
      middle: /\b(?:middle|junior\s*high)\b/i,
      high: /\b(?:high\s*school|secondary)\b/i
    }
  };

  // Subject patterns with improved accuracy and context awareness
  private readonly subjectPatterns = [
    {
      subject: 'Science',
      pattern: /\b(?:science|biology|chemistry|physics|earth\s*science)\b/i,
      topics: [
        // Biology
        { pattern: /\b(?:photosynthesis|cells?|organisms?|biology|ecosystem|plants?|animals?|life|living|genetics?)\b/i },
        // Chemistry
        { pattern: /\b(?:chemistry|chemical|reactions?|atoms?|molecules?|elements?|compounds?|matter)\b/i },
        // Physics
        { pattern: /\b(?:physics|force|motion|energy|gravity|light|sound|electricity|magnetism)\b/i },
        // Earth Science
        { pattern: /\b(?:earth|space|planets?|weather|climate|rocks?|minerals?|geology|atmosphere)\b/i }
      ],
      confidence: 0.9,
      negativePatterns: [
        /\b(?:math|calculate|solve|equation)\b/i,
        /\b(?:reading|write|text|book)\b/i
      ]
    },
    {
      subject: 'Math',
      pattern: /\b(?:math|mathematics|arithmetic|algebra|geometry|calculus)\b/i,
      topics: [
        { pattern: /\b(?:add|subtract|multiply|divide|operations?)\b/i },
        { pattern: /\b(?:fractions?|decimals?|percentages?|ratios?)\b/i },
        { pattern: /\b(?:geometry|shapes?|angles?|area|volume)\b/i },
        { pattern: /\b(?:algebra|equations?|variables?|solve)\b/i }
      ],
      confidence: 0.9,
      negativePatterns: [
        /\b(?:science|experiment|hypothesis)\b/i,
        /\b(?:reading|write|text|book)\b/i
      ]
    },
    {
      subject: 'Reading',
      pattern: /\b(?:reading|literacy|english|language\s*arts|ela)\b/i,
      topics: [
        { pattern: /\b(?:comprehension|understand|summary|main\s*idea)\b/i },
        { pattern: /\b(?:vocabulary|words?|spelling|definition)\b/i },
        { pattern: /\b(?:grammar|punctuation|sentences?|paragraphs?)\b/i },
        { pattern: /\b(?:literature|stories?|poems?|texts?)\b/i }
      ],
      confidence: 0.9,
      negativePatterns: [
        /\b(?:math|calculate|solve|equation)\b/i,
        /\b(?:science|experiment|hypothesis)\b/i
      ]
    }
  ];

  // Resource type patterns with improved accuracy
  private readonly resourceTypePatterns: ResourceTypePattern[] = [
    {
      pattern: /\b(?:worksheets?|practice\s*sheets?|activity\s*sheets?|practice\s*problems?|exercises?|problems?\s*(?:for|about|on)|make\s*(?:a|some)?\s*(?:worksheets?|practice|problems?)|create\s*(?:a|some)?\s*(?:worksheets?|practice|problems?))\b/i,
      type: "worksheet",
      confidence: 0.9,
      formats: {
        Math: ["standard", "guided", "interactive"] as Format[],
        Reading: ["comprehension", "vocabulary_context", "literary_analysis"] as Format[],
        Science: ["science_context", "analysis_focus", "lab_experiment"] as Format[],
        all: ["standard", "guided", "interactive"] as Format[]
      }
    },
    {
      pattern: /\b(?:quiz|test|assessment|exam|evaluation|check|review)\b/i,
      type: "quiz",
      confidence: 0.8,
      formats: {
        Math: ["standard", "guided", "interactive"] as Format[],
        Reading: ["comprehension", "vocabulary_context", "literary_analysis"] as Format[],
        Science: ["science_context", "analysis_focus", "lab_experiment"] as Format[],
        all: ["multiple_choice", "true_false", "short_answer"] as Format[]
      }
    },
    {
      pattern: /\b(?:rubric|grading\s*guide|scoring\s*guide|assessment\s*criteria|evaluation\s*guide|criteria|standards?)\b/i,
      type: "rubric",
      confidence: 0.7,
      formats: {
        Math: ["standard", "guided", "interactive"] as Format[],
        Reading: ["comprehension", "vocabulary_context", "literary_analysis"] as Format[],
        Science: ["science_context", "analysis_focus", "lab_experiment"] as Format[],
        all: ["4_point", "3_point", "checklist"] as Format[]
      }
    },
    {
      pattern: /\b(?:lesson(?:\s*plan)?|teaching\s*plan|unit\s*plan|instruction\s*guide|teach|instruct|lesson\s*about|plan\s*(?:for|about|on|to\s*teach)|plan\s*a?\s*lesson|plan\s*(?:a|the|my|this|that|an?|some|new)?\s*(?:class|course|unit|topic|subject|activity|learning|instruction|teaching|education)|plan\s*to\s*(?:teach|cover|introduce|review|practice|learn|study|work\s*on)|prepare\s*(?:a|the|my|this|that|an?|some|new)?\s*(?:lesson|class|course|unit|topic|subject|activity|learning|instruction|teaching|education)|create\s*(?:a|the|my|this|that|an?|some|new)?\s*(?:lesson|class|course|unit|topic|subject|activity|learning|instruction|teaching|education)|design\s*(?:a|the|my|this|that|an?|some|new)?\s*(?:lesson|class|course|unit|topic|subject|activity|learning|instruction|teaching|education))\b/i,
      type: "lesson_plan",
      confidence: 0.9,
      formats: {
        Math: ["standard", "guided", "interactive"] as Format[],
        Reading: ["comprehension", "vocabulary_context", "literary_analysis"] as Format[],
        Science: ["science_context", "analysis_focus", "lab_experiment"] as Format[],
        all: ["full_lesson", "mini_lesson", "activity"] as Format[]
      }
    },
    {
      pattern: /\b(?:exit\s*slip|exit\s*ticket|bell\s*-?\s*ringer|warm[\\s-]?up|starter|opening\s*activity|daily\s*starter|entrance\s*ticket|closure\s*activity|wrap[\s-]?up|quick\s*check)\b/i,
      type: "exit_slip",
      confidence: 0.8,
      formats: {
        Math: ["standard", "guided", "interactive"] as Format[],
        Reading: ["comprehension", "vocabulary_context", "literary_analysis"] as Format[],
        Science: ["science_context", "analysis_focus", "lab_experiment"] as Format[],
        all: ["reflection_prompt", "vocabulary_check", "skill_assessment"] as Format[]
      }
    }
  ];

  // Theme patterns with confidence scores
  private readonly themePatterns = [
    {
      pattern: /\b(halloween|spooky|pumpkin|ghost|witch|trick[\s-]or[\s-]treat|october|costume|monster|bat|spider|skeleton)\b/i,
      theme: "Halloween",
      confidence: 1.0
    },
    {
      pattern: /\b(winter|snow|christmas|holiday|december|cold|ice|snowman|snowflake)\b/i,
      theme: "Winter",
      confidence: 1.0
    },
    {
      pattern: /\b(spring|flower|bloom|garden|butterfly|bee|april|may|growing)\b/i,
      theme: "Spring",
      confidence: 1.0
    }
  ];

  /**
   * Parse the grade level from the transcript with two-stage detection
   */
  public parseGradeLevel(transcript: string): { grade: string | null; confidence: number } {
    console.log('🔍 Starting two-stage grade level detection:', transcript);

    // Stage 1: Extract potential grade matches
    const gradeMatches = this.extractGradeMatches(transcript);
    if (!gradeMatches.length) {
      console.log('❌ No grade matches found in stage 1');
      return { grade: null, confidence: 0 };
    }

    // Stage 2: Validate and normalize matches
    let bestMatch = {
      grade: null as string | null,
      confidence: 0,
      position: -1
    };

    for (const match of gradeMatches) {
      let confidence = match.confidence;
      
      // Normalize the grade
      const normalizedGrade = this.normalizeGrade(match.grade);
      if (!normalizedGrade) {
        console.log(`⚠️ Could not normalize grade: ${match.grade}`);
        continue;
      }

      // Check for educational context
      if (this.hasEducationalContext(transcript)) {
        console.log('📚 Found educational context, boosting confidence to 1');
        confidence = Math.min(1.0, confidence + 0.1);
      }

      // Boost confidence for explicit grade mentions
      if (/\b(\d+)(?:st|nd|rd|th)?\s*grade\b/i.test(match.grade)) {
        console.log('📝 Found explicit grade mention, boosting confidence to 1');
          confidence = Math.min(1.0, confidence + 0.1);
      }

      // Boost confidence for exact grade format
      if (/\b(?:kindergarten|\d+(?:st|nd|rd|th)\s*grade)\b/i.test(match.grade)) {
        console.log('🎯 Found exact grade format, boosting confidence to 1');
        confidence = Math.min(1.0, confidence + 0.1);
      }

      // Update best match if this is better
      if (confidence > bestMatch.confidence) {
        console.log(`✨ New best match: ${normalizedGrade} (confidence: ${confidence})`);
        bestMatch = {
          grade: normalizedGrade,
          confidence,
          position: transcript.indexOf(match.grade)
        };
      }
    }

    console.log('✅ Final grade detection:', { grade: bestMatch.grade, confidence: bestMatch.confidence });
    return { grade: bestMatch.grade, confidence: bestMatch.confidence };
  }

  /**
   * Extract potential grade matches from transcript (Stage 1)
   */
  private extractGradeMatches(transcript: string): Array<{ grade: string; confidence: number }> {
    const matches: Array<{ grade: string; confidence: number }> = [];

    // First try exact matches from normalization map
    const words = transcript.toLowerCase().split(/\b/);
    for (const word of words) {
      if (this.gradeNormalization[word]) {
        matches.push({ grade: word, confidence: 0.9 });
      }
    }

    // Then try regex patterns
    for (const { pattern, grade, confidence } of this.gradePatterns) {
      const found = transcript.match(pattern);
      if (found) {
        matches.push({ grade, confidence });
      }
    }

    // Look for number + grade pattern (e.g., "grade 5", "5 grade")
    const numberGradeMatch = transcript.match(/\b(?:grade\s*(\d{1,2})|(\d{1,2})\s*grade)\b/i);
    if (numberGradeMatch) {
      const number = numberGradeMatch[1] || numberGradeMatch[2];
      if (this.gradeNormalization[number]) {
        matches.push({ grade: number, confidence: 0.95 });
      }
    }

    return matches;
  }

  /**
   * Parse the subject from the transcript with improved accuracy
   */
  public parseSubject(transcript: string): { subject: Subject | null; confidence: number } {
    console.log('🔍 Starting subject detection:', transcript);
    
    let highestConfidence = 0;
    let detectedSubject: Subject | null = null;

    // Check each subject pattern
    for (const [subject, pattern] of Object.entries(this.SUBJECT_PATTERNS)) {
      console.log(`🔍 Testing pattern for ${subject}:`, pattern);
      const matches = transcript.match(pattern);
      if (matches) {
        // Base confidence starts at 0.8
        let confidence = 0.8;
        
        // Increase confidence based on number of matches
        confidence += Math.min(matches.length * 0.1, 0.2);
        
        // Boost confidence for specific keywords
        if (subject === 'Science' && /\b(photosynthesis|cells?|atoms?|molecules?|ecosystem|experiment)\b/i.test(transcript)) {
          confidence += 0.2;
        } else if (subject === 'Math' && /\b(algebra|geometry|calculus|equation)\b/i.test(transcript)) {
          confidence += 0.2;
        } else if (subject === 'Reading' && /\b(comprehension|literature|grammar|vocabulary)\b/i.test(transcript)) {
          confidence += 0.2;
        }
        
        // Cap confidence at 1.0
        confidence = Math.min(confidence, 1.0);
        
        if (confidence > highestConfidence && isValidSubject(subject)) {
          highestConfidence = confidence;
          detectedSubject = subject;
        }
      }
    }

    // If no subject detected but we have science-specific content
    if (!detectedSubject && /\b(photosynthesis|cells?|atoms?|molecules?|ecosystem|plants?|animals?|weather)\b/i.test(transcript)) {
      highestConfidence = 0.9;
      detectedSubject = 'Science';
    }

    // Log the result
    console.log('🎯 Subject detection result:', { subject: detectedSubject, confidence: highestConfidence });
    
    if (highestConfidence < 0.6) {
      console.log('⚠️ Subject confidence too low, returning null');
      return { subject: null, confidence: highestConfidence };
    }

    return { subject: detectedSubject, confidence: highestConfidence };
  }

  /**
   * Parse the resource type and format from the transcript with improved accuracy
   */
  public parseResourceType(transcript: string): { 
    type: ResourceType | null; 
    confidence: number;
    format?: string;
  } {
    let highestConfidence = 0;
    let detectedType: ResourceType | null = null;
    let detectedFormat: string | undefined;

    // First try to detect explicit format from resource type patterns
    for (const { pattern, type, confidence, formats } of this.resourceTypePatterns) {
      if (pattern.test(transcript)) {
        let matchConfidence = confidence;

        // Multiple mentions boost confidence
        const mentions = (transcript.match(pattern) || []).length;
        if (mentions > 1) {
          matchConfidence = Math.min(1.0, matchConfidence + (0.05 * (mentions - 1)));
        }

        // Boost confidence if resource type is mentioned with educational terms
        if (/\b(create|make|generate|need|want)\b.*\b(for|about|on)\b/i.test(transcript)) {
          matchConfidence = Math.min(1.0, matchConfidence + 0.1);
        }

        if (matchConfidence > highestConfidence) {
          highestConfidence = matchConfidence;
          detectedType = type;

          // Try to detect format based on subject
          const { subject } = this.parseSubject(transcript);
          if (subject && isValidSubject(subject) && formats[subject]) {
            detectedFormat = this.inferFormatFromContent(transcript, isValidSubject(subject) ? subject : null);
          }
        }
      }
    }

    // If no explicit type was found, try to infer it
    if (!detectedType) {
      detectedType = this.inferResourceTypeFromContext(transcript);
      if (detectedType) {
        highestConfidence = 0.7; // Set a moderate confidence for inferred types
      }
    }

    // If we have a type but no format, try to infer format from content
    if (detectedType && !detectedFormat) {
      const { subject } = this.parseSubject(transcript);
      detectedFormat = this.inferFormatFromContent(transcript, subject && isValidSubject(subject) ? subject : null);
    }

    // If confidence is too low, return null
    if (highestConfidence < 0.7) {
      return { 
        type: null, 
        confidence: 0,
        format: undefined 
      };
    }

    return { 
      type: detectedType, 
      confidence: highestConfidence,
      format: detectedFormat 
    };
  }

  /**
   * Parse theme from transcript
   */
  private parseTheme(transcript: string): { theme: string | null; confidence: number } {
    let highestConfidence = 0;
    let detectedTheme: string | null = null;

    for (const { pattern, theme, confidence } of this.themePatterns) {
      if (pattern.test(transcript)) {
        if (confidence > highestConfidence) {
          highestConfidence = confidence;
          detectedTheme = theme;
        }
      }
    }

    return { theme: detectedTheme, confidence: highestConfidence };
  }

  /**
   * Process the complete voice command and return structured NLP result
   */
  public processCommand(transcript: string): NLPResult {
    console.log('🎯 Processing command:', transcript);

    // Use improved subject detection
    const subjectResult = this.parseSubject(transcript);
    
    // Use improved grade level detection
    const gradeLevelResult = this.parseGradeLevel(transcript);
    
    // Parse resource type
    const resourceTypeResult = this.parseResourceType(transcript);
    
    // Parse theme
    const themeResult = this.parseTheme(transcript);

    // Extract additional specifications
    const specifications: ResourceSpecs = {
      topicArea: this.extractTopicArea(transcript, subjectResult.subject),
      difficulty: this.extractDifficulty(transcript),
      format: resourceTypeResult.format,
      questionCount: this.extractQuestionCount(transcript),
      customInstructions: this.extractCustomInstructions(transcript),
      theme: themeResult.theme
    };

    // Calculate overall confidence
    const overallConfidence = this.calculateConfidence([
      subjectResult.confidence,
      gradeLevelResult.confidence,
      resourceTypeResult.confidence
    ]);

      return {
      subject: subjectResult.subject,
      grade: gradeLevelResult.grade,
      resourceType: resourceTypeResult.type,
        specifications,
      confidence: overallConfidence
    };
  }

  /**
   * Try to infer resource type from context when not explicitly stated
   */
  private inferResourceTypeFromContext(transcript: string): ResourceType | null {
    // Look for action verbs that suggest a resource type
    if (/\b(practice|solve|complete)\b/i.test(transcript)) {
      return "worksheet";
    }
    if (/\b(test|assess|evaluate|check)\b/i.test(transcript)) {
      return "quiz";
    }
    if (/\b(grade|score|evaluate)\b/i.test(transcript)) {
      return "rubric";
    }
    // Enhanced lesson plan detection
    if (/\b(teach|instruct|present|explain|demonstrate|show|cover|introduce|review|learn|study|work\s*on|prepare|create|design|develop|outline|structure|organize)\b.*\b(class|course|unit|topic|subject|activity|learning|instruction|teaching|education)\b/i.test(transcript) || 
        /\b(plan|prepare|create|design|develop|outline|structure|organize)\b/i.test(transcript)) {
      return "lesson_plan";
    }
    if (/\b(end|finish|conclude|summarize)\b/i.test(transcript)) {
      return "exit_slip";
    }
    return null;
  }

  /**
   * Extract topic area based on subject context
   */
  private extractTopicArea(transcript: string, subject: Subject | null): string | undefined {
    if (!subject || !isValidSubject(subject)) return undefined;

    const subjectPattern = this.subjectPatterns.find(p => isValidSubject(p.subject) && p.subject === subject);
    if (!subjectPattern?.topics) return undefined;

    for (const { pattern } of subjectPattern.topics) {
      const match = transcript.match(pattern);
      if (match) return match[0];
    }

    return undefined;
  }

  /**
   * Extract difficulty level from transcript
   */
  private extractDifficulty(transcript: string): string | undefined {
    const difficultyPatterns = [
      { pattern: /\b(easy|basic|simple|beginner)\b/i, level: "easy" },
      { pattern: /\b(medium|intermediate|moderate)\b/i, level: "medium" },
      { pattern: /\b(hard|difficult|advanced|challenging)\b/i, level: "hard" }
    ];

    for (const { pattern, level } of difficultyPatterns) {
      if (pattern.test(transcript)) return level;
    }

    return undefined;
  }

  /**
   * Extract question count from transcript
   */
  private extractQuestionCount(transcript: string): number | undefined {
    const match = transcript.match(/\b(\d+)\s*(questions?|problems?|items?)\b/i);
    if (match) {
      const count = parseInt(match[1]);
      return count > 0 ? count : undefined;
    }
    return undefined;
  }

  /**
   * Extract custom instructions from transcript
   */
  private extractCustomInstructions(transcript: string): string | undefined {
    const instructionPatterns = [
      /\bwith\s+(.+?)\b(?=\s+and|\s*$)/i,
      /\binclude\s+(.+?)\b(?=\s+and|\s*$)/i,
      /\bmake\s+sure\s+to\s+(.+?)\b(?=\s+and|\s*$)/i
    ];

    for (const pattern of instructionPatterns) {
      const match = transcript.match(pattern);
      if (match) return match[1].trim();
    }

    return undefined;
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
    if (!formData.grade) {
      errors.push({
        field: 'grade',
        message: 'Grade is required',
        suggestedFix: 'Please specify a grade (e.g., "3rd grade")'
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
    if (formData.specifications?.questionCount) {
      if (formData.specifications.questionCount < 1 || formData.specifications.questionCount > 50) {
        warnings.push({
          field: 'questionCount',
          message: 'Question count should be between 1 and 50',
          suggestion: 'Using default question count of 10'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private inferFormatFromContent(transcript: string, subject: Subject | null): string | undefined {
    if (!subject) return undefined;

    // Reading-specific formats
    if (subject === 'Reading') {
      if (/\b(main\s*idea|comprehension|understand|summary|summarize|detail|inference)\b/i.test(transcript)) {
        return 'comprehension';
      }
      if (/\b(vocabulary|word|definition|meaning|context|spell)\b/i.test(transcript)) {
        return 'vocabulary_context';
      }
      if (/\b(character|plot|theme|setting|analyze|literary|author|story)\b/i.test(transcript)) {
        return 'literary_analysis';
      }
    }

    // Math-specific formats
    if (subject === 'Math') {
      if (/\b(step|guide|help|explain|show|work|process)\b/i.test(transcript)) {
        return 'guided';
      }
      if (/\b(interact|hands[\s-]on|manipulative|activity|game)\b/i.test(transcript)) {
        return 'interactive';
      }
    }

    // Science-specific formats
    if (subject === 'Science') {
      if (/\b(lab|experiment|procedure|method|equipment|materials)\b/i.test(transcript)) {
        return 'lab_experiment';
      }
      if (/\b(observe|observation|record|data|collect|measure)\b/i.test(transcript)) {
        return 'observation_analysis';
      }
      if (/\b(concept|apply|theory|principle|understand)\b/i.test(transcript)) {
        return 'concept_application';
      }
    }

    // Default formats based on subject
    const defaultFormats: Record<Subject, string> = {
      Reading: 'comprehension',
      Math: 'standard',
      Science: 'science_context'
    };

    return defaultFormats[subject];
  }

  private calculateConfidence(confidences: number[]): number {
    if (confidences.length === 0) return 0;
    const sum = confidences.reduce((a, b) => a + b, 0);
    return sum / confidences.length;
  }
}