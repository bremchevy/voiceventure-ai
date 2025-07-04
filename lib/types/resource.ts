import { Format, Subject } from './generator-types';

export type ResourceType = 'worksheet' | 'quiz' | 'rubric' | 'lesson plan' | 'exit slip/bell ringer';

export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'skill_assessment';

export interface BaseResource {
  resourceType: string;
  title: string;
  subject: string;
  grade_level: string;
  instructions?: string;
  topic?: string;
}

// Math-specific types
interface MathProblem {
  type: string;
  question: string;
  answer: string;
  explanation?: string;
  steps?: string[];
  hints?: string[];
  visuals?: string[];
}

// Reading-specific types
interface ReadingPassage {
  text: string;
  type: 'fiction' | 'non-fiction' | 'poetry';
  lexile_level?: string;
  target_words?: string[];
  elements_focus?: string[];
}

interface ComprehensionProblem {
  type: 'main_idea' | 'detail' | 'inference';
  question: string;
  answer: string;
  evidence_prompt: string;
  skill_focus: string;
}

interface LiteraryAnalysisProblem {
  type: 'analysis';
  element: string;
  question: string;
  guiding_questions: string[];
  evidence_prompt: string;
  response_format: string;
}

interface VocabularyProblem {
  word: string;
  context: string;
  definition: string;
  questions: {
    type: 'meaning' | 'usage' | 'context';
    question: string;
    answer: string;
  }[];
  application: string;
}

// Science-specific types
interface LabExperimentProblem {
  type: 'experiment';
  question: string;
  hypothesis_prompt: string;
  procedure: string[];
  data_collection: {
    table_headers: string[];
    rows: number;
  };
  analysis_questions: string[];
  conclusion_prompt: string;
}

interface ObservationProblem {
  type: 'observation';
  phenomenon: string;
  background: string;
  observation_prompts: string[];
  data_recording: {
    type: 'diagram' | 'table' | 'text';
    instructions: string;
  };
  analysis_questions: string[];
  connections: string[];
}

interface ConceptApplicationProblem {
  type: 'application';
  scenario: string;
  concept_connection: string;
  questions: {
    question: string;
    answer: string;
    explanation: string;
  }[];
  extension: string;
}

// Combined worksheet resource type
export interface WorksheetResource extends BaseResource {
  resourceType: 'worksheet';
  // Math formats
  problems?: MathProblem[];
  
  // Reading formats
  passage?: ReadingPassage;
  comprehensionProblems?: ComprehensionProblem[];
  literaryAnalysisProblems?: LiteraryAnalysisProblem[];
  vocabularyProblems?: VocabularyProblem[];
  
  // Science formats
  objective?: string;
  safety_notes?: string;
  materials?: string[];
  labProblems?: LabExperimentProblem[];
  observationProblems?: ObservationProblem[];
  conceptProblems?: ConceptApplicationProblem[];
  scienceContent?: ScienceContent;
  vocabulary?: Record<string, string>;
}

// Quiz resource type
export interface QuizResource extends BaseResource {
  resourceType: 'quiz';
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
export interface ExitSlipResource extends BaseResource {
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
export interface LessonPlanResource extends BaseResource {
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
export interface RubricResource extends BaseResource {
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

export type Resource = BaseResource | WorksheetResource | QuizResource | RubricResource | ExitSlipResource | LessonPlanResource;

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