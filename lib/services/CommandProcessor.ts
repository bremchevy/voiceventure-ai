import { ResourceType, Subject, Format, MathFormat, ReadingFormat, ScienceFormat } from '@/lib/types/generator-types';

export interface NLPResult {
  gradeLevel: string | null;
  subject: string | null;
  resourceType: ResourceType | null;
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
    const normalized = this.gradeNormalization[grade.toLowerCase()];
    return normalized || null;
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

  // Subject patterns with improved accuracy and context awareness
  private readonly subjectPatterns = [
    // Reading and Language Arts patterns
    {
      pattern: /\b(?:reading|literacy|english|language\s*arts|ela|spelling|vocabulary|phonics|writing|grammar|main\s*idea|comprehension)\b/i,
      subject: "Reading" as Subject,
      confidence: 0.9,
      topics: [
        { pattern: /\b(?:comprehension|understanding|main\s*idea)\b/i, weight: 0.2 },
        { pattern: /\b(?:vocabulary|words?|definitions?|spelling|word\s*lists?)\b/i, weight: 0.1 },
        { pattern: /\b(?:grammar|punctuation|sentences?|paragraphs?)\b/i, weight: 0.1 },
        { pattern: /\b(?:stories?|narrative|fiction|non-fiction|literature)\b/i, weight: 0.1 },
        { pattern: /\b(?:phonics|sounds?|blending|phonemes?)\b/i, weight: 0.1 }
      ],
      contextPatterns: [
        /\b(?:book|text|passage|story|article)\b/i,
        /\b(?:read|write|compose|analyze)\b/i,
        /\b(?:lesson|teach|learn|understand)\b/i
      ]
    },
    // Math patterns with specific topic recognition
    {
      pattern: /\b(?:math|mathematics|arithmetic|algebra|geometry|calculus|fractions?|decimals?|percentages?|ratios?)\b/i,
      subject: "Math" as Subject,
      confidence: 0.8,
      topics: [
        { pattern: /\b(?:addition|subtraction|multiplication|division|operations?)\b/i, weight: 0.1 },
        { pattern: /\b(?:fractions?|decimals?|percentages?|ratios?)\b/i, weight: 0.1 },
        { pattern: /\b(?:geometry|shapes?|angles?|area|perimeter)\b/i, weight: 0.1 },
        { pattern: /\b(?:algebra|equations?|variables?|expressions?)\b/i, weight: 0.1 },
        { pattern: /\b(?:numbers?|counting|place\s*value)\b/i, weight: 0.1 }
      ],
      contextPatterns: [
        /\b(?:solve|calculate|compute|problem)\b/i,
        /\b(?:number|equation|formula)\b/i
      ]
    },
    // Science patterns with detailed topics
    {
      pattern: /\b(?:science|biology|chemistry|physics|earth\s*science)\b/i,
      subject: "Science" as Subject,
      confidence: 0.8,
      topics: [
        { pattern: /\b(?:life\s*cycles?|plants?|animals?|ecosystems?|biology)\b/i, weight: 0.1 },
        { pattern: /\b(?:matter|energy|forces?|motion|physics)\b/i, weight: 0.1 },
        { pattern: /\b(?:weather|climate|earth|space|geology)\b/i, weight: 0.1 },
        { pattern: /\b(?:scientific\s*method|experiments?|observations?|hypothesis)\b/i, weight: 0.1 },
        { pattern: /\b(?:chemistry|reactions?|elements?|molecules?)\b/i, weight: 0.1 }
      ],
      contextPatterns: [
        /\b(?:experiment|observe|investigate|research)\b/i,
        /\b(?:scientific|natural|physical)\b/i
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
        confidence = Math.min(1.0, confidence + 0.3); // Increased from 0.2 to 0.3
        console.log(`📚 Found educational context, boosting confidence to ${confidence}`);
      }

      // Check position in sentence (prefer grades mentioned earlier)
      const position = transcript.indexOf(match.grade);
      if (position !== -1) {
        // Slight boost for grades mentioned at the start
        if (position < transcript.length / 3) {
          confidence = Math.min(1.0, confidence + 0.1);
          console.log(`📍 Grade mentioned early in sentence, boosting confidence to ${confidence}`);
        }
      }

      // Check for grade clarity (e.g., "grade 5" is clearer than just "5")
      if (/\b(?:grade|graders?)\b/i.test(transcript)) {
        confidence = Math.min(1.0, confidence + 0.25); // Increased from 0.15 to 0.25
        console.log(`📝 Found explicit grade mention, boosting confidence to ${confidence}`);
      }
      
      // Extra boost for exact format like "5th grade" or "grade 5"
      if (/\b(?:\d+(?:st|nd|rd|th)\s+grade|grade\s+\d+)\b/i.test(transcript)) {
        confidence = Math.min(1.0, confidence + 0.2);
        console.log(`🎯 Found exact grade format, boosting confidence to ${confidence}`);
      }

      // Update best match if this one has higher confidence
      if (confidence > bestMatch.confidence || 
         (confidence === bestMatch.confidence && position < bestMatch.position)) {
        bestMatch = {
          grade: normalizedGrade,
          confidence,
          position
        };
        console.log(`✨ New best match: ${normalizedGrade} (confidence: ${confidence})`);
      }
    }

    // Require higher minimum confidence for the two-stage system
    if (bestMatch.confidence < 0.6) { // Lowered from 0.7 to 0.6
      console.log('⚠️ Best match confidence too low:', bestMatch.confidence);
      console.log('🔍 Original transcript:', transcript);
      console.log('📊 All matches:', gradeMatches);
      return { grade: null, confidence: 0 };
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
    console.log('🔍 Starting subject detection in CommandProcessor:', transcript);
    let highestConfidence = 0;
    let detectedSubject: Subject | null = null;

    for (const { pattern, subject, confidence, topics, contextPatterns } of this.subjectPatterns) {
      console.log(`📚 Testing pattern for ${subject}:`, pattern);
      if (pattern.test(transcript)) {
        console.log(`✅ Found match for ${subject}`);
        let matchConfidence = confidence;
        
        // Check for topic matches and add their weights
        if (topics) {
          const topicMatches = topics.filter(topic => topic.pattern.test(transcript));
          console.log(`📖 Found ${topicMatches.length} topic matches for ${subject}`);
          for (const match of topicMatches) {
            matchConfidence = Math.min(1.0, matchConfidence + match.weight);
          }
        }

        // Check for context matches
        if (contextPatterns) {
          const contextMatches = contextPatterns.filter(pattern => pattern.test(transcript)).length;
          if (contextMatches > 0) {
            console.log(`🔍 Found ${contextMatches} context matches for ${subject}`);
            matchConfidence = Math.min(1.0, matchConfidence + (contextMatches * 0.05));
          }
        }

        // Check for negative patterns that might indicate a different subject
        if (isValidSubject(subject)) {
        const hasNegativeMatch = this.checkNegativePatterns(transcript, subject);
        if (hasNegativeMatch) {
          console.log(`⚠️ Found negative pattern match for ${subject}, reducing confidence`);
          matchConfidence *= 0.5; // Reduce confidence if negative patterns found
          }
        }

        // Multiple mentions boost confidence
        const mentions = (transcript.match(pattern) || []).length;
        if (mentions > 1) {
          console.log(`📈 Found ${mentions} mentions of ${subject}, boosting confidence`);
          matchConfidence = Math.min(1.0, matchConfidence + (0.05 * (mentions - 1)));
        }

        // Boost confidence if subject is mentioned with educational terms
        if (this.hasEducationalContext(transcript)) {
          console.log(`📚 Found educational terms with ${subject}, boosting confidence`);
          matchConfidence = Math.min(1.0, matchConfidence + 0.05);
        }

        console.log(`🎯 Confidence for ${subject}:`, matchConfidence);

        if (matchConfidence > highestConfidence) {
          highestConfidence = matchConfidence;
          detectedSubject = subject as Subject;
          console.log(`✨ New highest confidence subject: ${subject} (${matchConfidence})`);
        }
      }
    }

    // If confidence is too low, return null instead of an uncertain subject
    if (highestConfidence < 0.7) {
      console.log('⚠️ Subject confidence too low, returning null');
      return { subject: null, confidence: 0 };
    }

    console.log('✅ Final subject detection:', { subject: detectedSubject, confidence: highestConfidence });
    return { subject: detectedSubject, confidence: highestConfidence };
  }

  /**
   * Check for patterns that might indicate a different subject
   */
  private checkNegativePatterns(transcript: string, currentSubject: Subject): boolean {
    const negativePatterns: Record<Subject, RegExp[]> = {
      Math: [
        /\bread\b.*\bstory\b/i,
        /\bwrite\b.*\bessay\b/i,
        /\bspelling\b.*\bwords\b/i,
        /\bgrammar\b.*\brules\b/i,
        /\bvocabulary\b.*\blist\b/i
      ],
      Reading: [
        /\bsolve\b.*\bequation\b/i,
        /\bcalculate\b/i,
        /\bgeometry\b.*\bshapes\b/i,
        /\bmath\b.*\bproblems?\b/i,
        /\bnumbers?\b.*\boperations?\b/i
      ],
      Science: [
        /\bspelling\b.*\btest\b/i,
        /\bgrammar\b.*\brules\b/i,
        /\bsolve\b.*\bmath\b/i,
        /\bvocabulary\b.*\bwords?\b/i,
        /\bread\b.*\bcomprehension\b/i
      ]
    };

    return negativePatterns[currentSubject]?.some(pattern => pattern.test(transcript)) || false;
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

    const { grade, confidence: gradeConfidence } = this.parseGradeLevel(transcript);
    console.log('📚 Grade detection:', { grade, confidence: gradeConfidence });

    const { subject, confidence: subjectConfidence } = this.parseSubject(transcript);
    console.log('📖 Subject detection:', { subject, confidence: subjectConfidence });

    const { type: resourceType, confidence: resourceConfidence, format } = this.parseResourceType(transcript);
    console.log('📝 Resource type detection:', { resourceType, confidence: resourceConfidence, format });

    const { theme, confidence: themeConfidence } = this.parseTheme(transcript);
    console.log('🎨 Theme detection:', { theme, confidence: themeConfidence });

    // Calculate overall confidence - only include confidences for detected values
    let totalConfidence = 0;
    let confidenceCount = 0;

    if (grade) {
      totalConfidence += gradeConfidence;
      confidenceCount++;
    }
    if (subject) {
      totalConfidence += subjectConfidence;
      confidenceCount++;
    }
    if (resourceType) {
      totalConfidence += resourceConfidence;
      confidenceCount++;
    }
    if (theme) {
      totalConfidence += themeConfidence;
      confidenceCount++;
    }

    const confidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;
    console.log('🎯 Overall confidence:', confidence);

    // Extract additional specifications
    const specifications: ResourceSpecs = {
      format: format || undefined,
      theme: theme || undefined,
      topicArea: this.extractTopicArea(transcript, subject),
      difficulty: this.extractDifficulty(transcript),
      questionCount: this.extractQuestionCount(transcript),
      customInstructions: this.extractCustomInstructions(transcript)
    };
    console.log('🔍 Extracted specifications:', specifications);

    // Validate the results before returning
    // If confidence is too low or required fields are missing, return null values
    if (confidence < 0.7 || (!grade && !subject && !resourceType)) {
      console.log('⚠️ Validation failed: Low confidence or missing required fields');
      return {
        gradeLevel: null,
        subject: null,
        resourceType: null,
        specifications: {
          format: undefined,
          theme: undefined,
          topicArea: undefined,
          difficulty: undefined,
          questionCount: undefined,
          customInstructions: undefined
        },
        confidence: 0
      };
    }

    // If we have a subject but no grade, or vice versa, reduce confidence
    if ((grade && !subject) || (!grade && subject)) {
      console.log('⚠️ Incomplete detection: Missing grade or subject');
      return {
        gradeLevel: null,
        subject: null,
        resourceType: resourceType,
        specifications,
        confidence: confidence * 0.5
      };
    }

    // If we have grade and subject but no resource type, try to infer from context
    if (grade && subject && !resourceType) {
      const inferredType = this.inferResourceTypeFromContext(transcript);
      console.log('🤔 Attempting to infer resource type:', inferredType);
      if (inferredType) {
        return {
          gradeLevel: grade,
          subject: subject,
          resourceType: inferredType,
          specifications,
          confidence: confidence * 0.8
        };
      }
    }

    console.log('✅ Command processing complete:', {
      gradeLevel: grade,
      subject,
      resourceType,
      specifications,
      confidence
    });

    return {
      gradeLevel: grade,
      subject,
      resourceType: resourceType || null,
      specifications,
      confidence
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
}