import { DifficultyLevel, GradeLevel, Subject } from '../../types/resource';

interface CognitiveLevel {
  remember: number;
  understand: number;
  apply: number;
  analyze: number;
  evaluate: number;
  create: number;
}

interface DifficultyParameters {
  cognitiveLevel: CognitiveLevel;
  questionTypes: string[];
  languageComplexity: number; // 1-10 scale
  visualSupport: number; // 1-10 scale
  conceptDepth: number; // 1-10 scale
  multiStepComplexity: number; // 1-10 scale
}

const GRADE_BANDS = {
  EARLY_ELEMENTARY: ['K', '1', '2'],
  UPPER_ELEMENTARY: ['3', '4', '5'],
  MIDDLE_SCHOOL: ['6', '7', '8'],
  HIGH_SCHOOL: ['9', '10', '11', '12']
} as const;

function getGradeBand(grade: string): keyof typeof GRADE_BANDS {
  if (!grade || typeof grade !== 'string') {
    return 'EARLY_ELEMENTARY';
  }

  // Handle "Kindergarten" specially
  if (grade.toLowerCase() === 'kindergarten' || grade.toLowerCase() === 'k') {
    return 'EARLY_ELEMENTARY';
  }

  // Clean up the grade string
  const gradeStr = grade.toString()
    .toUpperCase()
    .replace('TH', '')
    .replace('ST', '')
    .replace('ND', '')
    .replace('RD', '')
    .trim();
  
  for (const [band, grades] of Object.entries(GRADE_BANDS)) {
    if (grades.includes(gradeStr)) {
      return band as keyof typeof GRADE_BANDS;
    }
  }
  
  // Default to middle band if grade not found
  return 'UPPER_ELEMENTARY';
}

const BASE_COGNITIVE_LEVELS: Record<keyof typeof GRADE_BANDS, CognitiveLevel> = {
  EARLY_ELEMENTARY: {
    remember: 0.4,
    understand: 0.4,
    apply: 0.2,
    analyze: 0,
    evaluate: 0,
    create: 0
  },
  UPPER_ELEMENTARY: {
    remember: 0.2,
    understand: 0.4,
    apply: 0.3,
    analyze: 0.1,
    evaluate: 0,
    create: 0
  },
  MIDDLE_SCHOOL: {
    remember: 0.1,
    understand: 0.2,
    apply: 0.3,
    analyze: 0.3,
    evaluate: 0.1,
    create: 0
  },
  HIGH_SCHOOL: {
    remember: 0.1,
    understand: 0.2,
    apply: 0.2,
    analyze: 0.3,
    evaluate: 0.1,
    create: 0.1
  }
};

const QUESTION_TYPES_BY_BAND: Record<keyof typeof GRADE_BANDS, string[]> = {
  EARLY_ELEMENTARY: ['multiple_choice', 'matching', 'true_false'],
  UPPER_ELEMENTARY: ['multiple_choice', 'short_answer', 'matching', 'true_false'],
  MIDDLE_SCHOOL: ['multiple_choice', 'short_answer', 'long_answer', 'matching'],
  HIGH_SCHOOL: [
    'multiple_choice',
    'short_answer', 
    'long_answer', 
    'analysis',
    'comparative_analysis',
    'evidence_based',
    'synthesis',
    'evaluation',
    'creative_response'
  ]
};

// Add specific cognitive level indicators
const COGNITIVE_LEVEL_INDICATORS: Record<keyof CognitiveLevel, string[]> = {
  remember: ['identify', 'recall', 'recognize', 'list'],
  understand: ['explain', 'describe', 'interpret', 'classify'],
  apply: ['demonstrate', 'implement', 'solve', 'use'],
  analyze: ['compare', 'contrast', 'examine', 'investigate'],
  evaluate: ['assess', 'critique', 'judge', 'justify'],
  create: ['design', 'develop', 'compose', 'construct']
};

