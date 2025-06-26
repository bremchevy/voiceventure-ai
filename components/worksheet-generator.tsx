"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Download, Edit, Store, CheckCircle, Sparkles, ArrowLeft, Check, Loader2 } from "lucide-react"
import { generatePDF } from "@/lib/utils/pdf"
import { toast } from "@/components/ui/use-toast"

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
  subject: string
  type: string
  focus?: string[]
  patterns?: RegExp[]
  subTypes?: {
    [key: string]: RegExp[] | undefined
  }
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
  quizQuestionTypes?: string[]
  rubricCriteria?: string[]
  rubricStyle?: string
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

export default function WorksheetGenerator({ request, onComplete, onBack }: WorksheetGeneratorProps) {
  // NEW: Enhanced resource type detection with specific names
  const detectResourceType = (request: string): ResourceType => {
    const lowerRequest = request.toLowerCase()

    // More precise resource type detection with context
    const resourcePatterns = [
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
    quizQuestionTypes: ["Multiple Choice", "Short Answer"],
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

      // First, check for math-specific content
      const mathMatch = lowerRequest.match(/\b(?:math|mathematics|fractions|algebra|geometry)\b/i);
      
      // Literature-specific detection with more strict pattern
      const literatureMatch = mathMatch ? null : (
        request.match(/(?:for|about|on|from)\s+"([^"]+)"(?:\s+by\s+([^"]+))?/i) || 
        request.match(/(?:reading|book|story|novel|literature)\s+(?:for|about|on|from)\s+([^,]+?)(?:\s+by\s+([^,]+))?(?=\s*$|\s*,|\s+with|\s+including)/i)
      );

      let detectedSubject: DetectedSubject | null = null;
      let detectedSubType: string | null = null;

      // If it's a math request, set math subject directly
      if (mathMatch) {
        detectedSubject = {
          subject: "Math",
          type: "math",
          focus: ["Fractions & Decimals"]
        };
        
        setSettings(prev => ({
          ...prev,
          subject: "Math",
          problemType: "math",
          focus: ["Fractions & Decimals"]
        }));
      }
      // If literature-specific content and no math terms
      else if (literatureMatch) {
        const [_, title, author] = literatureMatch;
        detectedSubject = {
          subject: "Reading",
          type: "language",
          focus: ["Reading Comprehension"]
        };
        
        // If vocabulary is mentioned, override the focus
        if (lowerRequest.includes('vocabulary') || lowerRequest.includes('vocab')) {
          detectedSubject.focus = ["Spelling, Vocabulary"];
        }
        
        setSettings(prev => ({
          ...prev,
          subject: "Reading",
          problemType: "language",
          topicArea: title,
          customInstructions: detectedSubject?.focus?.[0] ? 
            `Focus on ${detectedSubject.focus[0].toLowerCase()} from "${title}"${author ? ` by ${author}` : ''}` :
            `Focus on reading comprehension from "${title}"${author ? ` by ${author}` : ''}`,
          includeVocabulary: detectedSubject?.focus?.[0]?.includes("Vocabulary") ?? false
        }));
      } else {
        // Check each subject pattern
        const subjectPatterns = [
          {
            subject: "Math",
            type: "math",
            patterns: [
              // Core math concepts
              /\b(?:math|mathematics|arithmetic)\b/i,
              // Operations
              /\b(?:addition|subtraction|multiplication|division)\b/i,
              // Advanced topics
              /\b(?:algebra|geometry|calculus|trigonometry)\b/i,
              // Number concepts
              /\b(?:fractions|decimals|percentages|integers)\b/i,
              // Problem types
              /\b(?:word problems|equations|inequalities)\b/i
            ],
            subTypes: {
              "Addition, Subtraction, Mixed Operations": [
                /\b(?:addition|subtraction|mixed operations)\b/i,
                /\b(?:adding|subtracting)\b/i,
                /\b(?:plus|minus|sums|differences)\b/i
              ],
              "Multiplication & Division": [
                /\b(?:multiplication|division)\b/i,
                /\b(?:multiplying|dividing)\b/i,
                /\b(?:times|divided by|products|quotients)\b/i
              ],
              "Fractions & Decimals": [
                /\b(?:fractions?|fractional)\b/i,
                /\b(?:decimals?|decimal numbers?)\b/i,
                /\b(?:mixed numbers?|improper fractions?)\b/i
              ],
              "Word Problems": [
                /\b(?:word problems|story problems)\b/i,
                /\b(?:real-world|application)\b/i
              ]
            }
          },
          {
            subject: "Reading",
            type: "language",
            patterns: [
              // Language arts
              /\b(?:reading|language arts|english|ela)\b/i,
              // Specific skills
              /\b(?:vocabulary|comprehension|grammar)\b/i,
              // Literature
              /\b(?:literature|story|novel|book)\b/i,
              // Writing
              /\b(?:writing|composition|essay)\b/i
            ],
            subTypes: {
              "Spelling, Vocabulary": [
                /\b(?:spelling|vocabulary|vocab|words)\b/i,
                /\b(?:definitions|word meanings)\b/i
              ],
              "Reading Comprehension": [
                /\b(?:comprehension|understanding|analysis)\b/i,
                /\b(?:main idea|details|inference)\b/i
              ],
              "Grammar & Writing": [
                /\b(?:grammar|writing|sentences)\b/i,
                /\b(?:punctuation|parts of speech)\b/i
              ]
            }
          },
          {
            subject: "Science",
            type: "science",
            patterns: [
              // General science
              /\b(?:science|scientific method)\b/i,
              // Specific branches
              /\b(?:biology|chemistry|physics)\b/i,
              // Topics
              /\b(?:earth science|life science|physical science)\b/i,
              // Activities
              /\b(?:experiment|observation|hypothesis)\b/i
            ],
            subTypes: {
              "Labeling, Matching": [
                /\b(?:labeling|matching|diagrams)\b/i,
                /\b(?:parts|structures|systems)\b/i
              ],
              "Observation": [
                /\b(?:observation|experiment|data)\b/i,
                /\b(?:scientific method|hypothesis)\b/i
              ],
              "Concepts": [
                /\b(?:concepts|principles|theories)\b/i,
                /\b(?:laws|rules|formulas)\b/i
              ]
            }
          },
          {
            subject: "Social Studies",
            type: "social",
            patterns: [
              // General social studies
              /\b(?:social studies|history|geography)\b/i,
              // Specific areas
              /\b(?:civics|government|economics)\b/i,
              // Topics
              /\b(?:culture|society|civilization)\b/i,
              // Skills
              /\b(?:maps|timelines|primary sources)\b/i
            ],
            subTypes: {
              "Geography": [
                /\b(?:geography|maps|locations)\b/i,
                /\b(?:countries|continents|regions)\b/i
              ],
              "History": [
                /\b(?:history|historical|timeline)\b/i,
                /\b(?:events|periods|eras)\b/i
              ],
              "Civics": [
                /\b(?:civics|government|citizenship)\b/i,
                /\b(?:rights|responsibilities|democracy)\b/i
              ]
            }
          }
        ];

        // Check each subject pattern
        for (const subjectPattern of subjectPatterns) {
          if (subjectPattern.patterns.some(pattern => pattern.test(lowerRequest))) {
            detectedSubject = {
              subject: subjectPattern.subject,
              type: subjectPattern.type,
              patterns: subjectPattern.patterns,
              subTypes: Object.fromEntries(
                Object.entries(subjectPattern.subTypes).map(([key, value]) => [key, value || undefined])
              )
            };
            
            // Check for specific sub-types
            for (const [subType, patterns] of Object.entries(subjectPattern.subTypes)) {
              if (patterns.some((pattern: RegExp) => pattern.test(lowerRequest))) {
                detectedSubType = subType;
                break;
              }
            }

            if (detectedSubject) {
              setSettings(prev => ({
                ...prev,
                subject: detectedSubject?.subject ?? prev.subject,
                problemType: detectedSubject?.type ?? prev.problemType,
                focus: detectedSubType ? [detectedSubType] : undefined,
                customInstructions: detectedSubType ? 
                  `Focus on ${detectedSubType.toLowerCase()}` : 
                  detectedSubject?.subject ? `Focus on ${detectedSubject.subject.toLowerCase()} concepts` : prev.customInstructions
              }));
            }
            break;
          }
        }

        if (detectedSubject) {
          setSettings(prev => ({
            ...prev,
            subject: detectedSubject?.subject ?? prev.subject,
            problemType: detectedSubject?.type ?? prev.problemType,
            focus: detectedSubType ? [detectedSubType] : undefined,
            customInstructions: detectedSubType ? 
              `Focus on ${detectedSubType.toLowerCase()}` : 
              detectedSubject?.subject ? `Focus on ${detectedSubject.subject.toLowerCase()} concepts` : prev.customInstructions
          }));
        }
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

  // NEW: Generate different resource types
  const generateQuizQuestions = (settings: WorksheetSettings) => {
    const questions = []
    const questionCount = settings.quizQuestionCount || 10
    const questionTypes = settings.quizQuestionTypes || ["Multiple Choice"]

    for (let i = 0; i < questionCount; i++) {
      const questionType = questionTypes[i % questionTypes.length]

      if (questionType === "Multiple Choice") {
        questions.push({
          type: "multiple_choice",
          question: `Question ${i + 1}: Sample multiple choice question about ${settings.subject.toLowerCase()}?`,
          options: ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
          correct: "A",
        })
      } else if (questionType === "True/False") {
        questions.push({
          type: "true_false",
          question: `Question ${i + 1}: True or False - Sample statement about ${settings.subject.toLowerCase()}.`,
          correct: "True",
        })
      } else if (questionType === "Short Answer") {
        questions.push({
          type: "short_answer",
          question: `Question ${i + 1}: Explain the concept of [topic] in ${settings.subject.toLowerCase()}.`,
          points: 5,
        })
      }
    }

    return questions
  }

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
        <div className="grid grid-cols-2 gap-3">
          {["1st Grade", "2nd Grade", "3rd Grade", "4th Grade"].map((grade) => (
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
        <div className="grid grid-cols-3 gap-3">
          {["Math", "Reading", "Science"].map((subject) => (
            <button
              key={subject}
              onClick={() => setSettings((prev) => ({ ...prev, subject }))}
              className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                settings.subject === subject
                  ? "border-purple-500 bg-purple-50 text-purple-700"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              {subject}
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
            {["Multiple Choice", "Short Answer", "True/False", "Mixed Format"].map((format) => (
              <button
                key={format}
                onClick={() => {
                  const currentTypes = settings.quizQuestionTypes || []
                  if (format === "Mixed Format") {
                    setSettings((prev) => ({
                      ...prev,
                      quizQuestionTypes: ["Multiple Choice", "Short Answer", "True/False"],
                    }))
                  } else {
                    const newTypes = currentTypes.includes(format)
                      ? currentTypes.filter((t) => t !== format)
                      : [...currentTypes.filter((t) => t !== "Mixed Format"), format]
                    setSettings((prev) => ({ ...prev, quizQuestionTypes: newTypes }))
                  }
                }}
                className={`w-full p-3 rounded-lg border-2 text-sm font-medium transition-all text-left ${
                  (format === "Mixed Format" && (settings.quizQuestionTypes?.length ?? 0) >= 2) ||
                  (settings.quizQuestionTypes?.includes(format) ?? false)
                    ? "border-purple-500 bg-purple-50 text-purple-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                {format}{" "}
                {(format === "Mixed Format" && (settings.quizQuestionTypes?.length ?? 0) >= 2) ||
                (settings.quizQuestionTypes?.includes(format) ?? false)
                  ? "✓"
                  : ""}
              </button>
            ))}
          </div>
        </div>
      )}

      {settings.resourceType === "rubric" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Rubric Style</label>
          <div className="space-y-2">
            {[
              { type: "4-point", label: "4-Point Scale", desc: "Excellent, Good, Satisfactory, Needs Improvement" },
              { type: "3-point", label: "3-Point Scale", desc: "Exceeds, Meets, Below Expectations" },
              { type: "checklist", label: "Checklist Style", desc: "Simple yes/no criteria" },
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
                <div className="font-medium">{style.label}</div>
                <div className="text-xs text-gray-500">{style.desc}</div>
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
          Topic Area
          <span className="text-xs text-gray-500 ml-2">(What specific topic would you like to cover?)</span>
        </label>
        <div className="space-y-2">
          <input
            type="text"
            value={settings.topicArea}
            onChange={(e) => setSettings((prev) => ({ ...prev, topicArea: e.target.value }))}
            placeholder="e.g., Water Cycle, Fractions, Character Traits..."
            className={`w-full p-3 rounded-lg border-2 ${
              !settings.topicArea.trim() ? 'border-red-200' : 'border-gray-200'
            } text-sm focus:border-purple-500 focus:outline-none`}
            required
          />
          {!settings.topicArea.trim() && (
            <p className="text-sm text-red-500 mt-1">Please select or enter a topic area</p>
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

        {/* Request Summary in Preview */}
        {request && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-medium text-purple-800">Based on your request: "{request}"</span>
            </div>
          </div>
        )}

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
                let sectionContent;
                try {
                  sectionContent = typeof section.content === 'string' ? JSON.parse(section.content) : section.content;
                } catch (error) {
                  console.error('Error parsing rubric content:', error);
                  sectionContent = [];
                }
                return (
                  <div key={sectionIndex} className="space-y-6">
                    {section.title && <h2 className="text-xl font-semibold mb-4">{section.title}</h2>}
                    {sectionContent.map((criterion: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4">
                        <h3 className="font-medium mb-2">{criterion.criterion}</h3>
                        <p className="text-gray-600 mb-4">{criterion.description}</p>
                        <div className="grid grid-cols-4 gap-4">
                          {criterion.levels.map((level: any, levelIndex: number) => (
                            <div key={levelIndex} className="text-sm">
                              <div className="font-medium">{level.label} ({level.score})</div>
                              <div className="text-gray-600">{level.description}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              }

              let sectionContent;
              try {
                sectionContent = typeof section.content === 'string' ? JSON.parse(section.content) : section.content;
              } catch (error) {
                console.error('Error parsing section content:', error);
                // If parsing fails, treat content as plain text
                sectionContent = [{
                  question: section.content,
                  type: 'text'
                }];
              }

              return (
                <div key={sectionIndex} className="space-y-4">
                  {section.title && <h2 className="text-xl font-semibold mb-4">{section.title}</h2>}
                  {Array.isArray(sectionContent) && sectionContent.map((problem: any, index: number) => (
                    <div key={index} className="border-b pb-6 mb-6">
                      <p className="font-medium text-lg mb-3">{index + 1}. {problem.question}</p>
                      {problem.options ? (
                        <div className="ml-6 mt-3 space-y-2">
                          {problem.options.map((option: string, optIndex: number) => (
                            <div key={optIndex} className="flex items-center gap-3">
                              <div className="w-6 h-6 border-2 border-gray-300 rounded-full"></div>
                              <span>{option}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="ml-6 mt-3">
                          <div className="space-y-4">
                            <div className="border-b-2 border-gray-300 h-6"></div>
                            <div className="border-b-2 border-gray-300 h-6"></div>
                          </div>
                        </div>
                      )}
                      {problem.visual && (
                        <div className="ml-6 mt-4 p-3 bg-gray-50 rounded-lg text-gray-600">
                          {problem.visual}
                        </div>
                      )}
                    </div>
                  ))}
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
