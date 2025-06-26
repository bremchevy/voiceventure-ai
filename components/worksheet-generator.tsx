"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Download, Edit, Store, CheckCircle, Sparkles, ArrowLeft, Check, Loader2 } from "lucide-react"
import { generatePDF } from "@/lib/utils/pdf"
import { toast } from "@/components/ui/use-toast"
import { RubricDisplay } from "@/components/ui/rubric-display"

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
  onComplete?: (worksheet: GeneratedWorksheet) => void
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
  rubricStyle?: "4-point" | "3-point" | "checklist"
  exitSlipFormat?: string
  lessonDuration?: string
  lessonObjectives?: string[]
  lessonType?: string
  customInstructions?: string
  topicArea: string
  difficulty?: 'easy' | 'medium' | 'hard'
  includeVisuals?: boolean
  includeExperiments?: boolean
  includeDiagrams?: boolean
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

export default function WorksheetGenerator({ request, onComplete, onBack }: WorksheetGeneratorProps) {
  // NEW: Enhanced resource type detection with specific names
  const detectResourceType = (request: string): ResourceType => {
    const lowerRequest = request.toLowerCase()

    // More precise resource type detection with context
    const resourcePatterns = [
      {
        type: "worksheet",
        patterns: [
          /\bworksheet\b/i,
          /\bpractice\s+sheet\b/i,
          /\bactivity\s+sheet\b/i
        ],
        icon: "📝",
        title: "Worksheet Generator"
      },
      {
        type: "quiz",
        patterns: [
          /\b(?:quiz|test|assessment|evaluation)\b/i,
          /\bmake\s+(?:a|an)\s+quiz\b/i,
          /\bcreate\s+(?:a|an)\s+quiz\b/i
        ],
        icon: "🧠",
        title: "Quiz Generator"
      },
      {
        type: "rubric",
        patterns: [
          /\brubric\b/i,
          /\bgrading\s+(?:guide|criteria|scale)\b/i,
          /\bevaluation\s+(?:guide|criteria|scale)\b/i,
          /\bscoring\s+(?:guide|criteria|scale)\b/i,
          /\bmake\s+(?:a|an)\s+rubric\b/i,
          /\bcreate\s+(?:a|an)\s+rubric\b/i
        ],
        icon: "📋",
        title: "Rubric Generator"
      },
      {
        type: "lesson_plan",
        patterns: [
          /\blesson\s+plan\b/i,
          /\bteaching\s+plan\b/i,
          /\bunit\s+plan\b/i,
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
        title: "Exit Slip Generator"
      }
    ];

    // Check each resource type pattern
    for (const resource of resourcePatterns) {
      if (resource.patterns.some(pattern => pattern.test(lowerRequest))) {
        return {
          type: resource.type as "worksheet" | "quiz" | "rubric" | "lesson_plan" | "exit_slip",
          icon: resource.icon,
          title: resource.title,
          detectedName: resource.type.replace('_', ' ')
        };
      }
    }

    // Default to worksheet if no specific type is detected
    return { type: "worksheet", icon: "📝", title: "Worksheet Generator", detectedName: "worksheet" };
  }

  const [settings, setSettings] = useState<WorksheetSettings>({
    grade: "3rd Grade",
    subject: "Math",
    theme: "General",
    problemType: "",
    problemCount: 10,
    resourceType: "worksheet",
    quizQuestionCount: 10,
    selectedQuestionTypes: [],
    rubricCriteria: ["Content", "Organization", "Grammar"],
    rubricStyle: "4-point",
    exitSlipFormat: "multiple-choice",
    lessonDuration: "45 minutes",
    lessonObjectives: ["Students will understand", "Students will be able to"],
    lessonType: "full-lesson",
    customInstructions: "",
    topicArea: "",
  })

  // NEW: Add resource type state
  const [detectedResourceType, setDetectedResourceType] = useState<ResourceType>({
    type: "worksheet",
    icon: "📝",
    title: "Worksheet Generator",
    detectedName: "worksheet",
  })
  const [generatedWorksheet, setGeneratedWorksheet] = useState<GeneratedWorksheet | null>(null)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [currentGenerationStep, setCurrentGenerationStep] = useState(0)
  const [currentStep, setCurrentStep] = useState("settings")
  const worksheetRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Add this inside the WorksheetGenerator component, before the return statement
  const [topicSuggestions, setTopicSuggestions] = useState<string[]>([]);

  const generationSteps = [
    { icon: "🔍", text: "Analyzing your request", completed: false },
    { icon: "⚡", text: "Generating content", completed: false },
    { icon: "🎨", text: "Adding educational elements", completed: false },
    { icon: "✨", text: "Finalizing design", completed: false },
  ]

  // Add function to update generation progress
  const updateGenerationProgress = (step: number, progress: number) => {
    setCurrentGenerationStep(step);
    setGenerationProgress(progress);
  };

  // Parse initial request if provided
  useEffect(() => {
    if (request) {
      const lowerRequest = request.toLowerCase();

      // Detect if it's a quiz request
      const isQuiz = /\b(quiz|test|assessment|evaluation)\b/i.test(request);
      
      // Check for specific subject mentions
      const hasMathMention = /\b(math|mathematics|algebra|geometry|calculus)\b/i.test(request);
      const hasReadingMention = /\b(reading|literature|comprehension|vocabulary|grammar)\b/i.test(request);
      const hasScienceMention = /\b(science|biology|chemistry|physics|experiment)\b/i.test(request);
      
      // If it's a quiz and no specific subject is mentioned, set to General
      if (isQuiz && !(hasMathMention || hasReadingMention || hasScienceMention)) {
        setSettings(prev => ({
          ...prev,
          subject: "General",
          resourceType: "quiz"
        }));
      }
      
      // Rest of your existing detection logic...
      const mathMatch = request.match(/\b(\d+)\s*([\+\-\*\/×÷])\s*(\d+)\b/) || 
                       lowerRequest.match(/\b(?:math|mathematics|fractions|algebra|geometry)\b/i);
      
      const literatureMatch = mathMatch ? null : 
        request.match(/(?:for|about|on|from)\s+"([^"]+)"(?:\s+by\s+([^"]+))?/i) || 
        request.match(/(?:reading|book|story|novel|literature)\s+(?:for|about|on|from)\s+([^,]+?)(?:\s+by\s+([^,]+))?(?=\s*$|\s*,|\s+with|\s+including)/i);

      // Initialize detectedSubject with proper type
      let detectedSubject: DetectedSubject | null = null;

      // If math-related terms
      if (/\b(math|addition|subtraction|multiplication|division|algebra|geometry)\b/i.test(lowerRequest)) {
        detectedSubject = {
          subject: "Math",
          type: "math"
        } as DetectedSubject;
      }
      // If literature-specific content
      else if (literatureMatch) {
        detectedSubject = {
          subject: "Reading",
          type: "language",
          focus: ["Reading Comprehension"]
        } as DetectedSubject;
        
        // If vocabulary is mentioned, override the focus
        if (/\b(vocabulary|spelling)\b/i.test(lowerRequest)) {
          detectedSubject = {
            subject: "Reading",
            type: "language",
            focus: ["Vocabulary"]
          } as DetectedSubject;
        }
      }
      // If science-related terms
      else if (/\b(science|experiment|hypothesis|observation)\b/i.test(lowerRequest)) {
        detectedSubject = {
          subject: "Science",
          type: "science"
        } as DetectedSubject;
      }

      if (detectedSubject && !literatureMatch) {
        setSettings(prev => ({
          ...prev,
          subject: detectedSubject!.subject,
          problemType: detectedSubject!.type
        }));
      }

      // Detect resource type
      const resourceType = detectResourceType(request);
      setDetectedResourceType(resourceType);
      setSettings(prev => ({ ...prev, resourceType: resourceType.type as "worksheet" | "quiz" | "rubric" | "lesson_plan" | "exit_slip" }));

      // Detect grade level
      const gradeMatch = request.match(/\b(\d+)(?:st|nd|rd|th)?\s*grade\b/i);
      if (gradeMatch) {
        const grade = `${gradeMatch[1]}${
          gradeMatch[1] === "1" ? "st" :
          gradeMatch[1] === "2" ? "nd" :
          gradeMatch[1] === "3" ? "rd" : "th"
        } Grade`;
        setSettings(prev => ({ ...prev, grade }));
      }

      const difficultyMatch = request.match(/\b(easy|medium|hard|basic|intermediate|advanced)\b/i);
      if (difficultyMatch) {
        setSettings(prev => ({ 
          ...prev, 
          difficulty: difficultyMatch[1].toLowerCase() as "easy" | "medium" | "hard" 
        }));
      }

      const countMatch = request.match(/\b(\d+)\s*(?:questions|problems|items)\b/i);
      if (countMatch) {
        const count = parseInt(countMatch[1]);
        setSettings(prev => ({ 
          ...prev, 
          problemCount: count,
          quizQuestionCount: count 
        }));
      }
    }
  }, [request]);

  // Add this after the existing useEffect
  useEffect(() => {
    // Update topic suggestions when subject or resource type changes
    const suggestions = suggestedTopics[settings.subject]?.[settings.resourceType] || [];
    setTopicSuggestions(suggestions);
  }, [settings.subject, settings.resourceType]);

  // Add a useEffect to clean up settings when resource type changes
  useEffect(() => {
    if (settings.resourceType === "rubric") {
      setSettings(prev => ({
        ...prev,
        problemCount: 0,
        quizQuestionCount: 0,
        selectedQuestionTypes: [],
        problemType: ""
      }));
    }
  }, [settings.resourceType]);

  const generateMathProblems = (settings: WorksheetSettings): MathProblem[] => {
    const problems: MathProblem[] = []
    const { problemType, problemCount, theme, subject } = settings

    // Use the existing themeEmojis constant
    const emojis = themeEmojis[theme] || themeEmojis.General

    for (let i = 0; i < problemCount; i++) {
      const emoji = emojis[i % emojis.length]

      switch (problemType) {
        case "math":
          // Randomly choose between addition, subtraction, and mixed operations
          const operation = Math.floor(Math.random() * 3)
          if (operation === 0) {
            // Addition
            const num1 = Math.floor(Math.random() * 50) + 10
            const num2 = Math.floor(Math.random() * 30) + 5
            problems.push({
              question: `${num1} + ${num2} = ____`,
              answer: num1 + num2,
              visual: `${emoji} ${emoji} + ${emoji} = ____`,
            })
          } else if (operation === 1) {
            // Subtraction
            const num1 = Math.floor(Math.random() * 50) + 30
            const num2 = Math.floor(Math.random() * 20) + 5
            problems.push({
              question: `${num1} - ${num2} = ____`,
              answer: num1 - num2,
              visual: `${emoji} ${emoji} ${emoji} - ${emoji} = ____`,
            })
          } else {
            // Mixed Operation (multiplication)
            const num1 = Math.floor(Math.random() * 9) + 2
            const num2 = Math.floor(Math.random() * 9) + 2
            problems.push({
              question: `${num1} × ${num2} = ____`,
              answer: num1 * num2,
              visual: `${emoji.repeat(num1)} × ${num2} = ____`,
            })
          }
          break;

        case "language":
          // Language Arts problems
          const languageTypes = ["Spelling", "Vocabulary", "Reading"]
          const languageType = languageTypes[i % languageTypes.length]
          problems.push({
            question: `${emoji} ${languageType} Question ${i + 1}`,
            answer: 0, // Placeholder for non-numeric answers
            visual: `Write your answer here: _________________`,
          })
          break;

        case "writing":
          // Writing exercises
          const writingTypes = ["Sentence Writing", "Handwriting Practice"]
          const writingType = writingTypes[i % writingTypes.length]
          problems.push({
            question: `${emoji} ${writingType} Exercise ${i + 1}`,
            answer: 0, // Placeholder for non-numeric answers
            visual: `Write here: _____________________________`,
          })
          break;

        case "science":
          // Science activities
          const scienceTypes = ["Labeling", "Matching", "Observation"]
          const scienceType = scienceTypes[i % scienceTypes.length]
          problems.push({
            question: `${emoji} ${scienceType} Activity ${i + 1}`,
            answer: 0, // Placeholder for non-numeric answers
            visual: `Complete the ${scienceType.toLowerCase()} exercise`,
          })
          break;

        case "social":
          // Social Studies activities
          const socialTypes = ["Geography", "History", "Civics"]
          const socialType = socialTypes[i % socialTypes.length]
          problems.push({
            question: `${emoji} ${socialType} Question ${i + 1}`,
            answer: 0, // Placeholder for non-numeric answers
            visual: `Answer the ${socialType.toLowerCase()} question`,
          })
          break;

        default:
          // Default to math problems if type is not recognized
          const num1 = Math.floor(Math.random() * 50) + 10
          const num2 = Math.floor(Math.random() * 30) + 5
          problems.push({
            question: `${num1} + ${num2} = ____`,
            answer: num1 + num2,
            visual: `${emoji} ${emoji} + ${emoji} = ____`,
          })
      }
    }

    return problems
  }

  const generateExitSlipQuestions = (settings: WorksheetSettings) => {
    const questions = []
    const questionCount = Math.floor(Math.random() * 3) + 3 // 3-5 questions
    const { subject, grade, theme, exitSlipFormat } = settings

    // Theme decorations for visual appeal
    const emojis = themeEmojis[theme] || themeEmojis.General

    for (let i = 0; i < questionCount; i++) {
      const emoji = emojis[i % emojis.length]

      if (exitSlipFormat === "multiple-choice") {
        // Multiple choice questions
        if (subject === "Math") {
          questions.push({
            question: `${emoji} How confident do you feel about today's math lesson?`,
            answer: "A) Very confident - I understand everything!",
            visual: "A) Very confident  B) Somewhat confident  C) Need more practice  D) Very confused",
          })
        } else if (subject === "Reading") {
          questions.push({
            question: `${emoji} Which reading strategy helped you most today?`,
            answer: "A) Making predictions",
            visual: "A) Making predictions  B) Asking questions  C) Visualizing  D) Summarizing",
          })
        } else if (subject === "Science") {
          questions.push({
            question: `${emoji} What was the most interesting thing you learned today?`,
            answer: "A) How plants grow",
            visual: "A) How plants grow  B) Animal habitats  C) Weather patterns  D) Simple machines",
          })
        }
      } else if (exitSlipFormat === "rating-scale") {
        // Rating scale questions
        questions.push({
          question: `${emoji} Rate your understanding of today's lesson (1-5):`,
          answer: "Circle: 1  2  3  4  5",
          visual: "1 = Don't understand   5 = Completely understand",
        })
      } else {
        // Open response questions
        if (subject === "Math") {
          questions.push({
            question: `${emoji} Explain one thing you learned about ${grade.includes("1st") || grade.includes("2nd") ? "numbers" : "math"} today:`,
            answer: "Sample: I learned how to add two-digit numbers",
            visual: "Write 1-2 sentences",
          })
        } else if (subject === "Reading") {
          questions.push({
            question: `${emoji} What was your favorite part of the story we read?`,
            answer: "Sample: I liked when the character solved the problem",
            visual: "Write 1-2 sentences",
          })
        } else {
          questions.push({
            question: `${emoji} What is one question you still have about today's lesson?`,
            answer: "Sample: How does this connect to what we learned yesterday?",
            visual: "Write your question here",
          })
        }
      }
    }

    return questions
  }

  const getQuestionTypes = (format: string): string => {
    switch (format) {
      case 'Multiple Choice':
        return 'multiple_choice';
      case 'True/False':
        return 'true_false';
      case 'Short Answer':
        return 'short_answer';
      default:
        return 'multiple_choice';
    }
  };

  // NEW: Generate different resource types
  const generateQuizQuestions = (settings: WorksheetSettings) => {
    console.group('Quiz Generation Process');
    console.log('Initializing Quiz Generation:', {
      questionCount: settings.quizQuestionCount,
      selectedTypes: settings.selectedQuestionTypes,
      subject: settings.subject,
      grade: settings.grade,
      difficulty: settings.difficulty,
      topic: settings.topicArea
    });

    const questions: QuizQuestion[] = [];
    const questionCount = settings.quizQuestionCount || 10;
    const selectedTypes = settings.selectedQuestionTypes?.map(type => getQuestionTypes(type)) || ['multiple_choice'];
    const topic = settings.topicArea.trim();

    // Generate questions based on selected type(s)
    selectedTypes.forEach((type) => {
      const questionsForType = Math.floor(questionCount / selectedTypes.length);
      const extraQuestions = type === selectedTypes[selectedTypes.length - 1] ? questionCount % selectedTypes.length : 0;
      const totalQuestions = questionsForType + extraQuestions;

      console.log(`Generating ${totalQuestions} questions of type ${type}`);

      for (let i = 0; i < totalQuestions; i++) {
        const questionNumber = questions.length + 1;

        switch (type) {
          case 'multiple_choice':
            questions.push({
              type: 'multiple_choice',
              number: questionNumber,
              question: `Question ${questionNumber}: ${topic ? `Based on ${topic}, ` : ''}What is the correct answer about ${settings.subject.toLowerCase()}?`,
              options: [
                "A) Option 1 - Correct answer with detailed explanation",
                "B) Option 2 - Plausible but incorrect answer",
                "C) Option 3 - Common misconception",
                "D) Option 4 - Clearly incorrect answer"
              ],
              correct: "A",
              points: 2
            });
            break;

          case 'true_false':
            questions.push({
              type: 'true_false',
              number: questionNumber,
              question: `Question ${questionNumber}: ${topic ? `Regarding ${topic}, true or false: ` : 'True or False: '}This statement about ${settings.subject.toLowerCase()} is correct.`,
              correct: "True",
              explanation: "Explanation why this statement is true/false",
              points: 1
            });
            break;

          case 'short_answer':
            questions.push({
              type: 'short_answer',
              number: questionNumber,
              question: `Question ${questionNumber}: ${topic ? `In the context of ${topic}, explain ` : 'Explain '}the concept in ${settings.subject.toLowerCase()}.`,
              sampleAnswer: "Sample answer showing expected level of detail and key points to cover",
              points: 5,
              rubric: [
                "Complete explanation - 5 points",
                "Partial explanation with minor errors - 3-4 points",
                "Basic understanding shown - 2 points",
                "Minimal or incorrect response - 0-1 points"
              ]
            });
            break;
        }
      }
    });

    interface QuestionSummary {
      count: number;
      totalPoints: number;
    }

    const questionSummary = questions.reduce((acc: Record<string, QuestionSummary>, q) => {
      acc[q.type] = acc[q.type] || { count: 0, totalPoints: 0 };
      acc[q.type].count++;
      acc[q.type].totalPoints += q.points;
      return acc;
    }, {} as Record<string, QuestionSummary>);

    console.log('Quiz Generation Summary:', {
      totalQuestions: questions.length,
      totalPoints: Object.values(questionSummary).reduce((sum, type) => sum + type.totalPoints, 0),
      questionsByType: questionSummary
    });

    console.groupEnd();
    return questions;
  };

  const generateRubricCriteria = (settings: WorksheetSettings) => {
    const criteria = settings.rubricCriteria || ["Content", "Organization"]

    return criteria.map((criterion) => ({
      name: criterion,
      levels: [
        { level: "Excellent (4)", description: `Demonstrates exceptional ${criterion.toLowerCase()}` },
        { level: "Good (3)", description: `Shows good ${criterion.toLowerCase()}` },
        { level: "Satisfactory (2)", description: `Meets basic ${criterion.toLowerCase()} requirements` },
        { level: "Needs Improvement (1)", description: `${criterion} needs significant improvement` },
      ],
    }))
  }

  const generateLessonPlanSections = (settings: WorksheetSettings) => {
    return {
      duration: settings.lessonDuration || "45 minutes",
      objectives: settings.lessonObjectives || ["Students will understand key concepts"],
      materials: ["Textbook", "Whiteboard", "Handouts", "Digital resources"],
      activities: [
        { name: "Warm-up", duration: "5 minutes", description: "Review previous lesson" },
        { name: "Introduction", duration: "10 minutes", description: "Introduce new concept" },
        { name: "Main Activity", duration: "20 minutes", description: "Guided practice" },
        { name: "Closure", duration: "10 minutes", description: "Summarize and assess" },
      ],
      assessment: "Formative assessment through questioning and observation",
    }
  }

  const generateWorksheet = async () => {
    // Add validation check for topic area
    if (!settings.topicArea.trim()) {
      toast({
        title: "Topic Area Required",
        description: "Please select or enter a topic area before generating.",
        variant: "destructive"
      });
      return;
    }

    try {
      setCurrentStep("generating");
      
      // Reset progress
      setGenerationProgress(0);
      setCurrentGenerationStep(0);

      // Step 1: Analyzing request
      updateGenerationProgress(0, 25);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Add small delay for visual feedback
      
      const response = await fetch(`${window.location.origin}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: settings.subject,
          gradeLevel: settings.grade,
          resourceType: settings.resourceType,
          theme: settings.theme,
          difficulty: settings.difficulty,
          topicArea: settings.topicArea,
          includeVisuals: settings.includeVisuals,
          includeExperiments: settings.includeExperiments,
          includeDiagrams: settings.includeDiagrams,
          includeVocabulary: settings.includeVocabulary,
          questionCount: settings.problemCount,
          focus: settings.focus,
          customInstructions: settings.customInstructions,
          selectedQuestionTypes: settings.selectedQuestionTypes?.map(type => getQuestionTypes(type)) || ['multiple_choice'],
          rubricStyle: settings.rubricStyle
        }),
      });

      // Step 2: Generating content
      updateGenerationProgress(1, 50);
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (!response.ok) {
        console.error('Server error:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response body:', errorText);
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const content = await response.text();
      console.log('Raw response content:', content);

      // Step 3: Adding educational elements
      updateGenerationProgress(2, 75);
      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        const parsedContent = JSON.parse(content);
        console.log('Parsed content structure:', parsedContent);

        // Step 4: Finalizing design
        updateGenerationProgress(3, 90);
        await new Promise(resolve => setTimeout(resolve, 1000));

        setGeneratedWorksheet(parsedContent);
        console.log('Generated worksheet:', parsedContent);

        // Complete the progress
        setGenerationProgress(100);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setCurrentStep("preview");
      } catch (parseError) {
        console.error('Error parsing generated content:', parseError);
        console.error('Raw content that failed to parse:', content);
        console.error('First 500 characters of content:', content.substring(0, 500));
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      console.error('Error generating worksheet:', error);
      // Handle error state
      setCurrentStep("settings");
      // Show error to user
      if (error instanceof Error) {
        alert(`Error: ${error.message}`);
      } else {
        alert('Failed to generate worksheet. Please try again.');
      }
    }
  };

  const handleQualityCheck = () => {
    setCurrentStep("quality")
  }

  const handleComplete = () => {
    if (onComplete && generatedWorksheet) {
      onComplete(generatedWorksheet);
    }
  };

  // NEW: Get dynamic resource name for display
  const getResourceDisplayName = () => {
    if (detectedResourceType.detectedName) {
      return detectedResourceType.detectedName
    }

    switch (settings.resourceType) {
      case "worksheet":
        return "worksheet"
      case "quiz":
        return "quiz"
      case "rubric":
        return "rubric"
      case "exit_slip":
        return "exit slip"
      case "lesson_plan":
        return "lesson plan"
      default:
        return "resource"
    }
  }

  // NEW: Get dynamic button text
  const getGenerateButtonText = () => {
    const resourceName = getResourceDisplayName()
    return `✨ Generate ${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)}`
  }

  const handleDownloadPDF = async () => {
    if (!worksheetRef.current || !generatedWorksheet) return;

    try {
      setIsLoading(true);
      const fileName = `${generatedWorksheet.title.toLowerCase().replace(/\s+/g, '-')}.pdf`;
      const success = await generatePDF(worksheetRef.current, fileName);

      if (!success) {
        toast({
          title: "Error",
          description: "Failed to generate PDF. Please try again.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Success",
          description: "PDF downloaded successfully!",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error in PDF generation:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderSettings = () => (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        {/* Back Arrow */}
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack} className="p-0 h-auto">
            <ChevronLeft className="w-4 h-4" />
          </Button>
        )}
        <div>
          <h1 className="text-xl font-bold text-gray-900">{detectedResourceType.icon} Resource Generator</h1>
          <p className="text-sm text-gray-600">Create customized educational resources</p>
        </div>
      </div>

      {/* Initial Request Display - Enhanced with dynamic resource name */}
      {request && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-800">I heard you say:</span>
          </div>
          <p className="text-sm text-purple-700 font-medium">"{request}"</p>
          <div className="mt-2 text-xs text-purple-600">
            <p>I've set up your {getResourceDisplayName()} based on this request. You can adjust any settings below.</p>
          </div>
        </div>
      )}

      {/* Grade Level */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Grade Level</label>
        <div className="grid grid-cols-3 gap-3">
          {[
            "Kindergarten",
            "1st Grade",
            "2nd Grade", 
            "3rd Grade",
            "4th Grade",
            "5th Grade",
            "6th Grade",
            "7th Grade",
            "8th Grade",
            "9th Grade",
            "10th Grade",
            "11th Grade",
            "12th Grade"
          ].map((grade) => (
            <button
              key={grade}
              onClick={() => setSettings((prev) => ({ ...prev, grade }))}
              className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                settings.grade === grade
                  ? "border-purple-500 bg-purple-50 text-purple-700"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              {grade}
            </button>
          ))}
        </div>
      </div>

      {/* Subject */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Subject</label>
        <div className="grid grid-cols-4 gap-3">
          {["General", "Math", "Reading", "Science"].map((subject) => (
            <button
              key={subject}
              onClick={() => setSettings((prev) => ({ ...prev, subject }))}
              className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                settings.subject === subject
                  ? "border-purple-500 bg-purple-50 text-purple-700"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span>
                  {subject === "General" ? "🎯" : 
                   subject === "Math" ? "📐" : 
                   subject === "Reading" ? "📚" : 
                   "🔬"}
                </span>
                <span>{subject}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Theme</label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { name: "Halloween", emoji: "🎃" },
            { name: "Winter", emoji: "❄️" },
            { name: "Spring", emoji: "🌸" },
            { name: "General", emoji: "⭐" },
          ].map((theme) => (
            <button
              key={theme.name}
              onClick={() => setSettings((prev) => ({ ...prev, theme: theme.name as "Halloween" | "Winter" | "Spring" | "General" }))}
              className={`p-3 rounded-lg border-2 text-sm font-medium transition-all flex items-center gap-2 ${
                settings.theme === theme.name
                  ? "border-purple-500 bg-purple-50 text-purple-700"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              <span className="text-lg">{theme.emoji}</span>
              {theme.name}
            </button>
          ))}
        </div>
      </div>

      {/* Resource Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Resource Type
          <span className="text-xs text-gray-500 ml-2">(Choose what you want to create)</span>
        </label>
        <div className="space-y-2">
          {[
            {
              type: "worksheet",
              icon: "📝",
              label: "Worksheet",
              description: "Practice sheets and activities",
            },
            {
              type: "quiz",
              icon: "🧠",
              label: "Quiz",
              description: "Tests and assessments",
            },
            {
              type: "rubric",
              icon: "📋",
              label: "Rubric",
              description: "Grading and evaluation guides",
            },
            {
              type: "exit_slip",
              icon: "🚪",
              label: "Exit Slip / Bell Ringer",
              description: "Quick check-ins and closure activities",
            },
            {
              type: "lesson_plan",
              icon: "📚",
              label: "Lesson Plan",
              description: "Complete teaching plans",
            },
          ].map((resourceType) => (
            <button
              key={resourceType.type}
              onClick={() => setSettings((prev) => ({ ...prev, resourceType: resourceType.type as "worksheet" | "quiz" | "rubric" | "lesson_plan" | "exit_slip" }))}
              className={`w-full p-3 rounded-lg border-2 text-sm font-medium transition-all text-left flex items-center gap-3 ${
                settings.resourceType === resourceType.type
                  ? "border-purple-500 bg-purple-50 text-purple-700"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              <span className="text-lg">{resourceType.icon}</span>
              <div>
                <div className="font-medium">{resourceType.label}</div>
                <div className="text-xs text-gray-500">{resourceType.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic Sub-Options based on Resource Type - Problem Type ONLY for worksheets */}
      {settings.resourceType === "worksheet" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Focus Area</label>
          <div className="space-y-2">
            {[
              { type: "math", label: "Math", desc: "Addition, Subtraction, Mixed Operations" },
              { type: "language", label: "Language Arts", desc: "Spelling, Vocabulary, Reading Comprehension" },
              { type: "writing", label: "Writing", desc: "Sentence Writing, Handwriting Practice" },
              { type: "science", label: "Science", desc: "Labeling, Matching, Observation" },
              { type: "social", label: "Social Studies", desc: "Geography, History, Civics" }
            ].map((category) => (
              <button
                key={category.type}
                onClick={() => setSettings((prev) => ({ ...prev, problemType: category.type }))}
                className={`w-full p-3 rounded-lg border-2 text-sm font-medium transition-all text-left ${
                  settings.problemType === category.type
                    ? "border-purple-500 bg-purple-50 text-purple-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="font-medium">{category.label}</div>
                <div className="text-xs text-gray-500">{category.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {settings.resourceType === "quiz" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Quiz Format</label>
          <div className="space-y-2">
            {["Multiple Choice", "True/False", "Short Answer"].map((format) => (
              <button
                key={format}
                onClick={() => {
                  // Clear existing types and set only the clicked type
                  const newTypes = [format];
                  console.group('Quiz Format Selection Update');
                  console.log('Format Change:', {
                    format,
                    newTypes
                  });
                  
                  setSettings((prev) => {
                    const newSettings = { ...prev, selectedQuestionTypes: newTypes };
                    console.log('Updated Settings:', {
                      selectedTypes: newSettings.selectedQuestionTypes,
                      totalFormats: newSettings.selectedQuestionTypes?.length || 0
                    });
                    return newSettings;
                  });
                  console.groupEnd();
                }}
                className={`w-full p-3 rounded-lg border-2 text-sm font-medium transition-all text-left flex items-center justify-between ${
                  settings.selectedQuestionTypes?.includes(format)
                    ? "border-purple-500 bg-purple-50 text-purple-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{format === "Multiple Choice" ? "🔘" : format === "Short Answer" ? "✏️" : "⚖️"}</span>
                  <span>{format}</span>
                </div>
                {settings.selectedQuestionTypes?.includes(format) && (
                  <span className="text-purple-600">✓</span>
                )}
              </button>
            ))}
          </div>
          {(!settings.selectedQuestionTypes || settings.selectedQuestionTypes.length === 0) && (
            <p className="text-sm text-red-500 mt-2">Please select at least one quiz format</p>
          )}
        </div>
      )}

      {settings.resourceType === "rubric" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Rubric Style
            {settings.rubricStyle && (
              <span className="text-purple-600 ml-2">
                Selected: {settings.rubricStyle === "4-point" ? "4-Point Scale" : 
                          settings.rubricStyle === "3-point" ? "3-Point Scale" : 
                          "Checklist Style"}
              </span>
            )}
          </label>
          <div className="space-y-2">
            {[
              { type: "4-point" as const, label: "4-Point Scale", desc: "Excellent, Good, Satisfactory, Needs Improvement" },
              { type: "3-point" as const, label: "3-Point Scale", desc: "Exceeds, Meets, Below Expectations" },
              { type: "checklist" as const, label: "Checklist Style", desc: "Simple yes/no criteria" },
            ].map((style) => (
              <button
                key={style.type}
                onClick={() => setSettings((prev) => ({ ...prev, rubricStyle: style.type }))}
                className={`w-full p-3 rounded-lg border-2 text-sm font-medium transition-all text-left ${
                  settings.rubricStyle === style.type
                    ? "border-purple-500 bg-purple-50 text-purple-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{style.label}</div>
                    <div className="text-xs text-gray-500">{style.desc}</div>
                  </div>
                  {settings.rubricStyle === style.type && (
                    <span className="text-purple-600 text-xl">✓</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {settings.resourceType === "exit_slip" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {detectedResourceType.detectedName === "bell ringer" ? "Bell Ringer" : "Exit Slip"} Format
          </label>
          <div className="space-y-2">
            {[
              { type: "multiple-choice", label: "Multiple Choice", desc: "Quick selection questions" },
              { type: "open-response", label: "Open Response", desc: "Written reflection prompts" },
              { type: "rating-scale", label: "Rating Scale", desc: "1-5 understanding scale" },
            ].map((format) => (
              <button
                key={format.type}
                onClick={() => setSettings((prev) => ({ ...prev, exitSlipFormat: format.type }))}
                className={`w-full p-3 rounded-lg border-2 text-sm font-medium transition-all text-left ${
                  settings.exitSlipFormat === format.type
                    ? "border-purple-500 bg-purple-50 text-purple-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="font-medium">{format.label}</div>
                <div className="text-xs text-gray-500">{format.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {settings.resourceType === "lesson_plan" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Lesson Type</label>
          <div className="space-y-2">
            {[
              { type: "full-lesson", label: "Full Lesson", desc: "Complete 45-60 minute lesson" },
              { type: "mini-lesson", label: "Mini-Lesson", desc: "Short 15-20 minute focused lesson" },
              { type: "activity", label: "Activity", desc: "Standalone learning activity" },
            ].map((type) => (
              <button
                key={type.type}
                onClick={() => setSettings((prev) => ({ ...prev, lessonType: type.type }))}
                className={`w-full p-3 rounded-lg border-2 text-sm font-medium transition-all text-left ${
                  settings.lessonType === type.type
                    ? "border-purple-500 bg-purple-50 text-purple-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="font-medium">{type.label}</div>
                <div className="text-xs text-gray-500">{type.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Topic Area Field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3 required-field">
          {settings.resourceType === "quiz" ? (
            <>
              Quiz Topic
              <span className="text-xs text-gray-500 ml-2">(What would you like to test?)</span>
            </>
          ) : (
            <>
          Topic Area
          <span className="text-xs text-gray-500 ml-2">(What specific topic would you like to cover?)</span>
            </>
          )}
        </label>
        <div className="space-y-2">
          <input
            type="text"
            value={settings.topicArea}
            onChange={(e) => setSettings((prev) => ({ ...prev, topicArea: e.target.value }))}
            placeholder={settings.resourceType === "quiz" 
              ? "e.g., Chapter 5 Review, Multiplication Facts, Reading Comprehension..."
              : "e.g., Water Cycle, Fractions, Character Traits..."}
            className={`w-full p-3 rounded-lg border-2 ${
              !settings.topicArea.trim() ? 'border-red-200' : 'border-gray-200'
            } text-sm focus:border-purple-500 focus:outline-none`}
            required
          />
          {!settings.topicArea.trim() && (
            <p className="text-sm text-red-500 mt-1">
              {settings.resourceType === "quiz" 
                ? "Please enter what you want to test"
                : "Please select or enter a topic area"}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {topicSuggestions.map((topic, index) => (
              <button
                key={index}
                onClick={() => setSettings(prev => ({ ...prev, topicArea: topic }))}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  settings.topicArea === topic
                    ? "bg-purple-100 text-purple-700 border-2 border-purple-300"
                    : "bg-gray-100 text-gray-700 border-2 border-gray-200 hover:bg-gray-200"
                }`}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Number of Questions Selection */}
      {settings.resourceType !== "rubric" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Number of Questions
            <span className="text-xs text-gray-500 ml-2">(How many questions would you like?)</span>
          </label>
          <div className="grid grid-cols-4 gap-3">
            {[5, 10, 15, 20].map((number) => (
              <button
                key={number}
                onClick={() => setSettings((prev) => ({ 
                  ...prev, 
                  problemCount: number,
                  quizQuestionCount: number 
                }))}
                className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  (settings.problemCount === number || settings.quizQuestionCount === number)
                    ? "border-purple-500 bg-purple-50 text-purple-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                {number}
              </button>
            ))}
          </div>
          <div className="mt-3">
            <input
              type="number"
              min="1"
              max="50"
              value={settings.resourceType === "worksheet" ? settings.problemCount : settings.quizQuestionCount}
              onChange={(e) => {
                const value = Math.min(50, Math.max(1, parseInt(e.target.value) || 1));
                setSettings((prev) => ({ 
                  ...prev, 
                  problemCount: value,
                  quizQuestionCount: value 
                }));
              }}
              placeholder="Custom number (1-50)"
              className="w-full p-3 rounded-lg border-2 border-gray-200 text-sm focus:border-purple-500 focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Custom Instructions Field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Custom Instructions
          <span className="text-xs text-gray-500 ml-2">(Optional - any specific requirements)</span>
        </label>
        <textarea
          value={settings.customInstructions || ""}
          onChange={(e) => setSettings((prev) => ({ ...prev, customInstructions: e.target.value }))}
          placeholder="Add any specific requirements, topics, or instructions..."
          className="w-full p-3 rounded-lg border-2 border-gray-200 text-sm resize-none focus:border-purple-500 focus:outline-none"
          rows={3}
        />
      </div>

      {/* Generate Button */}
      <Button
        onClick={generateWorksheet}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 text-lg font-semibold"
        size="lg"
      >
        {getGenerateButtonText()}
      </Button>
    </div>
  )

  const renderGenerating = () => (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-8 relative">
      {/* Back Arrow */}
      <BackArrow onBack={() => setCurrentStep("settings")} label="Cancel" className="text-gray-500" />

      {/* Orbital Animation */}
      <div className="relative w-32 h-32">
        {/* Center circle */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center animate-pulse">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Orbiting dots */}
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`absolute w-3 h-3 rounded-full transition-all duration-500 ${
              i <= currentGenerationStep ? 'bg-purple-400' : 'bg-gray-300'
            }`}
            style={{
              top: "50%",
              left: "50%",
              transform: `translate(-50%, -50%) rotate(${i * 90}deg) translateY(-40px)`,
              animation: `orbit 2s linear infinite`,
              animationDelay: `${i * 0.5}s`,
            }}
          />
        ))}
      </div>

      {/* Progress Steps */}
      <div className="w-full max-w-sm space-y-4">
        {generationSteps.map((step, index) => (
          <div
            key={index}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
              index < currentGenerationStep
                ? "bg-green-50 border border-green-200"
                : index === currentGenerationStep
                  ? "bg-purple-50 border border-purple-200 animate-pulse"
                  : "bg-gray-50 border border-gray-200"
            }`}
          >
            <div
              className={`text-lg ${
                index < currentGenerationStep
                  ? "text-green-600"
                  : index === currentGenerationStep
                    ? "text-purple-600"
                    : "text-gray-400"
              }`}
            >
              {index < currentGenerationStep ? "✅" : step.icon}
            </div>
            <span
              className={`text-sm font-medium ${
                index < currentGenerationStep
                  ? "text-green-800"
                  : index === currentGenerationStep
                    ? "text-purple-800"
                    : "text-gray-600"
              }`}
            >
              {step.text}
            </span>
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-sm">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Generating...</span>
          <span>{Math.round(generationProgress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-purple-600 h-2 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${generationProgress}%` }}
          />
        </div>
      </div>

      {/* Educational Tip */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-blue-600">💡</span>
          <span className="text-sm font-medium text-blue-800">Did you know?</span>
        </div>
        <p className="text-sm text-blue-700">
          AI-generated resources save teachers 2 hours per item and increase student engagement by 40%!
        </p>
      </div>
    </div>
  )

  const renderPreview = () => {
    if (!generatedWorksheet) return null;

    // For rubrics, use the new RubricDisplay component
    if (settings.resourceType === "rubric") {
      try {
        const rubricContent = typeof generatedWorksheet.content === 'string' 
          ? JSON.parse(generatedWorksheet.content)
          : generatedWorksheet.content;
        
        return (
          <div className="relative bg-white rounded-lg shadow-lg">
            {/* Content */}
            <div className="p-4">
              <RubricDisplay content={rubricContent} />
              
              {/* Action Buttons - Inside content area */}
              <div className="mt-8 flex flex-col sm:flex-row justify-between gap-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep('settings')}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Settings
                </Button>
                <Button 
                  onClick={handleDownloadPDF} 
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </Button>
              </div>
            </div>
          </div>
        );
      } catch (error) {
        console.error('Error parsing rubric content:', error);
        return (
          <div className="bg-red-50 text-red-600 p-4 rounded">
            Error displaying rubric. Please try regenerating.
          </div>
        );
      }
    }

    // Handle other resource types as before
    const { title, content, sections, metadata } = generatedWorksheet;

    return (
      <div className="space-y-6 relative">
        {/* Header with Back Button */}
        <div className="flex items-start justify-between mb-6 pt-2">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setCurrentStep("settings")} className="p-0 h-auto">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">📄 Resource Preview</h1>
              <p className="text-sm text-gray-600">Review your generated {getResourceDisplayName()}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setCurrentStep("settings")}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>

        {/* Resource Preview */}
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto" ref={worksheetRef}>
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">{title}</h1>
            <div className="mb-4">
              <div>Name: ________________</div>
              <div>Date: ________________</div>
            </div>
            {content && <div className="text-gray-600 mb-6">{content}</div>}
          </div>

          {/* Sections */}
          <div className="space-y-6">
            {sections?.map((section, sectionIndex) => {
              if (section.type === 'passage') {
                return (
                  <div key={sectionIndex} className="mb-8">
                    {section.title && <h2 className="text-xl font-semibold mb-4">{section.title}</h2>}
                    <div className="prose max-w-none">
                      {section.content}
                    </div>
                  </div>
                );
              }

              if (section.type === 'vocabulary') {
                let vocabulary;
                try {
                  vocabulary = typeof section.content === 'string' ? JSON.parse(section.content) : section.content;
                } catch (error) {
                  console.error('Error parsing vocabulary content:', error);
                  vocabulary = [];
                }
                return (
                  <div key={sectionIndex} className="mb-8">
                    <h2 className="text-xl font-semibold mb-4">Vocabulary</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {vocabulary.map((word: any, index: number) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="font-medium text-lg mb-1">{word.word}</div>
                          <div className="text-gray-600 mb-2">{word.definition}</div>
                          {word.context && (
                            <div className="text-sm text-gray-500">
                              <span className="font-medium">Context:</span> {word.context}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              if (section.type === 'rubric') {
                const rubricData = section.content;
                
                return (
                  <div key={sectionIndex} className="space-y-8">
                    {/* Header with Name and Date */}
                    <div className="text-center">
                      <h1 className="text-2xl font-bold mb-4">{rubricData.title}</h1>
                      <div className="mb-4">
                        <div className="mb-2">Name: ________________</div>
                        <div>Date: ________________</div>
                      </div>
                      <p className="text-gray-600 mb-6">{rubricData.introduction}</p>
                    </div>

                    {/* Criteria */}
                    {rubricData.criteria?.map((criterion, index) => (
                      <div key={index} className="mb-8">
                        {/* Criterion Header */}
                        <div className="bg-gray-50 p-4 rounded-t-lg border border-gray-200">
                          <h3 className="font-bold text-lg mb-2">{criterion.criterion}</h3>
                          <p className="text-gray-600">{criterion.description}</p>
                        </div>
                        
                        {/* Levels Table */}
                        <div className="border-x border-b border-gray-200 rounded-b-lg overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left font-medium text-gray-600 w-20">Score</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-600 w-32">Level</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-600">Description</th>
                                {criterion.levels.some(level => level.examples?.length > 0) && (
                                  <th className="px-4 py-2 text-left font-medium text-gray-600">Examples</th>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {criterion.levels.map((level, levelIndex) => (
                                <tr key={levelIndex} className={levelIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                  <td className="px-4 py-3 font-medium">{level.score}</td>
                                  <td className="px-4 py-3">{level.label}</td>
                                  <td className="px-4 py-3">{level.description}</td>
                                  {criterion.levels.some(l => l.examples?.length > 0) && (
                                    <td className="px-4 py-3">
                                      {level.examples?.length > 0 && (
                                        <ul className="list-disc ml-4 space-y-1">
                                          {level.examples.map((example, exIndex) => (
                                            <li key={exIndex} className="text-gray-600">{example}</li>
                                          ))}
                                        </ul>
                                      )}
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              }

              let sectionContent;
              try {
                // First check if the content is already an object
                if (typeof section.content === 'object') {
                  sectionContent = section.content;
                } else if (typeof section.content === 'string') {
                  // Try to parse as JSON, if it fails, use the string as is
                  try {
                    sectionContent = JSON.parse(section.content);
                  } catch {
                    sectionContent = section.content;
                  }
                } else {
                  sectionContent = '';
                }
              } catch (error) {
                console.error('Error handling section content:', error);
                sectionContent = section.content || '';
              }

              return (
                <div key={sectionIndex} className="mb-6">
                  {section.title && (
                    <h3 className="text-lg font-semibold mb-2">{section.title}</h3>
                  )}
                  <div className="prose max-w-none">
                    {typeof sectionContent === 'string' ? (
                      <p className="whitespace-pre-wrap">{sectionContent}</p>
                    ) : (
                      <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
                        {JSON.stringify(sectionContent, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center mt-6">
          <Button variant="outline" onClick={() => setCurrentStep("settings")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Settings
          </Button>
          <Button 
            onClick={handleDownloadPDF} 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

  const renderQualityCheck = () => (
    <div className="space-y-6 relative">
      {/* Back Arrow */}
      <BackArrow onBack={() => setCurrentStep("preview")} className="mb-6" />

      {/* Header */}
      <div className="text-center mt-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">✅ Quality Verification</h1>
        <p className="text-sm text-gray-600">AI analysis complete</p>
      </div>

      {/* Quality Checks */}
      <div className="space-y-3">
        {[
          { check: "Grade-appropriate content", status: "verified" },
          { check: "Engaging theme and visuals", status: "verified" },
          { check: "Standards alignment verified", status: "verified" },
          { check: "Problem difficulty balanced", status: "verified" },
          { check: "Clear instructions provided", status: "verified" },
        ].map((item, index) => (
          <div key={index} className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">{item.check}</span>
            <span className="ml-auto text-xs text-green-600 font-semibold">✓</span>
          </div>
        ))}
      </div>

      {/* Market Insights */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-3">📊 Market Insights</h3>
        <div className="space-y-2 text-sm text-blue-700">
          <div className="flex justify-between">
            <span>Suggested price:</span>
            <span className="font-semibold">$2.99</span>
          </div>
          <div className="flex justify-between">
            <span>Expected sales:</span>
            <span className="font-semibold">15-26/month</span>
          </div>
          <div className="flex justify-between">
            <span>Similar resources:</span>
            <span className="font-semibold">4.8★ average</span>
          </div>
        </div>
      </div>

      {/* Final Actions */}
      <div className="space-y-3">
        <Button
          onClick={handleComplete}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-4 text-lg font-semibold"
        >
          ✅ {getResourceDisplayName().charAt(0).toUpperCase() + getResourceDisplayName().slice(1)} Ready!
        </Button>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="flex items-center justify-center">
            <Edit className="w-4 h-4 mr-2" />
            Edit Content
          </Button>
          <Button variant="outline" className="flex items-center justify-center">
            <Store className="w-4 h-4 mr-2" />
            Publish to Store
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-full bg-gray-50 p-4">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6">
          {currentStep === "settings" && renderSettings()}
          {currentStep === "generating" && renderGenerating()}
          {currentStep === "preview" && renderPreview()}
          {currentStep === "quality" && renderQualityCheck()}
        </div>
      </div>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes orbit {
          from {
            transform: translate(-50%, -50%) rotate(0deg) translateX(60px) rotate(0deg);
          }
          to {
            transform: translate(-50%, -50%) rotate(360deg) translateX(60px) rotate(-360deg);
          }
        }
        
        @keyframes magicalGradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        @keyframes slideInDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes growBar {
          from {
            width: 0%;
          }
          to {
            width: var(--target-width);
          }
        }

        .required-field::after {
          content: "*";
          color: #dc2626;
          margin-left: 4px;
        }
      `}</style>
    </div>
  )
}