const HIGH_SCHOOL_PARAMS = {
  languageComplexity: 9, // Advanced academic language
  visualSupport: 4, // Moderate visual support, focusing on complex diagrams and data visualization
  conceptDepth: 9, // Deep conceptual understanding
  multiStepComplexity: 9, // Complex multi-step problems
  cognitiveLevel: {
    remember: 0.05,    // 5% - Essential fact recall only
    understand: 0.15,  // 15% - Deep comprehension
    apply: 0.25,       // 25% - Complex application
    analyze: 0.30,     // 30% - Critical analysis
    evaluate: 0.15,    // 15% - Advanced evaluation
    create: 0.10       // 10% - Original synthesis
  },
  questionTypes: {
    remember: [
      'terminology_application',
      'concept_identification'
    ],
    understand: [
      'theoretical_comprehension',
      'cross_disciplinary_connection',
      'contextual_interpretation'
    ],
    apply: [
      'complex_problem_solving',
      'real_world_application',
      'interdisciplinary_application',
      'case_study_analysis'
    ],
    analyze: [
      'systems_analysis',
      'comparative_evaluation',
      'research_methodology_analysis',
      'data_interpretation',
      'argument_analysis'
    ],
    evaluate: [
      'theoretical_critique',
      'methodology_evaluation',
      'evidence_evaluation',
      'solution_assessment'
    ],
    create: [
      'research_design',
      'theory_development',
      'innovative_solution',
      'model_creation'
    ]
  },
  advancedElements: {
    required: [
      'abstract_reasoning',
      'theoretical_framework',
      'research_methodology',
      'critical_analysis',
      'interdisciplinary_connection',
      'real_world_application',
      'evidence_based_argumentation'
    ],
    optional: [
      'meta_analysis',
      'research_design',
      'statistical_analysis',
      'theoretical_modeling'
    ],
    subjectSpecific: {
      math: [
        'proof_construction',
        'mathematical_modeling',
        'abstract_algebra',
        'advanced_calculus'
      ],
      science: [
        'experimental_design',
        'data_analysis',
        'theoretical_physics',
        'molecular_biology'
      ],
      reading: [
        'literary_theory',
        'comparative_literature',
        'critical_theory',
        'advanced_rhetoric'
      ]
    }
  }
};

export function getDifficultyParameters(
  grade: string | undefined | null,
  subject: Subject,
  difficulty: DifficultyLevel
): DifficultyParameters {
  // Ensure grade is a string and handle undefined/null
  const gradeStr = grade?.toString() || '5';
  const band = getGradeBand(gradeStr);
  const baseCognitive = BASE_COGNITIVE_LEVELS[band];
  
  // Scale factors based on difficulty
  const difficultyScaleFactor = {
    basic: 0.8,
    intermediate: 1.0,
    advanced: 1.2
  }[difficulty] || 1.0;

  // Subject-specific adjustments
  const subjectScaling = getSubjectScaling(subject, band);

  // Get base parameters
  let params = {
    cognitiveLevel: scaleCognitiveLevels(baseCognitive, difficultyScaleFactor),
    questionTypes: QUESTION_TYPES_BY_BAND[band],
    languageComplexity: calculateLanguageComplexity(band, difficulty),
    visualSupport: calculateVisualSupport(band, subject),
    conceptDepth: calculateConceptDepth(band, difficulty) * subjectScaling,
    multiStepComplexity: calculateMultiStepComplexity(band, difficulty) * subjectScaling
  };

  // Special adjustments for specific grades
  const gradeString = String(gradeStr).toLowerCase();
  
  // Kindergarten-specific adjustments
  if (gradeString === 'kindergarten' || gradeString === 'k') {
    return {
      ...params,
      languageComplexity: 1,
      visualSupport: 10,
      conceptDepth: 1,
      multiStepComplexity: 1,
      cognitiveLevel: {
        remember: 0.6,
        understand: 0.3,
        apply: 0.1,
        analyze: 0,
        evaluate: 0,
        create: 0
      },
      questionTypes: [
        'picture_matching',
        'oral_response',
        'true_false',
        'sorting',
        'sequencing'
      ],
      kindergartenSpecific: {
        phonologicalAwareness: true,
        letterRecognition: true,
        numberSense: true,
        basicShapes: true,
        colors: true,
        handsonActivities: true,
        movementBased: true,
        repetitive: true,
        picturePrompts: true,
        audioSupport: true,
        manipulatives: true
      }
    };
  }
  
  // Grade 12-specific adjustments
  if (gradeString === '12' || gradeString === '12th') {
    return {
      ...params,
      ...HIGH_SCHOOL_PARAMS,
      grade12Specific: {
        advancedConcepts: true,
        researchBased: true,
        crossDisciplinary: true,
        realWorldApplications: true,
        subjectSpecific: {
          math: {
            topics: ['calculus', 'advanced_algebra', 'statistics'],
            skills: ['proof_writing', 'mathematical_modeling', 'abstract_reasoning']
          },
          science: {
            topics: ['advanced_physics', 'organic_chemistry', 'molecular_biology'],
            skills: ['lab_research', 'data_analysis', 'scientific_writing']
          },
          reading: {
            topics: ['literary_theory', 'comparative_literature', 'rhetoric'],
            skills: ['critical_analysis', 'research_writing', 'theoretical_framework']
          }
        }
      }
    };
  }

  // Adjust parameters based on exact grade level within bands
  if (band === 'HIGH_SCHOOL') {
    const gradeNum = parseInt(gradeString);
    if (!isNaN(gradeNum)) {
      const progressionFactor = (gradeNum - 9) / 3; // 0 for grade 9, 1 for grade 12
      params = {
        ...params,
        languageComplexity: Math.min(10, params.languageComplexity + progressionFactor),
        conceptDepth: Math.min(10, params.conceptDepth + progressionFactor),
        multiStepComplexity: Math.min(10, params.multiStepComplexity + progressionFactor)
      };
    }
  }

  return params;
}

