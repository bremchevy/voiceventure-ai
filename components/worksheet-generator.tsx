"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Download, Edit, Store, CheckCircle, Sparkles, ArrowLeft, Check, Loader2 } from "lucide-react"
import { generatePDF } from "@/lib/utils/pdf"
import { toast } from "@/components/ui/use-toast"
import { WorksheetGenerator } from './generators/WorksheetGenerator'
import { QuizGenerator } from './generators/QuizGenerator'
import { RubricGenerator } from './generators/RubricGenerator'
import { ExitSlipGenerator } from './generators/ExitSlipGenerator'
import { LessonPlanGenerator } from './generators/LessonPlanGenerator'
import { Resource } from '@/lib/types/resource'

// BackArrow component for consistent navigation
const BackArrow = ({
  onBack,
  label = "Back",
  className = "",
}: { onBack: () => void; label?: string; className?: string }) => (
  <button
    onClick={onBack}
    className={`absolute top-4 left-4 z-10 flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors ${className}`}
    aria-label={label}
  >
    <ChevronLeft className="w-5 h-5" />
    <span className="text-sm font-medium">{label}</span>
  </button>
)

interface WorksheetGeneratorProps {
  request?: string
  onComplete?: (resource: Resource) => void
  onBack?: () => void
}

// NEW: Add resource type detection
interface ResourceType {
  type: "worksheet" | "quiz" | "rubric" | "lesson_plan" | "exit_slip"
  icon: string
  title: string
  detectedName?: string
}

interface DetectedSubject {
  subject: string;
  type: string;
}

// NEW: Add additional settings for different resource types
interface WorksheetSettings {
  grade: string
  subject: string
  theme: keyof typeof themeEmojis
  problemType: string
  problemCount: number
  resourceType: "worksheet" | "quiz" | "rubric" | "lesson_plan" | "exit_slip"
  quizQuestionCount?: number
  selectedQuestionTypes?: string[]
  rubricCriteria?: string[]
  rubricStyle?: string
  lessonDuration?: string
  lessonObjectives?: string[]
  lessonType?: string
  customInstructions?: string
  topicArea: string
  difficulty?: 'easy' | 'medium' | 'hard'
  includeVocabulary?: boolean
  readingLevel?: string
  genre?: string
  wordCount?: number
  focus?: string[]
}

// Theme decorations
const themeEmojis = {
  Halloween: ["🎃", "👻", "🦇", "🕷️", "🍭"],
  Winter: ["❄️", "⛄", "🎿", "🧊", "🎄"],
  Spring: ["🌸", "🌷", "🦋", "🌱", "🐝"],
  General: ["⭐", "🌟", "✨", "🎯", "🎈"],
} as const;

