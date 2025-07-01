import { Subject } from '../../types/resource';

const GRADE_BANDS = {
  EARLY_ELEMENTARY: ['K', '1', '2'],
  UPPER_ELEMENTARY: ['3', '4', '5'],
  MIDDLE_SCHOOL: ['6', '7', '8'],
  HIGH_SCHOOL: ['9', '10', '11', '12']
} as const;

interface QuizDifficultyParams {
  questionComplexity: number;  // 1-10 scale
  languageLevel: number;      // 1-10 scale
  optionCount: number;        // For multiple choice
  timePerQuestion: number;    // in minutes
  cognitiveSkills: {
    recall: number;           // percentage (0-1)
    comprehension: number;    // percentage (0-1)
    application: number;      // percentage (0-1)
    analysis: number;         // percentage (0-1)
  };
}

function getGradeBand(grade: string): keyof typeof GRADE_BANDS {
  if (!grade || typeof grade !== 'string') {
    return 'UPPER_ELEMENTARY';
  }

  // Handle "Kindergarten" specially
  if (grade.toLowerCase() === 'kindergarten' || grade.toLowerCase() === 'k') {
    return 'EARLY_ELEMENTARY';
  }

  // Clean up the grade string
  const gradeStr = grade.toString()
    .toUpperCase()
    .replace(/(?:TH|ST|ND|RD)$/g, '')
    .trim();
  
  for (const [band, grades] of Object.entries(GRADE_BANDS)) {
    if (grades.includes(gradeStr)) {
      return band as keyof typeof GRADE_BANDS;
    }
  }
  
  return 'UPPER_ELEMENTARY';
}

const BASE_DIFFICULTY_PARAMS: Record<keyof typeof GRADE_BANDS, QuizDifficultyParams> = {
  EARLY_ELEMENTARY: {
    questionComplexity: 2,
    languageLevel: 2,
    optionCount: 3,
    timePerQuestion: 2,
    cognitiveSkills: {
      recall: 0.6,
      comprehension: 0.3,
      application: 0.1,
      analysis: 0
    }
  },
  UPPER_ELEMENTARY: {
    questionComplexity: 4,
    languageLevel: 4,
    optionCount: 4,
    timePerQuestion: 1.5,
    cognitiveSkills: {
      recall: 0.4,
      comprehension: 0.4,
      application: 0.2,
      analysis: 0
    }
  },
  MIDDLE_SCHOOL: {
    questionComplexity: 6,
    languageLevel: 6,
    optionCount: 4,
    timePerQuestion: 1.5,
    cognitiveSkills: {
      recall: 0.3,
      comprehension: 0.3,
      application: 0.3,
      analysis: 0.1
    }
  },
  HIGH_SCHOOL: {
    questionComplexity: 8,
    languageLevel: 8,
    optionCount: 4,
    timePerQuestion: 1.5,
    cognitiveSkills: {
      recall: 0.2,
      comprehension: 0.3,
      application: 0.3,
      analysis: 0.2
    }
  }
};

const SUBJECT_ADJUSTMENTS: Record<Subject, Partial<QuizDifficultyParams>> = {
  math: {
    questionComplexity: 1,  // Slightly more complex for math
    timePerQuestion: 0.5    // More time for calculations
  },
  science: {
    questionComplexity: 0.5,  // Balanced complexity
    cognitiveSkills: {
      recall: 0.3,
      comprehension: 0.3,
      application: 0.2,
      analysis: 0.2
    }
  },
  reading: {
    languageLevel: 1,      // Slightly higher language level
    timePerQuestion: -0.5  // Less time needed for reading questions
  }
};

export function getQuizDifficultyParams(grade: string, subject: Subject): QuizDifficultyParams {
  const band = getGradeBand(grade);
  const baseParams = BASE_DIFFICULTY_PARAMS[band];
  const subjectAdjustments = SUBJECT_ADJUSTMENTS[subject] || {};

  // Apply subject-specific adjustments
  return {
    ...baseParams,
    questionComplexity: Math.min(10, Math.max(1, baseParams.questionComplexity + (subjectAdjustments.questionComplexity || 0))),
    languageLevel: Math.min(10, Math.max(1, baseParams.languageLevel + (subjectAdjustments.languageLevel || 0))),
    timePerQuestion: Math.max(0.5, baseParams.timePerQuestion + (subjectAdjustments.timePerQuestion || 0)),
    cognitiveSkills: {
      ...baseParams.cognitiveSkills,
      ...(subjectAdjustments.cognitiveSkills || {})
    }
  };
}