function scaleCognitiveLevels(base: CognitiveLevel, factor: number): CognitiveLevel {
  return Object.entries(base).reduce((acc, [key, value]) => ({
    ...acc,
    [key]: Math.min(Math.max(value * factor, 0), 1)
  }), {} as CognitiveLevel);
}

function calculateLanguageComplexity(band: keyof typeof GRADE_BANDS, difficulty: DifficultyLevel): number {
  const bandBaseComplexity = {
    EARLY_ELEMENTARY: 2,
    UPPER_ELEMENTARY: 4,
    MIDDLE_SCHOOL: 6,
    HIGH_SCHOOL: 8
  }[band];

  const difficultyModifier = {
    basic: -1,
    intermediate: 0,
    advanced: 1
  }[difficulty];

  return Math.min(Math.max(bandBaseComplexity + difficultyModifier, 1), 10);
}

function calculateVisualSupport(band: keyof typeof GRADE_BANDS, subject: Subject): number {
  const bandBaseSupport = {
    EARLY_ELEMENTARY: 9,
    UPPER_ELEMENTARY: 7,
    MIDDLE_SCHOOL: 5,
    HIGH_SCHOOL: 3
  }[band];

  const subjectModifier = {
    math: 2,
    science: 1,
    reading: 0
  }[subject];

  return Math.min(Math.max(bandBaseSupport + subjectModifier, 1), 10);
}

function calculateConceptDepth(band: keyof typeof GRADE_BANDS, difficulty: DifficultyLevel): number {
  const bandBaseDepth = {
    EARLY_ELEMENTARY: 2,
    UPPER_ELEMENTARY: 4,
    MIDDLE_SCHOOL: 6,
    HIGH_SCHOOL: 8
  }[band];

  const difficultyModifier = {
    basic: -1,
    intermediate: 0,
    advanced: 1
  }[difficulty];

  return Math.min(Math.max(bandBaseDepth + difficultyModifier, 1), 10);
}

function calculateMultiStepComplexity(band: keyof typeof GRADE_BANDS, difficulty: DifficultyLevel): number {
  const bandBaseComplexity = {
    EARLY_ELEMENTARY: 1,
    UPPER_ELEMENTARY: 3,
    MIDDLE_SCHOOL: 5,
    HIGH_SCHOOL: 7
  }[band];

  const difficultyModifier = {
    basic: -1,
    intermediate: 0,
    advanced: 2
  }[difficulty];

  return Math.min(Math.max(bandBaseComplexity + difficultyModifier, 1), 10);
}

function getSubjectScaling(subject: Subject, band: keyof typeof GRADE_BANDS): number {
  // Subject-specific scaling factors
  const subjectBase = {
    math: 1.0,
    science: 0.9,
    reading: 0.8
  }[subject];

  // Band-specific adjustments
  const bandModifier = {
    EARLY_ELEMENTARY: 0.8,
    UPPER_ELEMENTARY: 1.0,
    MIDDLE_SCHOOL: 1.2,
    HIGH_SCHOOL: 1.4
  }[band];

  return subjectBase * bandModifier;
}

