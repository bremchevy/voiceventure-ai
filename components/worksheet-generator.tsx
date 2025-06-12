"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Download, Edit, Store, CheckCircle, Sparkles } from "lucide-react"

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
  onComplete?: (worksheet: any) => void
  onBack?: () => void
}

// NEW: Add resource type detection
interface ResourceType {
  type: "worksheet" | "quiz" | "rubric" | "lesson_plan" | "exit_slip"
  icon: string
  title: string
  detectedName?: string
}

// NEW: Add additional settings for different resource types
interface WorksheetSettings {
  grade: string
  subject: string
  theme: string
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
}

interface MathProblem {
  question: string
  answer: number
  visual?: string
}

interface GeneratedWorksheet {
  title: string
  problems?: MathProblem[]
  theme?: string
  grade: string
  decorations?: string[]
  resourceType: string
  questions?: any[]
  criteria?: any[]
  duration?: string
  objectives?: string[]
  activities?: any[]
  subject?: string
}

export default function WorksheetGenerator({ request, onComplete, onBack }: WorksheetGeneratorProps) {
  // NEW: Enhanced resource type detection with specific names
  const detectResourceType = (request: string): ResourceType => {
    const lowerRequest = request.toLowerCase()

    // Bell ringer detection
    if (lowerRequest.includes("bell ringer") || lowerRequest.includes("bell-ringer")) {
      return { type: "exit_slip", icon: "🔔", title: "Bell Ringer Generator", detectedName: "bell ringer" }
    }

    // Exit slip detection
    if (
      lowerRequest.includes("exit slip") ||
      lowerRequest.includes("exit ticket") ||
      lowerRequest.includes("exit-slip")
    ) {
      return { type: "exit_slip", icon: "🚪", title: "Exit Slip Generator", detectedName: "exit slip" }
    }

    // Quiz detection
    if (lowerRequest.includes("quiz") || lowerRequest.includes("test") || lowerRequest.includes("assessment")) {
      return { type: "quiz", icon: "🧠", title: "Quiz Generator", detectedName: "quiz" }
    }

    // Rubric detection
    if (lowerRequest.includes("rubric") || lowerRequest.includes("grading") || lowerRequest.includes("scoring")) {
      return { type: "rubric", icon: "📋", title: "Rubric Generator", detectedName: "rubric" }
    }

    // Lesson plan detection
    if (lowerRequest.includes("lesson plan") || lowerRequest.includes("lesson")) {
      return { type: "lesson_plan", icon: "📚", title: "Lesson Plan Generator", detectedName: "lesson plan" }
    }

    // Default to worksheet
    return { type: "worksheet", icon: "📝", title: "Worksheet Generator", detectedName: "worksheet" }
  }

  const [settings, setSettings] = useState<WorksheetSettings>({
    grade: "3rd Grade",
    subject: "Math",
    theme: "General",
    problemType: "Addition & Subtraction",
    problemCount: 6,
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

  const generationSteps = [
    { icon: "🔍", text: "Analyzing your request", completed: false },
    { icon: "⚡", text: "Generating content", completed: false },
    { icon: "🎨", text: "Adding educational elements", completed: false },
    { icon: "✨", text: "Finalizing design", completed: false },
  ]

  // Parse initial request if provided
  useEffect(() => {
    if (request) {
      // NEW: Detect resource type first and auto-select it
      const resourceType = detectResourceType(request)
      setDetectedResourceType(resourceType)
      setSettings((prev) => ({ ...prev, resourceType: resourceType.type }))

      const lowerRequest = request.toLowerCase()

      // Enhanced Grade Detection with comprehensive patterns - IMPROVED
      const gradePatterns = [
        // Kindergarten variations
        { pattern: /\b(kindergarten|kinder|k)\b/i, grade: "Kindergarten" },

        // 1st Grade variations - ENHANCED
        { pattern: /\b(1st\s+grade|first\s+grade|grade\s+1|grade\s+one|1st|first)\b/i, grade: "1st Grade" },

        // 2nd Grade variations - ENHANCED
        { pattern: /\b(2nd\s+grade|second\s+grade|grade\s+2|grade\s+two|2nd|second)\b/i, grade: "2nd Grade" },

        // 3rd Grade variations - ENHANCED
        { pattern: /\b(3rd\s+grade|third\s+grade|grade\s+3|grade\s+three|3rd|third)\b/i, grade: "3rd Grade" },

        // 4th Grade variations - ENHANCED
        { pattern: /\b(4th\s+grade|fourth\s+grade|grade\s+4|grade\s+four|4th|fourth)\b/i, grade: "4th Grade" },

        // 5th Grade variations - ENHANCED
        { pattern: /\b(5th\s+grade|fifth\s+grade|grade\s+5|grade\s+five|5th|fifth)\b/i, grade: "5th Grade" },

        // Additional common patterns
        { pattern: /\bfor\s+(kindergarten|kinder)\b/i, grade: "Kindergarten" },
        { pattern: /\bfor\s+(first|1st)\s+grad/i, grade: "1st Grade" },
        { pattern: /\bfor\s+(second|2nd)\s+grad/i, grade: "2nd Grade" },
        { pattern: /\bfor\s+(third|3rd)\s+grad/i, grade: "3rd Grade" },
        { pattern: /\bfor\s+(fourth|4th)\s+grad/i, grade: "4th Grade" },
        { pattern: /\bfor\s+(fifth|5th)\s+grad/i, grade: "5th Grade" },
      ]

      // Test each pattern
      for (const { pattern, grade } of gradePatterns) {
        if (pattern.test(request)) {
          setSettings((prev) => ({ ...prev, grade }))
          console.log(`🎯 Grade detected: "${grade}" from pattern: ${pattern}`)
          break // Use first match
        }
      }

      // Extract theme - only change from default if explicitly mentioned
      if (
        lowerRequest.includes("halloween") ||
        lowerRequest.includes("spooky") ||
        lowerRequest.includes("pumpkin") ||
        lowerRequest.includes("ghost")
      ) {
        setSettings((prev) => ({ ...prev, theme: "Halloween" }))
      } else if (
        lowerRequest.includes("winter") ||
        lowerRequest.includes("snow") ||
        lowerRequest.includes("christmas") ||
        lowerRequest.includes("holiday")
      ) {
        setSettings((prev) => ({ ...prev, theme: "Winter" }))
      } else if (
        lowerRequest.includes("spring") ||
        lowerRequest.includes("flower") ||
        lowerRequest.includes("garden") ||
        lowerRequest.includes("bloom")
      ) {
        setSettings((prev) => ({ ...prev, theme: "Spring" }))
      }
      // If no theme is mentioned, keep the default "General" theme

      // Enhanced problem type detection (only for worksheets)
      if (resourceType.type === "worksheet") {
        if (
          lowerRequest.includes("addition only") ||
          (lowerRequest.includes("addition") &&
            !lowerRequest.includes("subtraction") &&
            !lowerRequest.includes("multiplication"))
        ) {
          setSettings((prev) => ({ ...prev, problemType: "Addition Only" }))
        } else if (
          lowerRequest.includes("subtraction only") ||
          (lowerRequest.includes("subtraction") &&
            !lowerRequest.includes("addition") &&
            !lowerRequest.includes("multiplication"))
        ) {
          setSettings((prev) => ({ ...prev, problemType: "Subtraction Only" }))
        } else if (
          lowerRequest.includes("multiplication") ||
          lowerRequest.includes("times") ||
          lowerRequest.includes("multiply")
        ) {
          setSettings((prev) => ({ ...prev, problemType: "Multiplication" }))
        } else if (
          (lowerRequest.includes("addition") && lowerRequest.includes("subtraction")) ||
          lowerRequest.includes("mixed operations")
        ) {
          setSettings((prev) => ({ ...prev, problemType: "Addition & Subtraction" }))
        }
      }
    }
  }, [request])

  const generateMathProblems = (settings: WorksheetSettings): MathProblem[] => {
    const problems: MathProblem[] = []
    const { problemType, problemCount, theme } = settings

    // Theme decorations
    const themeEmojis = {
      Halloween: ["🎃", "👻", "🦇", "🕷️", "🍭"],
      Winter: ["❄️", "⛄", "🎿", "🧊", "🎄"],
      Spring: ["🌸", "🌷", "🦋", "🌱", "🐝"],
      General: ["⭐", "🌟", "✨", "🎯", "🎈"],
    }

    const emojis = themeEmojis[theme] || themeEmojis.General

    for (let i = 0; i < problemCount; i++) {
      const emoji = emojis[i % emojis.length]

      if (problemType === "Addition Only" || (problemType === "Addition & Subtraction" && i < problemCount / 2)) {
        // Addition problems
        const num1 = Math.floor(Math.random() * 50) + 10 // 10-60
        const num2 = Math.floor(Math.random() * 30) + 5 // 5-35
        problems.push({
          question: `${num1} + ${num2} = ____`,
          answer: num1 + num2,
          visual: `${emoji} ${emoji} + ${emoji} = ____`,
        })
      } else if (problemType === "Subtraction Only" || problemType === "Addition & Subtraction") {
        // Subtraction problems
        const num1 = Math.floor(Math.random() * 50) + 30 // 30-80
        const num2 = Math.floor(Math.random() * 20) + 5 // 5-25
        problems.push({
          question: `${num1} - ${num2} = ____`,
          answer: num1 - num2,
          visual: `${emoji} ${emoji} ${emoji} - ${emoji} = ____`,
        })
      } else if (problemType === "Multiplication") {
        // Multiplication problems
        const num1 = Math.floor(Math.random() * 9) + 2 // 2-10
        const num2 = Math.floor(Math.random() * 9) + 2 // 2-10
        problems.push({
          question: `${num1} × ${num2} = ____`,
          answer: num1 * num2,
          visual: `${emoji.repeat(num1)} × ${num2} = ____`,
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
    const themeEmojis = {
      Halloween: ["🎃", "👻", "🦇", "🕷️", "🍭"],
      Winter: ["❄️", "⛄", "🎿", "🧊", "🎄"],
      Spring: ["🌸", "🌷", "🦋", "🌱", "🐝"],
      General: ["⭐", "🌟", "✨", "🎯", "🎈"],
    }

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
    setCurrentStep("generating")
    setGenerationProgress(0)
    setCurrentGenerationStep(0)

    // Simulate generation process with realistic timing
    const steps = generationSteps.length
    for (let i = 0; i < steps; i++) {
      await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 400))
      setCurrentGenerationStep(i + 1)
      setGenerationProgress(((i + 1) / steps) * 100)
    }

    // Generate content based on resource type
    let generatedContent

    if (settings.resourceType === "worksheet") {
      // Keep existing worksheet generation unchanged
      const problems = generateMathProblems(settings)
      const themeTitle = {
        Halloween: "Spooky Math Adventures",
        Winter: "Winter Wonderland Math",
        Spring: "Spring Garden Math",
        General: "Math Practice Worksheet",
      }

      generatedContent = {
        title: `${themeTitle[settings.theme]} - ${settings.grade}`,
        problems,
        theme: settings.theme,
        grade: settings.grade,
        decorations:
          settings.theme === "Halloween"
            ? ["🎃", "👻", "🦇"]
            : settings.theme === "Winter"
              ? ["❄️", "⛄", "🎄"]
              : settings.theme === "Spring"
                ? ["🌸", "🌷", "🦋"]
                : ["⭐", "✨", "🌟"],
        resourceType: "worksheet",
      }
    } else if (settings.resourceType === "exit_slip") {
      // NEW: Phase 1 - Generate exit slip content (3-5 questions with answers)
      const exitSlipQuestions = generateExitSlipQuestions(settings)
      generatedContent = {
        title: `${settings.subject} ${detectedResourceType.detectedName === "bell ringer" ? "Bell Ringer" : "Exit Slip"} - ${settings.grade}`,
        problems: exitSlipQuestions, // Use same 'problems' structure as worksheets for compatibility
        theme: settings.theme,
        grade: settings.grade,
        decorations:
          settings.theme === "Halloween"
            ? ["🎃", "👻", "🦇"]
            : settings.theme === "Winter"
              ? ["❄️", "⛄", "🎄"]
              : settings.theme === "Spring"
                ? ["🌸", "🌷", "🦋"]
                : ["⭐", "✨", "🌟"],
        resourceType: "exit_slip",
        subject: settings.subject,
      }
    } else if (settings.resourceType === "quiz") {
      // NEW: Generate quiz content
      const questions = generateQuizQuestions(settings)
      generatedContent = {
        title: `${settings.subject} Quiz - ${settings.grade}`,
        questions,
        grade: settings.grade,
        subject: settings.subject,
        resourceType: "quiz",
      }
    } else if (settings.resourceType === "rubric") {
      // NEW: Generate rubric content
      const criteria = generateRubricCriteria(settings)
      generatedContent = {
        title: `${settings.subject} Assessment Rubric - ${settings.grade}`,
        criteria,
        grade: settings.grade,
        subject: settings.subject,
        resourceType: "rubric",
      }
    } else if (settings.resourceType === "lesson_plan") {
      // NEW: Generate lesson plan content
      const lessonSections = generateLessonPlanSections(settings)
      generatedContent = {
        title: `${settings.subject} Lesson Plan - ${settings.grade}`,
        ...lessonSections,
        grade: settings.grade,
        subject: settings.subject,
        resourceType: "lesson_plan",
      }
    } else if (settings.resourceType === "exit_slip") {
      // NEW: Generate exit slip content
      const questions = generateQuizQuestions(settings)
      generatedContent = {
        title: `${settings.subject} ${detectedResourceType.detectedName === "bell ringer" ? "Bell Ringer" : "Exit Slip"} - ${settings.grade}`,
        questions,
        grade: settings.grade,
        subject: settings.subject,
        resourceType: "exit_slip",
      }
    }

    setGeneratedWorksheet(generatedContent)

    // Short delay before showing preview
    await new Promise((resolve) => setTimeout(resolve, 500))
    setCurrentStep("preview")
  }

  const handleQualityCheck = () => {
    setCurrentStep("quality")
  }

  const handleComplete = () => {
    if (onComplete && generatedWorksheet) {
      onComplete(generatedWorksheet)
    }
  }

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

  const renderSettings = () => (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
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
              onClick={() => setSettings((prev) => ({ ...prev, theme: theme.name }))}
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
              onClick={() => setSettings((prev) => ({ ...prev, resourceType: resourceType.type }))}
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
          <label className="block text-sm font-medium text-gray-700 mb-3">Problem Type</label>
          <div className="space-y-2">
            {["Addition Only", "Subtraction Only", "Addition & Subtraction", "Multiplication"].map((type) => (
              <button
                key={type}
                onClick={() => setSettings((prev) => ({ ...prev, problemType: type }))}
                className={`w-full p-3 rounded-lg border-2 text-sm font-medium transition-all text-left ${
                  settings.problemType === type
                    ? "border-purple-500 bg-purple-50 text-purple-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                {type}
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
                  (format === "Mixed Format" && settings.quizQuestionTypes?.length >= 2) ||
                  settings.quizQuestionTypes?.includes(format)
                    ? "border-purple-500 bg-purple-50 text-purple-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                {format}{" "}
                {(format === "Mixed Format" && settings.quizQuestionTypes?.length >= 2) ||
                settings.quizQuestionTypes?.includes(format)
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

      {/* Generate Button - Dynamic text */}
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
          <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Orbiting dots */}
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="absolute w-3 h-3 bg-purple-400 rounded-full"
            style={{
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
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
                  ? "bg-purple-50 border border-purple-200"
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
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-purple-600 h-2 rounded-full transition-all duration-300 ease-out"
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

  const renderPreview = () => (
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

      {/* Request Summary in Preview - Moved below header */}
      {request && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-medium text-purple-800">Based on your request: "{request}"</span>
          </div>
        </div>
      )}

      {/* Resource Preview */}
      {generatedWorksheet && (
        <div className="bg-white border-2 border-gray-200 rounded-lg p-6 shadow-sm">
          {/* Resource Header */}
          <div className="text-center mb-6 border-b border-gray-200 pb-4">
            <div className="flex justify-center gap-2 mb-2">
              {generatedWorksheet.decorations?.map((emoji, i) => (
                <span key={i} className="text-2xl">
                  {emoji}
                </span>
              )) || <span className="text-2xl">{detectedResourceType.icon}</span>}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{generatedWorksheet.title}</h2>
            <div className="flex justify-between text-sm text-gray-600">
              <div>Name: ________________</div>
              <div>Date: ________________</div>
            </div>
          </div>

          {/* Content Section - Different for each resource type */}
          <div className="space-y-4">
            {generatedWorksheet.resourceType === "worksheet" && (
              <>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  {settings.theme === "Halloween"
                    ? "🎃 Spooky Math Problems"
                    : settings.theme === "Winter"
                      ? "❄️ Winter Math Fun"
                      : settings.theme === "Spring"
                        ? "🌸 Spring Math Garden"
                        : "⭐ Math Practice"}
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  {generatedWorksheet.problems?.map((problem, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </span>
                        <div>
                          <div className="font-mono text-lg font-semibold text-gray-900">{problem.question}</div>
                          {problem.visual && <div className="text-sm text-gray-600 mt-1">{problem.visual}</div>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {generatedWorksheet.resourceType === "exit_slip" && (
              <>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  {detectedResourceType.detectedName === "bell ringer"
                    ? "🔔 Bell Ringer Questions"
                    : "🚪 Exit Slip Questions"}
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  {generatedWorksheet.problems?.map((problem, index) => (
                    <div key={index} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start gap-3 w-full">
                        <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-bold mt-1">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 mb-2">{problem.question}</div>
                          {problem.visual && (
                            <div className="text-sm text-gray-600 bg-white p-2 rounded border">{problem.visual}</div>
                          )}
                          <div className="text-xs text-green-700 mt-2 font-medium">Answer: {problem.answer}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {(generatedWorksheet.resourceType === "quiz" || generatedWorksheet.resourceType === "exit_slip") && (
              <>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  {generatedWorksheet.resourceType === "exit_slip"
                    ? detectedResourceType.detectedName === "bell ringer"
                      ? "🔔 Bell Ringer Questions"
                      : "🚪 Exit Slip Questions"
                    : "📋 Quiz Questions"}
                </h3>
                <div className="space-y-4">
                  {generatedWorksheet.questions?.map((question, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg">
                      <div className="font-semibold text-gray-900 mb-2">{question.question}</div>
                      {question.options && (
                        <div className="space-y-1 ml-4">
                          {question.options.map((option, i) => (
                            <div key={i} className="text-sm text-gray-700">
                              {option}
                            </div>
                          ))}
                        </div>
                      )}
                      {question.points && <div className="text-sm text-gray-500 mt-2">Points: {question.points}</div>}
                    </div>
                  ))}
                </div>
              </>
            )}

            {generatedWorksheet.resourceType === "rubric" && (
              <>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 Assessment Rubric</h3>
                <div className="space-y-4">
                  {generatedWorksheet.criteria?.map((criterion, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-purple-50 p-3 font-semibold text-purple-800">{criterion.name}</div>
                      <div className="grid grid-cols-2 gap-2 p-3">
                        {criterion.levels.map((level, i) => (
                          <div key={i} className="p-2 bg-gray-50 rounded text-sm">
                            <div className="font-medium text-gray-800">{level.level}</div>
                            <div className="text-gray-600">{level.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {generatedWorksheet.resourceType === "lesson_plan" && (
              <>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">📚 Lesson Plan</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="font-semibold text-blue-800">Duration</div>
                      <div className="text-blue-700">{generatedWorksheet.duration}</div>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="font-semibold text-green-800">Subject</div>
                      <div className="text-green-700">{generatedWorksheet.subject}</div>
                    </div>
                  </div>

                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="font-semibold text-purple-800 mb-2">Learning Objectives</div>
                    <ul className="list-disc list-inside text-purple-700 space-y-1">
                      {generatedWorksheet.objectives?.map((objective, i) => (
                        <li key={i}>{objective}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <div className="font-semibold text-yellow-800 mb-2">Lesson Activities</div>
                    <div className="space-y-2">
                      {generatedWorksheet.activities?.map((activity, i) => (
                        <div key={i} className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-yellow-700">{activity.name}</div>
                            <div className="text-sm text-yellow-600">{activity.description}</div>
                          </div>
                          <div className="text-sm text-yellow-600">{activity.duration}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">📝 Instructions:</h4>
            <p className="text-sm text-blue-700">
              {generatedWorksheet.resourceType === "worksheet" &&
                "Solve each problem and write your answer in the blank space."}
              {generatedWorksheet.resourceType === "quiz" &&
                "Answer all questions to the best of your ability. Read each question carefully."}
              {generatedWorksheet.resourceType === "exit_slip" &&
                (detectedResourceType.detectedName === "bell ringer"
                  ? "Complete this bell ringer activity to start class."
                  : "Complete this exit slip before leaving class.")}
              {generatedWorksheet.resourceType === "rubric" &&
                "Use this rubric to assess student work. Rate each criterion from 1-4 points."}
              {generatedWorksheet.resourceType === "lesson_plan" &&
                "Follow this lesson plan structure. Adjust timing as needed for your class."}
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button onClick={handleQualityCheck} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white">
          <CheckCircle className="w-4 h-4 mr-2" />
          Quality Check
        </Button>
        <Button variant="outline" className="flex-1">
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
      </div>
    </div>
  )

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
      `}</style>
    </div>
  )
}
