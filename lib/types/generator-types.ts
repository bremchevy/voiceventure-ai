import { Resource } from './resource';

export interface BaseGeneratorProps {
  onBack?: () => void;
  onComplete?: (resource: Resource) => void;
  request?: {
    grade?: string;
    subject?: string;
    theme?: string;
    topicArea?: string;
    resourceType?: ResourceType;
    format?: Format;
  } | string;
}

export interface BaseGeneratorSettings {
  grade: string;
  subject: string;
  theme: 'Halloween' | 'Winter' | 'Spring' | 'General';
  topicArea: string;
  customInstructions?: string;
  resourceType?: ResourceType;
  questionCount?: number;
  selectedQuestionTypes?: string[];
  format?: Format;
}

export interface WorksheetSettings extends Omit<BaseGeneratorSettings, 'theme'> {
  theme: 'Halloween' | 'Winter' | 'Spring' | 'General';
  problemCount: number;
  resourceType: ResourceType;
  format: Format;
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
  format: 'reflection_prompt' | 'vocabulary_check' | 'skill_assessment';
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
      "Goal Setting",
      "Bell Ringer Activity",
      "Warm-up Exercise",
      "Quick Review"
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
      "Number Operations & Properties",
      "Fractions & Decimals",
      "Geometry & Measurements",
      "Problem Solving Strategies",
      "Mental Math & Estimation",
      "Algebra Basics",
      "Data & Statistics",
      "Patterns & Sequences"
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
      "Operations Practice",
      "Bell Ringer Warm-up",
      "Quick Math Facts",
      "Mental Math Practice"
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
      "Parts of Speech",
      "Punctuation Rules",
      "Sentence Structure",
      "Common Vocabulary",
      "Word Relationships",
      "Prefixes & Suffixes",
      "Grammar Rules",
      "Language Conventions"
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
      "Character Analysis",
      "Bell Ringer Reading",
      "Quick Comprehension",
      "Word of the Day"
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
      "Earth & Space Systems",
      "Living Things & Ecosystems",
      "Matter & Energy",
      "Forces & Motion",
      "Weather & Climate",
      "Human Body Systems",
      "Environmental Science",
      "Scientific Method"
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
      "Data Analysis",
      "Bell Ringer Observation",
      "Quick Hypothesis",
      "Science Fact Review"
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

// Helper function to check if response is a worksheet
export const isWorksheetResponse = (response: any): boolean => {
  return 'worksheet' in response && Array.isArray(response.worksheet);
};

export type Subject = 'Math' | 'Reading' | 'Science';

export type ResourceType = 'worksheet' | 'quiz' | 'exit_slip' | 'lesson_plan' | 'rubric';

// Math formats
export type MathFormat = 
  | 'standard' 
  | 'guided' 
  | 'interactive'
  | 'problem_solving'
  | 'calculation'
  | 'word_problems'
  | 'showing_work'
  | 'mathematical_reasoning'
  | 'concept_introduction'
  | 'skill_practice'
  | 'problem_based'
  | 'quick_calculation'
  | 'concept_check'
  | 'reflection';

// Reading formats
export type ReadingFormat = 
  | 'comprehension'
  | 'literary_analysis'
  | 'vocabulary_context'
  | 'reading_comprehension'
  | 'vocabulary'
  | 'grammar'
  | 'writing'
  | 'analysis'
  | 'guided_reading'
  | 'literature_study'
  | 'skill_focused'
  | 'summary'
  | 'main_idea'
  | 'reflection';

// Science formats
export type ScienceFormat = 
  | 'lab_experiment'
  | 'observation_analysis'
  | 'concept_application'
  | 'concept_check'
  | 'lab_analysis'
  | 'scientific_method'
  | 'lab_report'
  | 'scientific_process'
  | 'experimental_design'
  | 'inquiry_based'
  | 'experimental'
  | 'observation'
  | 'observation_summary'
  | 'hypothesis_check'
  | 'concept_review';

// Combined format type
export type Format = 
  // Worksheet formats
  | 'standard' 
  | 'guided' 
  | 'interactive'
  // Reading formats
  | 'comprehension'
  | 'vocabulary_context'
  | 'literary_analysis'
  // Science formats
  | 'science_context'
  | 'analysis_focus'
  | 'lab_experiment'
  // Quiz formats
  | 'multiple_choice'
  | 'true_false'
  | 'short_answer'
  // Exit slip formats
  | 'reflection_prompt'
  | 'vocabulary_check'
  | 'skill_assessment'
  // Other resource formats
  | 'full_lesson'
  | 'mini_lesson'
  | 'activity'
  | '4_point'
  | '3_point'
  | 'checklist';

// Remove duplicate declarations:
// export interface WorksheetSettings {
//   grade: string;
//   subject: Subject;
//   theme: string;
//   problemCount: number;
//   topicArea: string;
//   resourceType: ResourceType;
//   format: Format;
//   customInstructions?: string;
// }

// export interface BaseGeneratorProps {
//   onBack: () => void;
//   onComplete: (resource: any) => void;
//   request?: string;
// } 