export function getPromptEnhancements(
  grade: string,
  subject: Subject,
  difficulty: DifficultyLevel
): string {
  const params = getDifficultyParameters(grade, subject, difficulty);
  const band = getGradeBand(grade);

  return `
DIFFICULTY ADJUSTMENTS:
1. Cognitive Level Distribution:
${Object.entries(params.cognitiveLevel)
  .filter(([_, value]) => value > 0)
  .map(([level, value]) => `   - ${level}: ${Math.round(value * 100)}% of questions`)
  .join('\n')}

2. Language Complexity (${params.languageComplexity}/10):
   - ${getLanguageGuidelines(params.languageComplexity)}

3. Visual Support (${params.visualSupport}/10):
   - ${getVisualGuidelines(params.visualSupport)}

4. Question Types:
   - Use these types: ${params.questionTypes.join(', ')}

5. Concept Depth (${params.conceptDepth}/10):
   - ${getConceptDepthGuidelines(params.conceptDepth, subject)}

6. Multi-Step Complexity (${params.multiStepComplexity}/10):
   - ${getComplexityGuidelines(params.multiStepComplexity, subject)}

${getGradeBandSpecificGuidelines(band, subject)}
`;
}

function getLanguageGuidelines(complexity: number): string {
  if (complexity <= 3) return 'Use simple words, short sentences, and basic vocabulary';
  if (complexity <= 6) return 'Use grade-appropriate vocabulary, clear explanations, and moderate sentence complexity';
  return 'Use advanced vocabulary, complex sentence structures, and subject-specific terminology';
}

function getVisualGuidelines(support: number): string {
  if (support >= 8) return 'Include frequent visual aids, diagrams, and step-by-step illustrations';
  if (support >= 5) return 'Use strategic visuals to support key concepts and complex ideas';
  return 'Include visuals only for complex concepts or when essential for understanding';
}

function getConceptDepthGuidelines(depth: number, subject: Subject): string {
  const subjectSpecific = {
    math: {
      low: 'Focus on basic operations and concrete examples',
      medium: 'Include pattern recognition and simple problem-solving',
      high: 'Incorporate abstract concepts and complex problem-solving'
    },
    science: {
      low: 'Cover observable phenomena and simple cause-effect',
      medium: 'Include basic scientific principles and simple experiments',
      high: 'Explore complex systems and scientific theories'
    },
    reading: {
      low: 'Focus on literal comprehension and basic vocabulary',
      medium: 'Include inferential understanding and context clues',
      high: 'Explore themes, author\'s purpose, and literary analysis'
    }
  }[subject];

  if (depth <= 3) return subjectSpecific.low;
  if (depth <= 7) return subjectSpecific.medium;
  return subjectSpecific.high;
}

function getComplexityGuidelines(complexity: number, subject: Subject): string {
  const subjectSpecific = {
    math: {
      low: 'Single-step problems with clear instructions',
      medium: 'Two to three step problems with some guidance',
      high: 'Multi-step problems requiring strategic thinking'
    },
    science: {
      low: 'Single-variable relationships and simple processes',
      medium: 'Multi-variable interactions with guided analysis',
      high: 'Complex systems analysis and experimental design'
    },
    reading: {
      low: 'Direct recall and simple comprehension questions',
      medium: 'Analysis of text elements and basic inference',
      high: 'Complex analysis across multiple text elements'
    }
  }[subject];

  if (complexity <= 3) return subjectSpecific.low;
  if (complexity <= 7) return subjectSpecific.medium;
  return subjectSpecific.high;
}