export function getQuizPromptEnhancements(grade: string, subject: Subject): string {
  const params = getQuizDifficultyParams(grade, subject);
  const band = getGradeBand(grade);

  return `
QUIZ DIFFICULTY PARAMETERS:
1. Question Complexity (${params.questionComplexity}/10):
   - Adjust vocabulary and concept complexity accordingly
   - Use grade-appropriate language and examples
   - ${getComplexityGuidelines(params.questionComplexity, subject)}

2. Cognitive Skills Distribution:
   - Recall Questions: ${Math.round(params.cognitiveSkills.recall * 100)}%
   - Comprehension Questions: ${Math.round(params.cognitiveSkills.comprehension * 100)}%
   - Application Questions: ${Math.round(params.cognitiveSkills.application * 100)}%
   - Analysis Questions: ${Math.round(params.cognitiveSkills.analysis * 100)}%

3. Format Guidelines:
   - Multiple Choice: ${params.optionCount} options per question
   - True/False: Clear, unambiguous statements
   - Short Answer: Expect ${getAnswerLengthGuideline(band)} responses

4. Time Consideration:
   - Design questions that take approximately ${params.timePerQuestion} minutes each
   - Total estimated time: ${params.timePerQuestion * 10} minutes for 10 questions

${getGradeBandGuidelines(band, subject)}
`;
}

function getComplexityGuidelines(complexity: number, subject: Subject): string {
  const guidelines = {
    math: [
      'Focus on basic operations and simple number recognition',
      'Include step-by-step problem solving',
      'Incorporate multi-step problems and basic formulas',
      'Challenge with complex problem-solving and abstract concepts'
    ],
    science: [
      'Use simple observations and basic facts',
      'Include cause-and-effect relationships',
      'Incorporate scientific processes and systems',
      'Challenge with complex scientific concepts and analysis'
    ],
    reading: [
      'Use basic vocabulary and simple sentences',
      'Include grade-level vocabulary and compound sentences',
      'Incorporate advanced vocabulary and complex sentences',
      'Challenge with sophisticated language and abstract concepts'
    ]
  };

  const level = Math.floor((complexity - 1) / 3);
  return guidelines[subject]?.[level] || guidelines.reading[level];
}

function getAnswerLengthGuideline(band: keyof typeof GRADE_BANDS): string {
  const guidelines = {
    EARLY_ELEMENTARY: '2-3 words',
    UPPER_ELEMENTARY: '1-2 sentences',
    MIDDLE_SCHOOL: '2-3 sentences',
    HIGH_SCHOOL: '3-4 sentences'
  };
  return guidelines[band];
}

function getGradeBandGuidelines(band: keyof typeof GRADE_BANDS, subject: Subject): string {
  const guidelines = {
    EARLY_ELEMENTARY: {
      math: 'Use visual aids, simple numbers (1-20), and basic operations',
      science: 'Focus on observable phenomena and simple cause-effect',
      reading: 'Use sight words and simple sentence structures'
    },
    UPPER_ELEMENTARY: {
      math: 'Include word problems, fractions, and basic geometry',
      science: 'Incorporate basic scientific concepts and simple experiments',
      reading: 'Focus on grammar rules and vocabulary in context'
    },
    MIDDLE_SCHOOL: {
      math: 'Use algebraic concepts and complex problem-solving',
      science: 'Include scientific principles and experimental design',
      reading: 'Focus on language conventions and advanced grammar'
    },
    HIGH_SCHOOL: {
      math: 'Incorporate advanced mathematical concepts and proofs',
      science: 'Focus on complex scientific theories and analysis',
      reading: 'Include advanced grammar and language analysis'
    }
  };

  return `GRADE-SPECIFIC GUIDELINES:
- ${guidelines[band][subject]}`;
} 