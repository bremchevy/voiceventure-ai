import { Resource } from './resource';

export interface BaseGeneratorProps {
  onBack?: () => void;
  onComplete?: (resource: Resource) => void;
  request?: string;
}

export interface BaseGeneratorSettings {
  grade: string;
  subject: string;
  theme: 'Halloween' | 'Winter' | 'Spring' | 'General';
  topicArea: string;
  customInstructions?: string;
  includeVocabulary?: boolean;
  resourceType?: 'worksheet' | 'quiz' | 'exit_slip' | 'lesson_plan' | 'rubric';
  questionCount?: number;
  focus?: string[];
  selectedQuestionTypes?: string[];
  format?: string;
}

export interface WorksheetSettings extends BaseGeneratorSettings {
  problemType: string;
  problemCount: number;
  resourceType: 'worksheet' | 'quiz' | 'exit_slip' | 'lesson_plan' | 'rubric';
  format: string;
}

export interface QuizSettings extends BaseGeneratorSettings {
  questionCount: number;
  selectedQuestionTypes: string[];
}

export interface RubricSettings extends BaseGeneratorSettings {
  rubricStyle: '4-point' | '3-point' | 'checklist';
  rubricCriteria: string[];
}

export interface ExitSlipSettings extends BaseGeneratorSettings {
  exitSlipFormat: 'multiple-choice' | 'open-response' | 'rating-scale';
  questionCount: number;
}

export interface LessonPlanSettings extends BaseGeneratorSettings {
  lessonType: 'full-lesson' | 'mini-lesson' | 'activity';
  lessonDuration: string;
  lessonObjectives: string[];
}

// Theme decorations
export const themeEmojis = {
  Halloween: ["🎃", "👻", "🦇", "🕷️", "🍭"],
  Winter: ["❄️", "⛄", "🎿", "🧊", "🎄"],
  Spring: ["🌸", "🌷", "🦋", "🌱", "🐝"],
  General: ["⭐", "🌟", "✨", "🎯", "🎈"],
} as const;

// Suggested topics for each resource type
export const suggestedTopics: Record<string, Record<string, string[]>> = {
  General: {
    quiz: [
      "General Knowledge",
      "Current Events",
      "Critical Thinking",
      "Study Skills",
      "Test Preparation",
      "Mixed Topics Review",
      "Learning Strategies",
      "Time Management",
      "Research Skills",
      "Problem Solving"
    ],
    worksheet: [
      "Study Planning",
      "Note-Taking Skills",
      "Research Methods",
      "Time Management",
      "Project Planning",
      "Learning Strategies"
    ],
    lesson_plan: [
      "Study Skills",
      "Research Methods",
      "Critical Thinking",
      "Time Management",
      "Project-Based Learning"
    ],
    exit_slip: [
      "Learning Reflection",
      "Study Strategy Check",
      "Understanding Assessment",
      "Progress Review",
      "Goal Setting"
    ]
  },
  Math: {
    worksheet: [
      "Addition and Subtraction",
      "Multiplication Tables",
      "Division Practice",
      "Fractions and Decimals",
      "Geometry Basics",
      "Word Problems",
      "Place Value",
      "Money Math",
      "Time and Measurement",
      "Basic Algebra"
    ],
    quiz: [
      "Number Operations",
      "Fraction Operations",
      "Geometry Concepts",
      "Measurement Units",
      "Problem Solving",
      "Math Facts",
      "Mental Math",
      "Math Vocabulary"
    ],
    lesson_plan: [
      "Introduction to Fractions",
      "Understanding Place Value",
      "Basic Geometry Shapes",
      "Addition Strategies",
      "Multiplication Concepts",
      "Money and Currency",
      "Time Telling"
    ],
    exit_slip: [
      "Today's Math Concept",
      "Problem Solving Check",
      "Math Vocabulary Review",
      "Number Sense",
      "Operations Practice"
    ]
  },
  Reading: {
    worksheet: [
      "Reading Comprehension",
      "Main Idea and Details",
      "Character Analysis",
      "Story Elements",
      "Vocabulary Building",
      "Making Inferences",
      "Author's Purpose",
      "Text Features",
      "Sequencing Events",
      "Compare and Contrast"
    ],
    quiz: [
      "Story Comprehension",
      "Vocabulary Check",
      "Reading Strategies",
      "Literary Elements",
      "Character Traits",
      "Reading Fluency"
    ],
    lesson_plan: [
      "Reading Strategies",
      "Phonics and Decoding",
      "Comprehension Skills",
      "Vocabulary Development",
      "Reading Fluency",
      "Literary Elements"
    ],
    exit_slip: [
      "Story Understanding",
      "Vocabulary Check",
      "Reading Strategy",
      "Main Idea Review",
      "Character Analysis"
    ]
  },
  Science: {
    worksheet: [
      "Life Cycles",
      "Weather and Climate",
      "Solar System",
      "Plant Parts",
      "Animal Habitats",
      "Simple Machines",
      "States of Matter",
      "Food Chains",
      "Human Body Systems",
      "Earth's Resources"
    ],
    quiz: [
      "Scientific Method",
      "Earth Science Basics",
      "Life Science Topics",
      "Physical Science",
      "Environmental Science",
      "Space Science"
    ],
    lesson_plan: [
      "Scientific Investigation",
      "Earth and Space",
      "Living Things",
      "Physical Properties",
      "Environmental Science",
      "Weather Studies"
    ],
    exit_slip: [
      "Science Concept Check",
      "Experiment Results",
      "Scientific Vocabulary",
      "Process Understanding",
      "Data Analysis"
    ]
  }
};

// Base API Response types
export type BaseApiResponse = {
  title?: string;
  grade_level?: string;
  topic?: string;
  difficulty_level?: string;
  vocabulary?: Record<string, string>;
};

// Format 1: problems with answer_space
export interface ProblemWithAnswerSpace {
  problem: string;
  answer_space: string;
  final_answer?: string;
}

// Format 2: question-answer format
export interface QuestionAnswer {
  question: string;
  answer: string;
  explanation?: string;
}

// Format 3: worksheet format
export interface WorksheetItem {
  problem: string;
  solution?: string;
  steps?: string[];
}

// Combined problem types
export type ProblemType = 
  | ProblemWithAnswerSpace 
  | QuestionAnswer 
  | WorksheetItem;

// API Response variations
export type ApiResponseFormat1 = BaseApiResponse & {
  problems: ProblemWithAnswerSpace[];
  final_answers: Record<string, string>;
};

export type ApiResponseFormat2 = BaseApiResponse & {
  questions: QuestionAnswer[];
};

export type ApiResponseFormat3 = BaseApiResponse & {
  worksheet: WorksheetItem[];
  answers?: Record<number, string>;
};

// Combined API Response type
export type GeneratorApiResponse = 
  | ApiResponseFormat1 
  | ApiResponseFormat2 
  | ApiResponseFormat3;

// Type guard functions to check response format
export const isFormat1 = (response: any): response is ApiResponseFormat1 => {
  return 'problems' in response && 'final_answers' in response;
};

export const isFormat2 = (response: any): response is ApiResponseFormat2 => {
  return 'questions' in response && Array.isArray(response.questions);
};

export const isFormat3 = (response: any): response is ApiResponseFormat3 => {
  return 'worksheet' in response && Array.isArray(response.worksheet);
}; 