function getGradeBandSpecificGuidelines(band: keyof typeof GRADE_BANDS, subject: Subject): string {
  const guidelines = {
    EARLY_ELEMENTARY: {
      math: `
EARLY MATH GUIDELINES:
- Use concrete manipulatives and visual representations
- Focus on number recognition and counting (1-20 for K, 1-100 for 1-2)
- Introduce basic addition/subtraction through stories
- Emphasize patterns and sorting
- Include shape recognition and basic geometry
- Use real-world examples (counting objects, sharing items)
- Incorporate movement and hands-on activities`,
      science: `
EARLY SCIENCE GUIDELINES:
- Focus on observable phenomena and sensory experiences
- Use simple cause-and-effect relationships
- Include hands-on exploration and discovery
- Connect to daily life experiences
- Use picture-based observations
- Incorporate basic measurement concepts
- Focus on patterns in nature and seasons`,
      reading: `
EARLY READING GUIDELINES:
- Use sight words and phonics patterns
- Include picture support for all text
- Use repetitive text structures
- Focus on letter recognition and sounds
- Keep sentences short and simple
- Include rhyming and word families
- Use familiar vocabulary and contexts`
    },
    UPPER_ELEMENTARY: {
      math: `
UPPER ELEMENTARY MATH GUIDELINES:
- Bridge concrete and abstract concepts
- Include word problems with real-world applications
- Focus on multiplication, division, and fractions
- Introduce basic algebraic thinking
- Use visual models for complex concepts
- Include measurement and data interpretation
- Incorporate basic geometric principles`,
      science: `
UPPER ELEMENTARY SCIENCE GUIDELINES:
- Introduce scientific method basics
- Include simple experiments and observations
- Connect concepts to everyday experiences
- Use diagrams and simple models
- Include basic data collection
- Focus on classification and systems
- Incorporate environmental awareness`,
      reading: `
UPPER ELEMENTARY READING GUIDELINES:
- Focus on comprehension strategies
- Include various text features
- Use grade-appropriate vocabulary
- Incorporate different genres
- Include inference and prediction
- Focus on main idea and details
- Use text evidence for support`
    },
    MIDDLE_SCHOOL: {
      math: `
MIDDLE SCHOOL MATH GUIDELINES:
- Develop algebraic thinking and reasoning
- Include multi-step problem solving
- Focus on proportional relationships
- Incorporate geometric proofs
- Use real-world data analysis
- Include statistical thinking
- Bridge to abstract concepts`,
      science: `
MIDDLE SCHOOL SCIENCE GUIDELINES:
- Explore complex systems and relationships
- Include experimental design
- Use data analysis and graphs
- Incorporate scientific models
- Focus on cause and effect
- Include technology applications
- Use scientific argumentation`,
      reading: `
MIDDLE SCHOOL READING GUIDELINES:
- Analyze literary elements
- Include textual evidence
- Focus on author's craft
- Use multiple text types
- Incorporate research skills
- Include critical thinking
- Focus on argument analysis`
    },
    HIGH_SCHOOL: {
      math: `
HIGH SCHOOL MATH GUIDELINES:
- Focus on abstract concepts and proofs
- Include complex problem solving
- Use advanced algebraic concepts
- Incorporate calculus principles
- Include mathematical modeling
- Focus on logical reasoning
- Use real-world applications
- Include cross-concept connections
- Require mathematical justification
- Incorporate technology tools`,
      science: `
HIGH SCHOOL SCIENCE GUIDELINES:
- Explore advanced theories and models
- Include complex experimental design
- Use statistical analysis
- Focus on scientific research
- Include peer review process
- Use advanced technology
- Incorporate cross-disciplinary concepts
- Include real-world applications
- Focus on scientific writing
- Use advanced data visualization`,
      reading: `
HIGH SCHOOL READING GUIDELINES:
- Analyze complex texts and themes
- Include advanced literary analysis
- Focus on critical theory
- Use multiple text synthesis
- Include research methodology
- Focus on academic writing
- Incorporate rhetorical analysis
- Include cultural context
- Use advanced vocabulary
- Focus on author's purpose and craft`
    }
  }[band];

  return `GRADE BAND SPECIFIC GUIDELINES:
${guidelines[subject]}`;
}

// Add this after the getGradeBandSpecificGuidelines function
function getQuestionTypesByLevel(band: keyof typeof GRADE_BANDS, cognitiveLevel: keyof CognitiveLevel): string[] {
  if (band === 'HIGH_SCHOOL') {
    switch(cognitiveLevel) {
      case 'remember':
        return ['basic identification', 'term matching', 'fact recall'];
      case 'understand':
        return ['interpretation', 'summarization', 'explanation'];
      case 'apply':
        return ['contextual application', 'scenario analysis', 'problem-solving'];
      case 'analyze':
        return ['comparative analysis', 'structural analysis', 'relationship examination'];
      case 'evaluate':
        return ['critical evaluation', 'judgment formation', 'perspective assessment'];
      case 'create':
        return ['synthesis', 'original composition', 'creative application'];
      default:
        return [];
    }
  }
  return [];
} 