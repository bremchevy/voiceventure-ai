export type ResourceType = 'worksheet' | 'quiz' | 'rubric' | 'lesson_plan' | 'exit_slip';

export type Subject = 'math' | 'reading' | 'science' | 'general';

export type DifficultyLevel = 'basic' | 'intermediate' | 'advanced';

export type GradeLevel = 
  | 'K' 
  | '1' | '2' | '3' | '4' | '5' 
  | '6' | '7' | '8' 
  | '9' | '10' | '11' | '12';

export interface ResourceMetadata {
  id: string;
  title: string;
  description?: string;
  gradeLevel: string;
  subject: string;
  resourceType: ResourceType;
  theme?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  problemCount?: number;
  topicArea?: string;
  customInstructions?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResourceContent {
  questions?: ResourceQuestion[];
  rubricCriteria?: RubricCriterion[];
  lessonObjectives?: string[];
  materials?: string[];
  procedures?: string[];
  assessments?: string[];
  exitPrompts?: string[];
}

export interface ResourceQuestion {
  id: string;
  type: 'multiple_choice' | 'short_answer' | 'long_answer' | 'true_false' | 'matching';
  question: string;
  options?: string[];
  correctAnswer?: string | string[];
  explanation?: string;
  points?: number;
}

export interface RubricCriterion {
  id: string;
  category: string;
  description: string;
  levels: RubricLevel[];
}

export interface RubricLevel {
  score: string;
  label: string;
  description: string;
  examples?: string[];
}

export type RubricStyle = '4-point' | '3-point' | 'checklist';

export interface Resource {
  metadata: ResourceMetadata;
  content: ResourceContent;
}

export interface ResourceGenerationOptions {
  gradeLevel: string;
  subject: Subject;
  resourceType: ResourceType;
  theme?: string;
  difficulty?: DifficultyLevel;
  topicArea?: string;
  customInstructions?: string;
  
  // Rubric specific options
  rubricStyle?: '4-point' | '3-point' | 'checklist';
  rubricCriteria?: string[];
  
  // Quiz specific options - only required when resourceType is 'quiz'
  questionCount?: number;
  quizType?: 'vocabulary' | 'comprehension' | 'analysis' | 'mixed';
  selectedQuestionTypes?: string[];
  
  // Content focus options
  includeQuestions?: boolean;
  includeVisuals?: boolean;
  includeExperiments?: boolean;
  includeDiagrams?: boolean;
  includeVocabulary?: boolean;
  visualComplexity?: 'simple' | 'moderate' | 'complex';
  
  // Additional metadata
  focus?: string[];
  readingLevel?: string;
  genre?: string;
  wordCount?: number;
}

export interface ResourceGenerationResult {
  success: boolean;
  resource?: Resource;
  error?: string;
  warnings?: string[];
}

export interface GeneratedResource {
  title: string;
  content: string;
  metadata: {
    gradeLevel: string;
    subject: string;
    resourceType: ResourceType;
    generatedAt: string;
    theme?: string;
    difficulty?: string;
  };
  sections: Array<{
    type: string;
    title?: string;
    content: string;
  }>;
  decorations?: string[];
} 