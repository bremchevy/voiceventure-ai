import { Format, Subject } from './generator-types';

export type ResourceType = 'worksheet' | 'quiz' | 'rubric' | 'lesson plan' | 'exit slip/bell ringer';

export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'skill_assessment';

// Base resource interface
export interface Resource {
  resourceType: string;
  subject: string;
  format: string;
  title: string;
  grade_level: string;
  theme: string;
  topic?: string;
}

// Base problem type with common fields
export interface BaseProblem {
  type: string;
  question: string;
  answer: string;
  explanation?: string;
}

// Math-specific problem type
export interface MathProblem extends BaseProblem {
  type: 'math' | 'standard' | 'guided';
  steps?: string[];
  visualAid?: {
    type: 'shape' | 'graph' | 'diagram';
    data: any;
  };
  hints?: string[];
  thinking_points?: string[];
}

// Reading-specific problem type
export interface ReadingProblem extends BaseProblem {
  type: 'reading';
  evidence_prompt?: string;
  thinking_points?: string[];
  data_analysis?: string;
}

// Vocabulary-specific types
export interface VocabularyItem {
  word: string;
  definition: string;
  context?: string;
  usage?: string;
}

export interface VocabularyProblem extends BaseProblem {
  type: 'vocabulary';
  word: string;
  definition: string;
  usage?: string;
  context?: string;
  questions?: Array<{
    question: string;
    answer: string;
  }>;
  application?: string;
  evidence_prompt?: string;
  skill_focus?: string;
  hints?: string[];
}

// Science-specific problem type
export interface ScienceProblem extends BaseProblem {
  type: 'science';
  complexity?: string;
  focus_area?: string;
}

// Reading-specific types
export interface ReadingPassage {
  text: string;
  target_words?: string[];
}

export interface ComprehensionProblem {
  type: string;
  question: string;
  answer: string;
  evidence_prompt?: string;
  explanation?: string;
  thinking_points?: string[];
}

export interface VocabularyItem {
  word: string;
  context?: string;
  definition: string;
  questions: Array<{
    question: string;
    answer: string;
  }>;
  explanation?: string;
  thinking_points?: string[];
}

// Science-specific types
export interface ScienceContext {
  explanation: string;
  concepts: string[];
  applications: string[];
  key_terms?: Record<string, string>;
  introduction?: string;
  main_components?: string;
  importance?: string;
  causes_effects?: string;
  additional_info?: string;
  problems?: ScienceProblem[];
}

export interface AnalysisPoint {
  type: string;
  question: string;
  answer: string;
  explanation: string;
  thinking_points?: string[];
  data_analysis?: string;
}

// Science specific content types
export interface AnalysisFocusContent {
  analysis_focus: string;
  critical_aspects: string;
  data_patterns: string;
  implications: string;
  key_points: string[];
}

export interface AnalysisProblem extends BaseProblem {
  type: 'analysis';
  thinking_points?: string[];
}

// Combined worksheet resource type
export interface WorksheetResource extends Resource {
  resourceType: 'worksheet';
  instructions?: string;
  passage?: string | { text: string; target_words?: string[] };
  problems?: Array<MathProblem | ReadingProblem | VocabularyProblem | ScienceProblem | AnalysisProblem>;
  comprehensionProblems?: Array<ComprehensionProblem>;
  vocabulary?: Array<VocabularyItem>;
  science_context?: {
    topic: string;
    explanation: string;
    key_concepts: string[];
    key_terms?: Record<string, string>;
    applications?: string[];
    problems?: ScienceProblem[];
  };
  analysis_content?: AnalysisFocusContent;
  experiment?: {
    objective: string;
    hypothesis: string;
    variables: {
      independent: string;
      dependent: string;
      controlled: string[];
    };
    safety_notes: string[];
  };
  materials?: string[];
  procedure?: string[];
}

// Quiz resource type
export interface QuizResource extends Resource {
  resourceType: 'quiz';
  format: Format;
  questions: Array<{
    type: QuestionType;
    question: string;
    options?: string[];
    correctAnswer?: string;
    answer: string;
    explanation?: string;
    cognitiveLevel?: string;
    points?: number;
  } | {
    type: 'skill_assessment';
    mainQuestion: string;
    task?: string;
    steps?: string[];
    successCriteria?: string[];
    realWorldApplication?: string;
    difficulty?: 'Basic' | 'Intermediate' | 'Advanced';
  }>;
  estimatedTime?: string;
  totalPoints?: number;
  metadata?: {
    complexityLevel: number;
    languageLevel: number;
    cognitiveDistribution: {
      recall: number;
      comprehension: number;
      application: number;
      analysis: number;
    };
  };
}

// Exit slip resource type
export interface ExitSlipResource extends Resource {
  resourceType: 'exit_slip';
  format: 'reflection_prompt' | 'vocabulary_check' | 'skill_assessment';
  questions: Array<{
    type: 'multiple_choice' | 'true_false' | 'short_answer' | 'vocabulary_check' | 'reflection_prompt' | 'skill_assessment';
    // Base question fields
    question?: string;
    options?: string[];
    answer?: string;
    // Reflection prompt specific fields
    mainQuestion?: string;
    reflectionGuides?: string[];
    sentenceStarters?: string[];
    notes?: string;
    // Skill assessment specific fields
    task?: string;
    steps?: string[];
    successCriteria?: string[];
    realWorldApplication?: string;
    difficulty?: 'Basic' | 'Intermediate' | 'Advanced';
    // Vocabulary check specific fields
    term?: string;
    definition?: string;
    context?: string;
    examples?: string[];
    usagePrompt?: string;
    relationships?: string[];
    visualCue?: string;
  }>;
  instructions?: string;
  estimatedTime?: string;
  metadata?: {
    timeEstimate?: string;
    focusArea?: string;
    learningObjectives?: string[];
    assessmentType?: string;
  };
}

interface Activity {
  duration: string;
  description: string;
  teacher_actions: string[];
  student_actions: string[];
}

interface Assessment {
  formative: string[];
  summative: string[];
}

interface Differentiation {
  struggling: string[];
  advanced: string[];
}

// Lesson plan resource type
export interface LessonPlanResource extends Resource {
  resourceType: 'lesson_plan';
  duration: string;
  objectives: string[];
  materials: string[];
  activities: {
    opening: Activity;
    main: Activity;
    closing: Activity;
  };
  assessment: Assessment;
  differentiation: Differentiation;
  extensions: string[];
  reflection_points: string[];
}

// Rubric resource type
export interface RubricResource extends Resource {
  resourceType: 'rubric';
  format: 'checklist' | '3_point' | '4_point';
  criteria: {
    name: string;
    description: string;
    levels: {
      score: string;
      description: string;
    }[];
  }[];
}

export interface ResourceGenerationOptions {
  subject: string;
  gradeLevel: string;
  resourceType: ResourceType;
  theme?: string;
  difficulty?: string;
  topicArea: string;
  questionCount?: number;
  customInstructions?: string;
  selectedQuestionTypes?: string[];
}

export interface ScienceContent {
  explanation: string;
  concepts: string[];
  applications: string[];
  key_terms?: Record<string, string>;
} 