// Add this after the themeEmojis constant
const suggestedTopics: Record<string, Record<string, string[]>> = {
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

interface MathProblem {
  question: string
  answer: number
  visual?: string
}

interface Section {
  type: string;
  title?: string;
  content: string;
}

interface GeneratedWorksheet {
  title: string;
  content: string;
  sections: Section[];
  metadata: {
    gradeLevel: string;
    subject: string;
    resourceType: string;
    generatedAt: string;
    theme?: string;
    difficulty?: string;
  };
  decorations?: string[];
}

interface QuizQuestion {
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  number: number;
  question: string;
  points: number;
  options?: string[];
  correct?: string;
  explanation?: string;
  sampleAnswer?: string;
  rubric?: string[];
}

// Resource type detection with context
const resourcePatterns: Array<{
  type: "worksheet" | "quiz" | "rubric" | "lesson_plan" | "exit_slip";
  patterns: RegExp[];
  icon: string;
  title: string;
  desc?: string;
}> = [
  {
    type: "quiz",
    patterns: [
      /\b(?:vocabulary|spelling|reading)\s+quiz\b/i,
      /\b(?:math|science)\s+test\b/i,
      /\bassessment\s+(?:for|on)\s+[^.]+/i,
      /\bmake\s+(?:a|an)\s+quiz\b/i,
      /\bcreate\s+(?:a|an)\s+quiz\b/i
    ],
    icon: "🧠",
    title: "Quiz Generator"
  },
  {
    type: "worksheet",
    patterns: [
      /\b(?:practice|review)\s+(?:worksheet|sheet|problems)\b/i,
      /\b(?:math|reading|writing|science)\s+worksheet\b/i,
      /\bworksheet\s+(?:for|on)\s+[^.]+/i,
      /\bmake\s+(?:a|an)\s+worksheet\b/i,
      /\bcreate\s+(?:a|an)\s+worksheet\b/i
    ],
    icon: "📝",
    title: "Worksheet Generator"
  },
  {
    type: "rubric",
    patterns: [
      /\b(?:grading|scoring)\s+rubric\b/i,
      /\brubric\s+(?:for|on)\s+[^.]+/i,
      /\bmake\s+(?:a|an)\s+rubric\b/i,
      /\bcreate\s+(?:a|an)\s+rubric\b/i
    ],
    icon: "📋",
    title: "Rubric Generator"
  },
  {
    type: "lesson_plan",
    patterns: [
      /\blesson\s+plan\s+(?:for|on)\s+[^.]+/i,
      /\b(?:daily|weekly)\s+lesson\s+plan\b/i,
      /\bmake\s+(?:a|an)\s+lesson\s+plan\b/i,
      /\bcreate\s+(?:a|an)\s+lesson\s+plan\b/i
    ],
    icon: "📚",
    title: "Lesson Plan Generator"
  },
  {
    type: "exit_slip",
    patterns: [
      /\bexit\s+(?:slip|ticket)\b/i,
      /\bbell\s*-?\s*ringer\b/i,
      /\bend\s+of\s+(?:class|lesson)\s+assessment\b/i,
      /\bmake\s+(?:a|an)\s+exit\s+slip\b/i,
      /\bcreate\s+(?:a|an)\s+exit\s+slip\b/i
    ],
    icon: "🚪",
    title: "Exit Slip / Bell Ringer Generator",
    desc: "Quick assessments for the beginning or end of class"
  }
];

export default function ResourceGeneratorWrapper({ request, onComplete, onBack }: WorksheetGeneratorProps) {
  // Resource type detection
  const detectResourceType = (request: string): ResourceType => {
    const lowerRequest = request.toLowerCase();

    // Check each resource type pattern
    for (const resource of resourcePatterns) {
      if (resource.patterns.some(pattern => pattern.test(lowerRequest))) {
        return {
          type: resource.type,
          icon: resource.icon,
          title: resource.title,
          detectedName: resource.type.replace('_', ' ')
        };
      }
    }

    // Default to worksheet if no specific type is detected
    return { type: "worksheet", icon: "📝", title: "Worksheet Generator", detectedName: "worksheet" };
  };

  const [detectedResourceType, setDetectedResourceType] = useState<ResourceType>({
    type: "worksheet",
    icon: "📝",
    title: "Worksheet Generator",
    detectedName: "worksheet",
  });

  // Parse initial request if provided
  useEffect(() => {
    if (request) {
      const resourceType = detectResourceType(request);
      setDetectedResourceType(resourceType);
    }
  }, [request]);

  // Render the appropriate generator based on the detected type
  const renderGenerator = () => {
    switch (detectedResourceType.type) {
      case "quiz":
        return <QuizGenerator request={request} onComplete={onComplete} onBack={onBack} />;
      case "rubric":
        return <RubricGenerator request={request} onComplete={onComplete} onBack={onBack} />;
      case "lesson_plan":
        return <LessonPlanGenerator request={request} onComplete={onComplete} onBack={onBack} />;
      case "exit_slip":
        return <ExitSlipGenerator request={request} onComplete={onComplete} onBack={onBack} />;
      case "worksheet":
      default:
        return <WorksheetGenerator request={request} onComplete={onComplete} onBack={onBack} />;
    }
  };

  return renderGenerator();
}
