export type ResourceType = 'worksheet' | 'quiz' | 'rubric' | 'lesson_plan' | 'exit_slip';

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
  score: number;
  description: string;
  examples?: string[];
}

export interface Resource {
  metadata: ResourceMetadata;
  content: ResourceContent;
}

export interface ResourceGenerationOptions {
  gradeLevel: string;
  subject: string;
  resourceType: ResourceType;
  theme?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  problemCount?: number;
  topicArea?: string;
  customInstructions?: string;
  // Quiz specific options
  quizType?: 'vocabulary' | 'comprehension' | 'analysis' | 'mixed';
  literatureTitle?: string;
  literatureAuthor?: string;
  // Content focus options
  includeQuestions?: boolean;
  includeVisuals?: boolean;
  includeExperiments?: boolean;
  includeDiagrams?: boolean;
  includeVocabulary?: boolean;
  readingLevel?: string;
  genre?: string;
  wordCount?: number;
  focus?: string[];
  questionCount?: number;
  visualComplexity?: 'simple' | 'moderate' | 'complex';
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