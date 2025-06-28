export type ResourceType = 'worksheet' | 'quiz' | 'rubric' | 'lesson plan' | 'exit slip';

export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer';

export interface BaseResource {
  title: string;
  description?: string;
  subject: string;
  gradeLevel: string;
  topicArea: string;
  createdAt: string;
}

export interface WorksheetResource extends BaseResource {
  type: 'worksheet';
  format: 'standard' | 'guided' | 'interactive';
  problems: {
    question: string;
    answer?: string;
    options?: string[];
    explanation?: string;
    steps?: {
      instruction: string;
      hint?: string;
    }[];
    materials?: string[];
    interactiveElements?: string[];
  }[];
  vocabulary?: {
    [key: string]: string;
  };
  instructions?: string;
}

export interface QuizResource extends BaseResource {
  type: 'quiz';
  questions: {
    type: QuestionType;
    number: number;
    question: string;
    options?: string[];
    correct?: string;
    explanation?: string;
    points: number;
    rubric?: string[];
  }[];
  totalPoints: number;
}

export interface RubricResource extends BaseResource {
  type: 'rubric';
  criteria: {
    name: string;
    levels: {
      level: string;
      description: string;
      points?: number;
    }[];
  }[];
}

export interface LessonPlanResource extends BaseResource {
  type: 'lesson plan';
  duration: string;
  objectives: string[];
  materials: string[];
  activities: {
    name: string;
    duration: string;
    description: string;
  }[];
  assessment: string;
}

export interface ExitSlipResource extends BaseResource {
  type: 'exit slip';
  questions: {
    question: string;
    type: 'multiple_choice' | 'rating_scale' | 'open_response';
    options?: string[];
    points?: number;
  }[];
}

export type Resource = 
  | WorksheetResource 
  | QuizResource 
  | RubricResource 
  | LessonPlanResource 
  | ExitSlipResource;

export interface ResourceGenerationOptions {
  subject: string;
  gradeLevel: string;
  resourceType: ResourceType;
  theme?: string;
  difficulty?: string;
  topicArea: string;
  includeVocabulary?: boolean;
  questionCount?: number;
  focus?: string;
  customInstructions?: string;
  selectedQuestionTypes?: string[];
} 