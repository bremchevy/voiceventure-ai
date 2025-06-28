import { Format, Subject } from './generator-types';

export type ResourceType = 'worksheet' | 'quiz' | 'rubric' | 'lesson plan' | 'exit slip';

export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer';

export interface BaseResource {
  id?: string;
  title: string;
  grade_level: string;
  subject: Subject;
  topic: string;
  format: Format;
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
}

// Quiz resource type
export interface QuizResource extends BaseResource {
  resourceType: 'quiz';
  questions: {
    type: string;
    question: string;
    options?: string[];
    answer: string;
    explanation?: string;
  }[];
}

// Exit slip resource type
export interface ExitSlipResource extends BaseResource {
  resourceType: 'exit_slip';
  questions: {
    type: string;
    question: string;
    purpose: string;
  }[];
}

// Lesson plan resource type
export interface LessonPlanResource extends BaseResource {
  resourceType: 'lesson_plan';
  objectives: string[];
  materials: string[];
  procedure: {
    phase: string;
    duration: string;
    activities: string[];
  }[];
  assessment: {
    type: string;
    description: string;
  }[];
  extensions?: string[];
  accommodations?: string[];
}

// Rubric resource type
export interface RubricResource extends BaseResource {
  resourceType: 'rubric';
  criteria: {
    name: string;
    description: string;
    levels: {
      score: number;
      description: string;
    }[];
  }[];
}

export type Resource =
  | WorksheetResource
  | QuizResource
  | ExitSlipResource
  | LessonPlanResource
  | RubricResource;

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