"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Mic,
  MicOff,
  Sparkles,
  Store,
  User,
  Home,
  FileText,
  ShoppingCart,
  Users,
  ClipboardList,
  Star,
  CheckCircle,
  ChevronRight,
} from "lucide-react"
import AIAssistant from "@/components/ai-assistant"
import SubstituteBookingSystem from "@/components/substitute-booking-system"
import WorksheetGenerator from "@/components/worksheet-generator"
import { ProfileView } from '@/components/profile/profile-view'

interface CreationStatus {
  isActive: boolean
  message: string
  progress: number
}

interface VoiceResponse {
  text: string
  actions: Array<{
    label: string
    onClick: () => void
  }>
}

// Add this interface to extend the Window type
declare global {
  interface Window {
    worksheetTimer: number | null
  }
}

export default function VoiceVentureAI() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [detectedInfo, setDetectedInfo] = useState<{ grade?: string; subject?: string; theme?: string }>({})
  const recognitionRef = useRef<any>(null)
  const [activeTab, setActiveTab] = useState<"home" | "marketplace" | "profile">("home")
  const [contextHint, setContextHint] = useState("Try: 'Create a math worksheet for 3rd grade about dinosaurs'")
  const [successNotification, setSuccessNotification] = useState<string | null>(null)
  const [voiceResponse, setVoiceResponse] = useState<VoiceResponse | null>(null)
  const [creationStatus, setCreationStatus] = useState<CreationStatus>({
    isActive: false,
    message: "",
    progress: 0,
  })
  const [showAssistant, setShowAssistant] = useState(true)
  const [assistantMessage, setAssistantMessage] = useState<string | null>(null)

  // Add these state variables after the existing useState declarations
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState("default")
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true)
  const [showPWAMenu, setShowPWAMenu] = useState(false)
  const [offlineContent, setOfflineContent] = useState([])
  const [currentView, setCurrentView] = useState<"main" | "substitute">("main")
  const [showWorksheetGenerator, setShowWorksheetGenerator] = useState(false)
  const [worksheetRequest, setWorksheetRequest] = useState("")
  const [showResult, setShowResult] = useState(false)

  // NEW: Add state for rotating examples
  const [currentExampleIndex, setCurrentExampleIndex] = useState(0)

  // NEW: Define rotating example prompts
  const examplePrompts = [
    // Worksheets
    "Create a math worksheet for 3rd grade about dinosaurs",
    "Make a reading worksheet on character traits for 2nd grade",
    "Generate a science worksheet about the water cycle for 4th grade",
    "Create a spelling worksheet with Halloween words for 1st grade",

    // Quizzes
    "Make a quiz on the causes of the Civil War",
    "Create a math quiz on fractions for 5th grade",
    "Generate a science quiz about the solar system",
    "Make a vocabulary quiz for Romeo and Juliet",

    // Bell Ringers
    "Generate a bell ringer for 5th grade fractions",
    "Create a warm-up activity for 3rd grade multiplication",
    "Make a daily starter for 6th grade science",
    "Generate an opening activity for American history",

    // Choice Boards
    "Create a choice board on the American Revolution",
    "Make a choice board for 4th grade math review",
    "Generate activity options for reading comprehension",
    "Create a project choice board for ecosystems",

    // Lesson Plans
    "Create a lesson plan on photosynthesis for 7th grade",
    "Make a reading lesson about main idea for 3rd grade",
    "Generate a math lesson on area and perimeter",
    "Create a history lesson on the Great Depression",

    // Rubrics
    "Create a rubric for persuasive writing essays",
    "Make a grading rubric for science fair projects",
    "Generate a rubric for group presentations",
    "Create an assessment rubric for math problem solving",

    // Sub Plans
    "Create substitute plans for 4th grade for tomorrow",
    "Make emergency sub plans for middle school English",
    "Generate sub activities for elementary art class",
    "Create backup plans for high school history",
  ]

  // NEW: Rotate examples every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentExampleIndex((prev) => (prev + 1) % examplePrompts.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  // Initialize the timer property
  if (typeof window !== "undefined") {
    window.worksheetTimer = null
  }

  useEffect(() => {
    console.log("🔧 Setting up speech recognition useEffect")

    if (typeof window !== "undefined") {
      console.log("🌐 Window is available")

      // Check for browser support of Web Speech API
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      console.log("🔍 SpeechRecognition constructor:", SpeechRecognition)

      if (SpeechRecognition) {
        console.log("✅ Creating new SpeechRecognition instance")
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = true
        recognitionRef.current.lang = "en-US"

        console.log("⚙️ Speech recognition configured:", {
          continuous: recognitionRef.current.continuous,
          interimResults: recognitionRef.current.interimResults,
          lang: recognitionRef.current.lang,
        })

        recognitionRef.current.onresult = (event) => {
          console.log("📝 Speech recognition result event:", event)
          let interimTranscript = ""
          let finalTranscript = ""

          for (let i = 0; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            console.log(`Result ${i}: "${transcript}" (final: ${event.results[i].isFinal})`)

            if (event.results[i].isFinal) {
              finalTranscript += transcript + " "
            } else {
              interimTranscript += transcript
            }
          }

          // Show the complete transcript (final + interim)
          const completeTranscript = finalTranscript + interimTranscript
          console.log("📋 Complete transcript:", completeTranscript)
          setTranscript(completeTranscript)

          // Analyze final results immediately when they come in
          if (finalTranscript) {
            console.log("🔍 Analyzing final transcript:", completeTranscript)
            analyzeTranscript(completeTranscript)
          }
        }

        recognitionRef.current.onstart = () => {
          console.log("🎤 Speech recognition started")
        }

        recognitionRef.current.onend = () => {
          console.log("🛑 Speech recognition ended")
          setIsListening(false)
          setContextHint("Try: 'Create a math worksheet for 3rd grade about dinosaurs'")
        }

        recognitionRef.current.onerror = (event) => {
          console.error("❌ Speech recognition error:", event.error, event)
          setIsListening(false)
          setContextHint("Try: 'Create a math worksheet for 3rd grade about dinosaurs'")

          switch (event.error) {
            case "not-allowed":
              console.log("🚫 Microphone access denied")
              alert(
                "Microphone access denied.\n\nTo fix this:\n1. Click the microphone icon in your browser's address bar\n2. Select 'Allow'\n3. Refresh the page and try again\n\nOr use the example prompts below instead.",
              )
              break
            case "no-speech":
              console.log("🔇 No speech detected")
              setContextHint("No speech detected. Try speaking louder or closer to the microphone.")
              break
            case "audio-capture":
              console.log("🎤 No microphone found")
              alert("No microphone found. Please connect a microphone and try again.")
              break
            case "network":
              console.log("🌐 Network error")
              alert("Network error. Please check your internet connection and try again.")
              break
            case "service-not-allowed":
              console.log("🚫 Service not allowed")
              alert("Speech recognition service not allowed. Please check your browser settings.")
              break
            default:
              console.log("❓ Unknown error:", event.error)
              setContextHint("Speech recognition error. Please try again or use the example prompts below.")
          }
        }

        console.log("✅ Speech recognition event handlers set up")
      } else {
        console.log("❌ SpeechRecognition not supported in this browser")
      }
    } else {
      console.log("❌ Window not available (server-side)")
    }
  }, [])

  // PWA Install Detection
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallPrompt(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    }
  }, [])

  // Online/Offline Detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setSuccessNotification("🌐 Back online! Syncing your content...")
      setTimeout(() => setSuccessNotification(null), 3000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setSuccessNotification("📱 Working offline. Your content will sync when connected.")
      setTimeout(() => setSuccessNotification(null), 3000)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // PWA Helper Functions
  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === "accepted") {
        setShowInstallPrompt(false)
        setSuccessNotification("📱 VoiceVenture AI installed! Access from your home screen.")
        setTimeout(() => setSuccessNotification(null), 3000)
      }
      setDeferredPrompt(null)
    }
  }

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
      if (permission === "granted") {
        setSuccessNotification("🔔 Notifications enabled! You'll get updates about substitutes and IEP reminders.")
        setTimeout(() => setSuccessNotification(null), 3000)
      }
    }
  }

  const sendPushNotification = (title, body) => {
    if (notificationPermission === "granted") {
      new Notification(title, {
        body: body,
        icon: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHJ4PSIxNiIgZmlsbD0iIzhCNUNGNiIvPjx0ZXh0IHg9IjMyIiB5PSI0MCIgZm9udC1mYW1pbHk9InN5c3RlbS11aSIgZm9udC1zaXplPSIyOCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiPuKasDwvdGV4dD48L3N2Zz4=",
        tag: "voiceventure-ai",
        requireInteraction: true,
      })
    }
  }

  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })
      setSuccessNotification("📷 Camera ready! Capture whiteboards or documents.")
      setTimeout(() => setSuccessNotification(null), 3000)

      setTimeout(() => {
        stream.getTracks().forEach((track) => track.stop())
      }, 30000)
    } catch (error) {
      setSuccessNotification("📷 Camera not available. You can still upload files manually.")
      setTimeout(() => setSuccessNotification(null), 3000)
    }
  }

  // NEW: Enhanced category detection function
  const detectResourceCategory = (text: string) => {
    const lowerText = text.toLowerCase()

    // Resource type patterns
    const categoryPatterns = [
      // Worksheets
      {
        pattern: /\b(worksheet|practice\s+sheet|activity\s+sheet|handout)\b/i,
        category: "worksheet",
        icon: "📝",
        description: "Practice worksheets and activity sheets",
      },

      // Quizzes & Tests
      {
        pattern: /\b(quiz|test|assessment|exam|evaluation)\b/i,
        category: "quiz",
        icon: "📋",
        description: "Quizzes, tests, and assessments",
      },

      // Bell Ringers & Warm-ups
      {
        pattern: /\b(bell\s+ringer|warm[\s-]?up|starter|opening\s+activity|daily\s+starter|entrance\s+ticket)\b/i,
        category: "bell_ringer",
        icon: "🔔",
        description: "Bell ringers and warm-up activities",
      },

      // Choice Boards
      {
        pattern: /\b(choice\s+board|activity\s+options|project\s+choices|learning\s+menu|tic[\s-]?tac[\s-]?toe)\b/i,
        category: "choice_board",
        icon: "🎯",
        description: "Choice boards and activity menus",
      },

      // Lesson Plans
      {
        pattern: /\b(lesson\s+plan|lesson|unit\s+plan|teaching\s+plan)\b/i,
        category: "lesson_plan",
        icon: "📚",
        description: "Comprehensive lesson plans",
      },

      // Rubrics
      {
        pattern: /\b(rubric|grading\s+guide|assessment\s+criteria|scoring\s+guide)\b/i,
        category: "rubric",
        icon: "📊",
        description: "Grading rubrics and assessment guides",
      },

      // Sub Plans
      {
        pattern: /\b(sub\s+plan|substitute\s+plan|emergency\s+plan|backup\s+plan|sub\s+activities)\b/i,
        category: "sub_plan",
        icon: "👩‍🏫",
        description: "Substitute teacher plans and activities",
      },

      // Exit Tickets
      {
        pattern: /\b(exit\s+ticket|exit\s+slip|closure\s+activity|wrap[\s-]?up)\b/i,
        category: "exit_ticket",
        icon: "🎫",
        description: "Exit tickets and closure activities",
      },
    ]

    // Find matching category
    for (const { pattern, category, icon, description } of categoryPatterns) {
      if (pattern.test(text)) {
        console.log(`🎯 Resource category detected: "${category}" from pattern: ${pattern}`)
        return { category, icon, description }
      }
    }

    // Default to worksheet if no specific category detected
    return {
      category: "worksheet",
      icon: "📝",
      description: "Educational worksheet",
    }
  }

  const analyzeTranscript = (text: string) => {
    // Add safety check for undefined text
    if (!text || typeof text !== "string") {
      console.log("❌ Invalid text provided to analyzeTranscript:", text)
      return
    }

    const lowerText = text.toLowerCase()
    const info: { grade?: string; subject?: string; theme?: string } = {}

    // NEW: Detect resource category first
    const resourceInfo = detectResourceCategory(text)
    console.log("🔍 Detected resource type:", resourceInfo)

    // Enhanced Grade Detection with comprehensive patterns
    const gradePatterns = [
      // Kindergarten variations
      { pattern: /\b(kindergarten|kinder|k)\b/i, grade: "Kindergarten" },

      // 1st Grade variations
      { pattern: /\b(1st\s+grade|first\s+grade|grade\s+1|grade\s+one)\b/i, grade: "1st Grade" },

      // 2nd Grade variations
      { pattern: /\b(2nd\s+grade|second\s+grade|grade\s+2|grade\s+two)\b/i, grade: "2nd Grade" },

      // 3rd Grade variations
      { pattern: /\b(3rd\s+grade|third\s+grade|grade\s+3|grade\s+three)\b/i, grade: "3rd Grade" },

      // 4th Grade variations
      { pattern: /\b(4th\s+grade|fourth\s+grade|grade\s+4|grade\s+four)\b/i, grade: "4th Grade" },

      // 5th Grade variations
      { pattern: /\b(5th\s+grade|fifth\s+grade|grade\s+5|grade\s+five)\b/i, grade: "5th Grade" },

      // 6th Grade variations
      { pattern: /\b(6th\s+grade|sixth\s+grade|grade\s+6|grade\s+six)\b/i, grade: "6th Grade" },

      // 7th Grade variations
      { pattern: /\b(7th\s+grade|seventh\s+grade|grade\s+7|grade\s+seven)\b/i, grade: "7th Grade" },

      // 8th Grade variations
      { pattern: /\b(8th\s+grade|eighth\s+grade|grade\s+8|grade\s+eight)\b/i, grade: "8th Grade" },

      // 9th Grade variations
      { pattern: /\b(9th\s+grade|ninth\s+grade|grade\s+9|grade\s+nine|freshman)\b/i, grade: "9th Grade" },

      // 10th Grade variations
      { pattern: /\b(10th\s+grade|tenth\s+grade|grade\s+10|grade\s+ten|sophomore)\b/i, grade: "10th Grade" },

      // 11th Grade variations
      { pattern: /\b(11th\s+grade|eleventh\s+grade|grade\s+11|grade\s+eleven|junior)\b/i, grade: "11th Grade" },

      // 12th Grade variations
      { pattern: /\b(12th\s+grade|twelfth\s+grade|grade\s+12|grade\s+twelve|senior)\b/i, grade: "12th Grade" },

      // School level groupings
      { pattern: /\b(elementary|primary\s+school)\b/i, grade: "Elementary" },
      { pattern: /\b(middle\s+school|junior\s+high)\b/i, grade: "Middle School" },
      { pattern: /\b(high\s+school|secondary\s+school)\b/i, grade: "High School" },

      // Age-based patterns
      { pattern: /\b(preschool|pre-k|prek)\b/i, grade: "Pre-K" },
      { pattern: /\btoddler/i, grade: "Toddler" },

      // Alternative formats
      { pattern: /\bfor\s+(k|kindergarten)\b/i, grade: "Kindergarten" },
      {
        pattern: /\bfor\s+(\d+)(st|nd|rd|th)?\s+grad/i,
        grade: (match) => {
          const num = Number.parseInt(match[1])
          const suffix = num === 1 ? "st" : num === 2 ? "nd" : num === 3 ? "rd" : "th"
          return `${num}${suffix} Grade`
        },
      },
    ]

    // Test each pattern
    for (const { pattern, grade } of gradePatterns) {
      const match = text.match(pattern)
      if (match) {
        if (typeof grade === "function") {
          info.grade = grade(match)
        } else {
          info.grade = grade
        }
        console.log(`🎯 Grade detected: "${info.grade}" from pattern: ${pattern}`)
        break // Use first match
      }
    }

    // Subject detection (enhanced)
    const subjectPatterns = [
      { pattern: /\b(math|mathematics|arithmetic|algebra|geometry|calculus)\b/i, subject: "Math" },
      { pattern: /\b(reading|comprehension|literacy|english|language\s+arts|ela)\b/i, subject: "Reading" },
      { pattern: /\b(science|biology|chemistry|physics|earth\s+science)\b/i, subject: "Science" },
      { pattern: /\b(history|social\s+studies|geography|civics)\b/i, subject: "History" },
      { pattern: /\b(art|drawing|painting|creative)\b/i, subject: "Art" },
      { pattern: /\b(music|singing|instruments)\b/i, subject: "Music" },
      { pattern: /\b(pe|physical\s+education|gym|sports)\b/i, subject: "Physical Education" },
    ]

    for (const { pattern, subject } of subjectPatterns) {
      if (pattern.test(text)) {
        info.subject = subject
        console.log(`📚 Subject detected: "${info.subject}" from pattern: ${pattern}`)
        break
      }
    }

    // Enhanced theme detection - check for multiple keywords and variations
    const themePatterns = [
      {
        pattern: /\b(dinosaur|dino|t-rex|fossil|prehistoric|jurassic|cretaceous|triassic)\b/i,
        theme: "dinosaurs",
      },
      {
        pattern: /\b(ocean|sea|marine|fish|whale|dolphin|underwater|aquatic|coral|shark)\b/i,
        theme: "ocean",
      },
      {
        pattern: /\b(space|planet|solar\s+system|astronaut|rocket|star|moon|galaxy|universe)\b/i,
        theme: "space",
      },
      {
        pattern: /\b(animal|pet|dog|cat|bird|mammal|wildlife|zoo|farm\s+animal)\b/i,
        theme: "animals",
      },
      {
        pattern: /\b(sport|football|soccer|basketball|baseball|tennis|athletics)\b/i,
        theme: "sports",
      },
      {
        pattern: /\b(halloween|pumpkin|ghost|witch|spooky|october|costume)\b/i,
        theme: "halloween",
      },
    ]

    for (const { pattern, theme } of themePatterns) {
      if (pattern.test(text)) {
        info.theme = theme
        console.log(`🎨 Theme detected: "${info.theme}" from pattern: ${pattern}`)
        break
      }
    }

    console.log("🔍 Final detected info:", info)
    setDetectedInfo(info)

    // Process the voice command based on content (enhanced with category detection)
    processVoiceCommand(text, info, resourceInfo)
  }

  const processVoiceCommand = (
    text: string,
    info: { grade?: string; subject?: string; theme?: string },
    resourceInfo?: { category: string; icon: string; description: string },
  ) => {
    // Add safety check for undefined text
    if (!text || typeof text !== "string") {
      console.log("❌ Invalid text provided to processVoiceCommand:", text)
      return
    }

    const lowerText = text.toLowerCase()

    // ENHANCED: Check for any educational resource creation request
    const isEducationalResource =
      lowerText.includes("worksheet") ||
      lowerText.includes("quiz") ||
      lowerText.includes("lesson") ||
      lowerText.includes("rubric") ||
      lowerText.includes("bell ringer") ||
      lowerText.includes("choice board") ||
      lowerText.includes("sub plan") ||
      lowerText.includes("math problems") ||
      lowerText.includes("addition") ||
      lowerText.includes("subtraction") ||
      (lowerText.includes("create") &&
        (lowerText.includes("math") || lowerText.includes("reading") || lowerText.includes("science"))) ||
      (lowerText.includes("grade") &&
        (lowerText.includes("math") || lowerText.includes("worksheet") || lowerText.includes("activity")))

    if (isEducationalResource) {
      // NEW: Enhanced response based on detected category
      const categoryResponses = {
        worksheet: "I'll create a worksheet based on what you said",
        quiz: "I'll create a quiz based on your request",
        bell_ringer: "I'll create a bell ringer activity for you",
        choice_board: "I'll create a choice board with activity options",
        lesson_plan: "I'll create a comprehensive lesson plan",
        rubric: "I'll create a grading rubric for you",
        sub_plan: "I'll create substitute teacher plans",
        exit_ticket: "I'll create an exit ticket activity",
      }

      const responseText = resourceInfo
        ? `${categoryResponses[resourceInfo.category] || categoryResponses.worksheet}: "${text}"`
        : `I'll create a worksheet based on what you said: "${text}"`

      // Show confirmation before redirecting to appropriate generator
      setVoiceResponse({
        text: responseText,
        actions: [
          {
            label:
              resourceInfo?.category === "worksheet"
                ? "Create Worksheet Now"
                : `Create ${resourceInfo?.description || "Resource"} Now`,
            onClick: () => {
              // For now, all educational resources go to worksheet generator
              // In the future, different categories could have their own generators
              setWorksheetRequest(text)
              setShowWorksheetGenerator(true)
            },
          },
          {
            label: "Add More Details",
            onClick: () => {
              setContextHint(`Please provide more details for your ${resourceInfo?.description || "resource"}`)
              startListening()
            },
          },
          {
            label: "Cancel",
            onClick: () => {
              setTranscript("")
              setVoiceResponse(null)
            },
          },
        ],
      })

      // Auto-proceed after 3 seconds if no interaction
      const timer = setTimeout(() => {
        setWorksheetRequest(text)
        setShowWorksheetGenerator(true)
      }, 3000)

      // Store the timer ID so we can clear it if needed
      window.worksheetTimer = timer

      return
    }

    // Start creation status for non-worksheet requests
    setCreationStatus({
      isActive: true,
      message: "Processing your request...",
      progress: 10,
    })

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setCreationStatus((prev) => {
        if (prev.progress >= 90) {
          clearInterval(progressInterval)
          return prev
        }
        return {
          ...prev,
          progress: prev.progress + 10,
          message:
            prev.progress < 30
              ? "Analyzing your request..."
              : prev.progress < 60
                ? "Generating response..."
                : "Finalizing your results...",
        }
      })
    }, 200)

    // Determine which type of request this is
    setTimeout(() => {
      clearInterval(progressInterval)
      setCreationStatus({
        isActive: false,
        message: "",
        progress: 0,
      })

      if (lowerText.includes("find") && lowerText.includes("substitute")) {
        // Find substitute request
        handleFindSubstitute()
      } else if (lowerText.includes("create") && lowerText.includes("iep")) {
        // Create IEP request
        handleCreateIEP()
      } else if (
        (lowerText.includes("find") || lowerText.includes("search")) &&
        (lowerText.includes("resource") || lowerText.includes("worksheet"))
      ) {
        // Find resources request
        handleFindResources()
      } else if (lowerText.includes("sell") || (lowerText.includes("create") && lowerText.includes("sell"))) {
        // Create and sell request
        handleCreateAndSell()
      } else if (lowerText.includes("store") || lowerText.includes("selling") || lowerText.includes("earnings")) {
        // My store request
        handleMyStore()
      } else if (lowerText.includes("lesson") && lowerText.includes("plan")) {
        // Lesson plan request
        handleLessonPlan()
      } else {
        // Generic response
        setVoiceResponse({
          text: "I'm here to help with your teaching needs! You can ask me to create worksheets, quizzes, lesson plans, rubrics, and more. What would you like to do?",
          actions: [
            {
              label: "Create a Worksheet",
              onClick: () => {
                setTranscript("Create a math worksheet for 3rd grade about dinosaurs")
                // Go directly to worksheet generator
                setWorksheetRequest("Create a math worksheet for 3rd grade about dinosaurs")
                setShowWorksheetGenerator(true)
              },
            },
            {
              label: "Find Resources",
              onClick: () => handleFindResources(),
            },
            {
              label: "View My Store",
              onClick: () => handleMyStore(),
            },
          ],
        })
      }
    }, 1500)
  }

  const handleFindSubstitute = () => {
    // Navigate to the substitute booking system
    setCurrentView("substitute")
  }

  const handleCreateIEP = () => {
    const responseText = `📋 I'll create a comprehensive IEP draft! Based on your student profile, I'm generating:

**Student Profile:**
• Grade: 3rd Grade
• Primary: Specific Learning Disability  
• Secondary: ADHD, Processing Speed

**🎯 IEP Goals Generated (3 goals):**
• **Reading:** Grade-appropriate text with 80% accuracy
• **Writing:** 5-sentence paragraph with proper structure  
• **Attention:** 20-minute on-task periods with minimal prompts

**🛠 Accommodations (6 included):**
• Extended time (1.5x) for assignments
• Preferential seating near teacher
• Frequent breaks every 15 minutes
• Written + verbal instructions
• Calculator for math computation
• Spell-check tools for writing

Your complete IEP draft will be ready in 30 seconds!`

    setVoiceResponse({
      text: responseText,
      actions: [
        {
          label: "📄 View Full IEP Draft",
          onClick: () => {
            setSuccessNotification("📄 Opening complete IEP draft with all sections...")
            setTimeout(() => setSuccessNotification(null), 3000)
          },
        },
        {
          label: "✏️ Edit & Customize",
          onClick: () => {
            setSuccessNotification("✏️ Opening IEP editor to customize goals and accommodations...")
            setTimeout(() => setSuccessNotification(null), 3000)
          },
        },
        {
          label: "📅 Schedule IEP Meeting",
          onClick: () => {
            setSuccessNotification("📅 IEP meeting scheduled for next Tuesday at 2 PM")
            setTimeout(() => setSuccessNotification(null), 3000)
          },
        },
      ],
    })

    setAssistantMessage(responseText)
  }

  const handleFindResources = () => {
    const responseText = `Found 23 matching resources in the marketplace! 

⭐ Top match: 'Fraction Pizza Party' by MathTeacher_Sarah 
💰 $3.99 • 4.9★ • 2,341 downloads 
📝 Includes visual models & answer key

Also showing: Visual manipulatives, assessment rubrics, and games`

    setVoiceResponse({
      text: responseText,
      actions: [
        {
          label: "Buy & Download",
          onClick: () => {
            setActiveTab("marketplace")
            setSuccessNotification("Navigating to marketplace...")
            setTimeout(() => setSuccessNotification(null), 3000)
          },
        },
        {
          label: "Preview",
          onClick: () => {
            setSuccessNotification("Opening preview...")
            setTimeout(() => setSuccessNotification(null), 3000)
          },
        },
        {
          label: "Find Similar",
          onClick: () => {
            setSuccessNotification("Finding similar resources...")
            setTimeout(() => setSuccessNotification(null), 3000)
          },
        },
      ],
    })

    setAssistantMessage(responseText)
  }

  const handleCreateAndSell = () => {
    // Create magical animated response with premium visual design
    const magicalResponse = {
      type: "magical",
      heroMessage: "I'll help you create and sell!",
      subtitle: "Your AI-powered marketplace assistant is ready",
      marketAnalysis: {
        trending: [
          {
            category: "Math Worksheets",
            demand: "High",
            demandLevel: 85,
            avgPrice: "$4.99",
            competition: "Medium",
            competitionLevel: 60,
            icon: "📊",
            color: "#10B981",
            trend: "+23%",
          },
          {
            category: "Reading Activities",
            demand: "Medium",
            demandLevel: 65,
            avgPrice: "$3.99",
            competition: "Low",
            competitionLevel: 30,
            icon: "📚",
            color: "#F59E0B",
            trend: "+15%",
          },
          {
            category: "Science Experiments",
            demand: "High",
            demandLevel: 90,
            avgPrice: "$5.99",
            competition: "Low",
            competitionLevel: 25,
            icon: "🔬",
            color: "#8B5CF6",
            trend: "+31%",
          },
        ],
        insights: {
          bestTime: "Sunday evenings",
          avgDownloads: "150+ downloads/month",
          successRate: "92%",
          topEarners: "$1,000+/month",
        },
      },
      callToAction: "Let's create something amazing!",
      actions: [
        {
          label: "🎯 Start Creating",
          type: "primary",
          icon: "✨",
          onClick: () => {
            setSuccessNotification("🎯 Opening magical content creator...")
            setTimeout(() => setSuccessNotification(null), 3000)
          },
        },
        {
          label: "📊 View Market Trends",
          type: "secondary",
          icon: "📈",
          onClick: () => {
            setSuccessNotification("📊 Opening market analytics dashboard...")
            setTimeout(() => setSuccessNotification(null), 3000)
          },
        },
        {
          label: "🏪 Set Up Store",
          type: "tertiary",
          icon: "🏪",
          onClick: () => {
            setSuccessNotification("🏪 Opening premium store setup...")
            setTimeout(() => setSuccessNotification(null), 3000)
          },
        },
      ],
    }

    // Create magical voice response with enhanced styling
    const magicalVoiceResponse = {
      text: "", // We'll render custom magical interface instead
      magical: true,
      data: magicalResponse,
      actions: magicalResponse.actions,
    }

    setVoiceResponse(magicalVoiceResponse)
    setAssistantMessage(
      "I'll help you create and sell! Your AI-powered marketplace assistant is analyzing market trends and preparing your success strategy...",
    )
  }

  const handleMyStore = () => {
    const responseText = `Your store performance this month: 

📈 Total earnings: $127.50 (+23% from last month) 
🔥 Best seller: 'Space Math Adventures' (47 downloads) 
📊 Worksheet revenue: $31.20
💡 Trending: Teachers are searching for 'Halloween math' - perfect timing!`

    setVoiceResponse({
      text: responseText,
      actions: [
        {
          label: "Create Halloween Math",
          onClick: () => {
            setSuccessNotification("Creating Halloween math worksheet...")
            setTimeout(() => setSuccessNotification(null), 3000)
          },
        },
        {
          label: "View Full Analytics",
          onClick: () => {
            setActiveTab("profile")
            setSuccessNotification("Opening analytics...")
            setTimeout(() => setSuccessNotification(null), 3000)
          },
        },
        {
          label: "Promote Products",
          onClick: () => {
            setSuccessNotification("Opening promotion tools...")
            setTimeout(() => setSuccessNotification(null), 3000)
          },
        },
      ],
    })

    setAssistantMessage(responseText)
  }

  const handleLessonPlan = () => {
    const responseText = `I'll create a comprehensive lesson plan for you! 

📚 Including:
- Learning objectives
- Warm-up activities
- Main lesson content
- Assessment strategies
- Homework options

What subject and grade level would you like this for?`

    setVoiceResponse({
      text: responseText,
      actions: [
        {
          label: "Math Lesson",
          onClick: () => {
            setSuccessNotification("Creating math lesson plan...")
            setTimeout(() => setSuccessNotification(null), 3000)
          },
        },
        {
          label: "Science Lesson",
          onClick: () => {
            setSuccessNotification("Creating science lesson plan...")
            setTimeout(() => setSuccessNotification(null), 3000)
          },
        },
        {
          label: "Reading Lesson",
          onClick: () => {
            setSuccessNotification("Creating reading lesson plan...")
            setTimeout(() => setSuccessNotification(null), 3000)
          },
        },
      ],
    })

    setAssistantMessage(responseText)
  }

  const startListening = async () => {
    console.log("🎤 startListening called")

    if (typeof window === "undefined") {
      console.log("❌ Window is undefined - running on server")
      return
    }

    // Step 1: Check HTTPS requirement
    if (location.protocol !== "https:" && location.hostname !== "localhost") {
      console.log("❌ HTTPS required for microphone access")
      alert("🔒 Microphone access requires HTTPS. Please use a secure connection.")
      return
    }

    // Step 2: Check if getUserMedia is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.log("❌ getUserMedia not supported")
      alert("❌ Your browser doesn't support microphone access. Please use Chrome, Safari, or Edge.")
      return
    }

    // Step 3: Check current permission state
    try {
      const permission = await navigator.permissions.query({ name: "microphone" })
      console.log("🔍 Current microphone permission state:", permission.state)

      if (permission.state === "denied") {
        console.log("🚫 Microphone permission explicitly denied")
        alert(`🚫 Microphone access is blocked.

To fix this:
1. Click the 🔒 lock icon next to the URL
2. Click "Site settings"
3. Set Microphone to "Allow"
4. Refresh this page

Or try: chrome://settings/content/microphone`)
        return
      }

      if (permission.state === "prompt") {
        console.log("❓ Microphone permission will prompt user")
        setContextHint("Browser will ask for microphone permission...")
      }

      if (permission.state === "granted") {
        console.log("✅ Microphone permission already granted")
        setContextHint("Permission granted, starting microphone...")
      }
    } catch (permissionError) {
      console.log("⚠️ Could not check permission state:", permissionError)
      // Continue anyway - some browsers don't support permission query
    }

    // Step 4: Check Speech Recognition support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    console.log("🔍 SpeechRecognition support:", !!SpeechRecognition)

    if (!SpeechRecognition) {
      console.log("❌ Speech recognition not supported")
      alert("❌ Voice recognition not supported in this browser. Please use Chrome, Safari, or Edge.")
      return
    }

    // Step 5: Test microphone access with detailed error handling
    try {
      console.log("🎯 Testing microphone access...")
      setContextHint("Requesting microphone access...")
      setIsListening(true)

      // Test microphone access first
      const testStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      console.log("✅ Microphone access successful:", testStream)
      setContextHint("Microphone ready! Setting up speech recognition...")

      // Clean up test stream
      testStream.getTracks().forEach((track) => track.stop())

      // Clear previous content
      setTranscript("")
      setDetectedInfo({})
      setVoiceResponse(null)
      console.log("🧹 Cleared transcript and detected info")

      // Set up speech recognition
      if (!recognitionRef.current) {
        console.log("🔄 Creating new recognition instance")
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = true
        recognitionRef.current.lang = "en-US"

        // Set up event handlers
        recognitionRef.current.onstart = () => {
          console.log("🎤 Speech recognition started successfully")
          setContextHint("Listening... speak naturally")
        }

        recognitionRef.current.onresult = (event) => {
          console.log("📝 Speech recognition result event:", event)
          let interimTranscript = ""
          let finalTranscript = ""

          for (let i = 0; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            console.log(`Result ${i}: "${transcript}" (final: ${event.results[i].isFinal})`)

            if (event.results[i].isFinal) {
              finalTranscript += transcript + " "
            } else {
              interimTranscript += transcript
            }
          }

          // Show the complete transcript (final + interim)
          const completeTranscript = finalTranscript + interimTranscript
          console.log("📋 Complete transcript:", completeTranscript)
          setTranscript(completeTranscript)

          // Analyze final results immediately when they come in
          if (finalTranscript) {
            console.log("🔍 Analyzing final transcript:", completeTranscript)
            analyzeTranscript(completeTranscript)
          }
        }

        recognitionRef.current.onend = () => {
          console.log("🛑 Speech recognition ended")
          setIsListening(false)
          setContextHint("Try: 'Create a math worksheet for 3rd grade about dinosaurs'")
        }

        recognitionRef.current.onerror = (event) => {
          console.error("❌ Speech recognition error:", {
            error: event.error,
            message: event.message,
            type: event.type,
          })
          setIsListening(false)
          setContextHint("Try: 'Create a math worksheet for 3rd grade about dinosaurs'")

          switch (event.error) {
            case "not-allowed":
              console.log("🚫 Speech recognition not allowed")
              alert(`🚫 Microphone access denied during speech recognition.

To fix this:
1. Click the 🔒 lock icon next to the URL
2. Select "Allow" for microphone
3. Refresh the page and try again

Alternative: Use the example prompts below`)
              break
            case "no-speech":
              console.log("🔇 No speech detected")
              setContextHint("No speech detected. Try speaking louder or closer to the microphone.")
              break
            case "audio-capture":
              console.log("🎤 Audio capture failed")
              alert("🎤 Microphone capture failed. Another app might be using your microphone.")
              break
            case "network":
              console.log("🌐 Network error")
              alert("🌐 Network error. Please check your internet connection and try again.")
              break
            case "service-not-allowed":
              console.log("🚫 Service not allowed")
              alert("🚫 Speech recognition service blocked. Please check your browser settings.")
              break
            default:
              console.log("❓ Unknown speech recognition error:", event.error)
              setContextHint("Speech recognition error. Please try again or use the example prompts below.")
          }
        }
      }

      // Stop any existing recognition
      try {
        recognitionRef.current.abort()
        console.log("🛑 Aborted existing recognition")
      } catch (e) {
        console.log("ℹ️ No existing recognition to abort")
      }

      // Start recognition after a brief delay
      setTimeout(() => {
        try {
          console.log("🚀 Starting speech recognition...")
          recognitionRef.current.start()
          console.log("✅ Speech recognition started successfully")
        } catch (startError) {
          console.error("❌ Failed to start recognition:", startError)
          setIsListening(false)
          setContextHint("Try: 'Create a math worksheet for 3rd grade about dinosaurs'")
          alert("❌ Failed to start voice recognition. Please refresh the page and try again.")
        }
      }, 100)
    } catch (error) {
      console.error("❌ Microphone access error details:", {
        name: error.name,
        message: error.message,
        constraint: error.constraint,
      })
      setIsListening(false)

      // Detailed error handling based on error type
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        console.log("🚫 Microphone permission denied")
        alert(`🚫 Microphone access blocked by browser.

SOLUTION:
1. Click the 🔒 lock icon next to the URL
2. Click "Site settings" 
3. Set Microphone to "Allow"


1. Click the 🔒 lock icon next to the URL
2. Click "Site settings"
3. Set Microphone to "Allow"
4. Refresh this page

OR try incognito mode to test without cached permissions.

Chrome users: chrome://settings/content/microphone`)
        setContextHint("Microphone blocked. Check browser permissions.")
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        console.log("🎤 No microphone device found")
        alert(`🎤 No microphone found.

SOLUTIONS:
1. Check if microphone is connected
2. Close apps that might be using your microphone
3. Check system privacy settings
4. Try refreshing the page`)
        setContextHint("No microphone found. Check device connections.")
      } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
        console.log("📱 Microphone hardware issue")
        alert(`📱 Microphone hardware issue.

SOLUTIONS:
1. Close other apps using the microphone
2. Restart your browser
3. Check system audio settings
4. Try a different microphone`)
        setContextHint("Microphone hardware issue. Check other apps.")
      } else if (error.name === "OverconstrainedError") {
        console.log("⚙️ Microphone constraints issue")
        alert("⚙️ Microphone settings incompatible. Trying basic settings...")
        setContextHint("Retrying with basic microphone settings...")

        // Retry with basic constraints
        try {
          const basicStream = await navigator.mediaDevices.getUserMedia({ audio: true })
          console.log("✅ Basic microphone access successful")
          basicStream.getTracks().forEach((track) => track.stop())
          // Continue with speech recognition setup...
        } catch (basicError) {
          console.error("❌ Even basic microphone access failed:", basicError)
          alert("❌ Microphone access failed completely. Please check your browser settings.")
        }
      } else if (error.name === "AbortError") {
        console.log("🛑 Microphone access aborted")
        alert("🛑 Microphone access was interrupted. Please try again.")
        setContextHint("Microphone access interrupted. Try again.")
      } else {
        console.log("❓ Unknown microphone error")
        alert(`❓ Unknown microphone error: ${error.message || error.name}

Try these solutions:
1. Refresh the page
2. Check browser permissions
3. Try incognito mode
4. Use example prompts instead`)
        setContextHint("Unknown error. Try refreshing or use example prompts.")
      }
    }
  }

  const stopListening = () => {
    console.log("🛑 stopListening called")

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
        console.log("✅ Speech recognition stopped")
        setIsListening(false)
        setContextHint("Understanding your request...")

        // Reset context hint after a delay
        setTimeout(() => {
          setContextHint("Try: 'Create a math worksheet for 3rd grade about dinosaurs'")
        }, 2000)
      } catch (error) {
        console.error("❌ Error stopping speech recognition:", error)
      }
    } else {
      console.log("❌ No recognition ref to stop")
    }
  }

  // Test microphone function
  const testMicrophone = async () => {
    console.log("🧪 Testing microphone access...")

    // Step 1: Basic browser support check
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("❌ Your browser doesn't support microphone access. Please use Chrome, Safari, or Edge.")
      return
    }

    // Step 2: Check permission state
    try {
      const permission = await navigator.permissions.query({ name: "microphone" })
      console.log("🔍 Permission state:", permission.state)

      if (permission.state === "denied") {
        alert(`🚫 Microphone permission is DENIED.

To fix this:
1. Click the 🔒 lock icon next to the URL
2. Click "Site settings"
3. Change Microphone from "Block" to "Allow"
4. Refresh this page

Chrome users can also visit: chrome://settings/content/microphone`)
        return
      }
    } catch (e) {
      console.log("⚠️ Could not check permission state:", e)
    }

    // Step 3: Test actual microphone access
    try {
      console.log("🎯 Attempting microphone access...")
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      console.log("✅ Microphone test SUCCESSFUL:", stream)
      console.log("🎤 Audio tracks:", stream.getAudioTracks())

      // Show success message with device info
      const audioTrack = stream.getAudioTracks()[0]
      const deviceLabel = audioTrack.label || "Unknown microphone"

      alert(`✅ Microphone test SUCCESSFUL!

Device: ${deviceLabel}
Status: Ready for voice input
Browser: ${navigator.userAgent.includes("Chrome") ? "Chrome" : "Other"}

You can now use voice input in the app!`)

      // Play test beep
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        oscillator.type = "sine"
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime)
        oscillator.connect(audioContext.destination)
        oscillator.start()
        oscillator.stop(audioContext.currentTime + 0.2)
        console.log("🔊 Test beep played")
      } catch (audioError) {
        console.log("⚠️ Could not play test beep:", audioError)
      }

      // Clean up
      stream.getTracks().forEach((track) => track.stop())
    } catch (error) {
      console.error("❌ Microphone test FAILED:", {
        name: error.name,
        message: error.message,
        constraint: error.constraint,
      })

      // Provide specific solutions based on error type
      let solution = ""

      switch (error.name) {
        case "NotAllowedError":
        case "PermissionDeniedError":
          solution = `🚫 PERMISSION DENIED

SOLUTIONS:
1. Click 🔒 lock icon → Site settings → Allow microphone
2. Try incognito mode to test fresh permissions
3. Chrome: chrome://settings/content/microphone
4. Refresh page after changing permissions`
          break

        case "NotFoundError":
        case "DevicesNotFoundError":
          solution = `🎤 NO MICROPHONE FOUND

SOLUTIONS:
1. Check if microphone is connected
2. Close apps that might be using microphone (Zoom, Teams, etc.)
3. Check system privacy settings
4. Try different microphone if available`
          break

        case "NotReadableError":
        case "TrackStartError":
          solution = `📱 MICROPHONE BUSY

SOLUTIONS:
1. Close other apps using microphone
2. Restart browser
3. Check system audio settings
4. Unplug and reconnect microphone`
          break

        default:
          solution = `❓ UNKNOWN ERROR: ${error.name}

GENERAL SOLUTIONS:
1. Refresh the page
2. Try incognito/private mode
3. Check browser permissions
4. Restart browser
5. Use example prompts instead`
      }

      alert(`❌ Microphone test FAILED

Error: ${error.name}
${error.message}

${solution}`)
    }
  }

  // Start Over function
  const handleStartOver = () => {
    console.log("🔄 Starting over - resetting app state")

    // Clear any pending worksheet timer
    if (window.worksheetTimer) {
      clearTimeout(window.worksheetTimer)
      window.worksheetTimer = null
    }

    // Stop any active speech recognition
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop()
      } catch (error) {
        console.log("Error stopping recognition:", error)
      }
    }

    // Reset all state to initial values
    setIsListening(false)
    setTranscript("")
    setDetectedInfo({})
    setVoiceResponse(null)
    setCreationStatus({
      isActive: false,
      message: "",
      progress: 0,
    })
    setAssistantMessage(null)
    setWorksheetRequest("")
    setShowResult(false)
    setContextHint("Try: 'Create a math worksheet for 3rd grade about dinosaurs'")

    // Clear any notifications
    setSuccessNotification(null)

    // Return to main view and home tab
    setCurrentView("main")
    setActiveTab("home")
    setShowWorksheetGenerator(false)

    console.log("✅ App state reset to initial values")

    // Show confirmation
    setSuccessNotification("🔄 App reset to initial state")
    setTimeout(() => setSuccessNotification(null), 2000)
  }

  // Smart Suggestion buttons
  const SmartSuggestionButton = ({
    icon,
    label,
    onClick,
  }: {
    icon: React.ReactNode
    label: string
    onClick: () => void
  }) => {
    return (
      <button
        onClick={() => {
          onClick()
          // Also trigger the AI assistant to show the response
          setShowAssistant(true)
        }}
        className="flex flex-col items-center justify-center bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow border border-gray-100"
      >
        <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mb-2 text-purple-600">
          {icon}
        </div>
        <span className="text-sm font-medium text-gray-800">{label}</span>
      </button>
    )
  }

  // NEW: Enhanced example prompt buttons with rotating content
  const ExamplePromptButton = ({ prompt, index }: { prompt: string; index: number }) => {
    const handleClick = () => {
      setTranscript(prompt)
      analyzeTranscript(prompt)
    }

    // Add visual indicator for current example
    const isCurrentExample = index === currentExampleIndex

    return (
      <button
        onClick={handleClick}
        className={`flex items-center justify-between w-full p-3 rounded-lg shadow-sm hover:shadow-md transition-all border ${
          isCurrentExample ? "border-purple-300 bg-purple-50 shadow-md" : "border-gray-100 bg-white"
        }`}
      >
        <span className={`text-sm ${isCurrentExample ? "text-purple-800 font-medium" : "text-gray-800"}`}>
          {prompt}
        </span>
        <ChevronRight className={`w-4 h-4 ${isCurrentExample ? "text-purple-500" : "text-gray-400"}`} />
      </button>
    )
  }

  // Handle AI assistant message
  const handleSendMessage = (message: string) => {
    // Process the message similar to voice commands
    analyzeTranscript(message)
  }

  // Handle Smart Suggestion from AI Assistant
  const handleSmartSuggestionFromAssistant = (category: string) => {
    console.log(`Smart suggestion from assistant: ${category}`)

    const responses = {
      create_worksheet: {
        text: "📝 I'll help you create a worksheet! What type would you like to make?\n\n✅ Math problems with visual supports\n✅ Reading comprehension activities\n✅ Science experiments and observations\n✅ Custom themes and difficulty levels\n\nChoose your subject and grade level to get started!",
        actions: [
          {
            label: "📊 Math Worksheet",
            onClick: () => {
              // Go directly to worksheet generator
              setWorksheetRequest("Create a math worksheet")
              setShowWorksheetGenerator(true)
            },
          },
          {
            label: "📚 Reading Activity",
            onClick: () => {
              setSuccessNotification("Creating reading activity...")
              setTimeout(() => setSuccessNotification(null), 2000)
            },
          },
          {
            label: "🔬 Science Lab",
            onClick: () => {
              setSuccessNotification("Creating science worksheet...")
              setTimeout(() => setSuccessNotification(null), 2000)
            },
          },
        ],
      },

      lesson_plan: {
        text: "📋 Your lesson plan is ready! 45-minute lesson includes:\n\n✅ Clear learning objectives\n✅ Engagement activities\n✅ Assessment rubric\n✅ Differentiation strategies\n✅ Materials list\n\n🌟 Ready to use tomorrow!",
        actions: [
          {
            label: "📄 Download PDF",
            onClick: () => {
              setSuccessNotification("📄 Downloading lesson plan PDF...")
              setTimeout(() => setSuccessNotification(null), 2000)
            },
          },
          {
            label: "✏️ Edit Lesson",
            onClick: () => {
              setSuccessNotification("✏️ Opening lesson plan editor...")
              setTimeout(() => setSuccessNotification(null), 2000)
            },
          },
          {
            label: "📚 Create More Plans",
            onClick: () => {
              setSuccessNotification("📚 Opening lesson plan generator...")
              setTimeout(() => setSuccessNotification(null), 2000)
            },
          },
        ],
      },

      quiz_generator: {
        text: "📋 Quiz generated successfully!\n\n✅ 10 questions created\n✅ Multiple choice and short answer formats\n✅ Aligned to learning standards\n✅ Answer key included\n✅ Scoring rubric provided\n\n🎯 Ready for your students!",
        actions: [
          {
            label: "👁 Preview Quiz",
            onClick: () => {
              setSuccessNotification("👁 Opening quiz preview...")
              setTimeout(() => setSuccessNotification(null), 2000)
            },
          },
          {
            label: "🔄 Generate More",
            onClick: () => {
              setSuccessNotification("🔄 Generating additional questions...")
              setTimeout(() => setSuccessNotification(null), 2000)
            },
          },
          {
            label: "📊 Export to Google",
            onClick: () => {
              setSuccessNotification("📊 Exporting to Google Forms...")
              setTimeout(() => setSuccessNotification(null), 2000)
            },
          },
        ],
      },

      activity_ideas: {
        text: "🎨 Here are 5 engaging activities!\n\n✅ Hands-on experiments\n✅ Group projects\n✅ Creative assignments\n✅ Interactive games\n✅ Real-world applications\n\n🌟 Perfect for your current unit!",
        actions: [
          {
            label: "📋 View All Activities",
            onClick: () => {
              setSuccessNotification("📋 Opening activity library...")
              setTimeout(() => setSuccessNotification(null), 2000)
            },
          },
          {
            label: "⭐ Favorite Ideas",
            onClick: () => {
              setSuccessNotification("⭐ Saving to favorites...")
              setTimeout(() => setSuccessNotification(null), 2000)
            },
          },
          {
            label: "💡 Get More Suggestions",
            onClick: () => {
              setSuccessNotification("💡 Generating more activity ideas...")
              setTimeout(() => setSuccessNotification(null), 2000)
            },
          },
        ],
      },

      create_sell: {
        text: "💰 I'll help you create and sell!\n\n📈 Market Analysis:\n• Math worksheets are trending\n• Average price: $4.99\n• High demand for visual supports\n• Best selling time: Sunday evenings\n\n🚀 Let's create something amazing!",
        actions: [
          {
            label: "🎯 Start Creating",
            onClick: () => {
              setSuccessNotification("🎯 Opening content creator...")
              setTimeout(() => setSuccessNotification(null), 2000)
            },
          },
          {
            label: "📊 View Market Trends",
            onClick: () => {
              setSuccessNotification("📊 Opening market analytics...")
              setTimeout(() => setSuccessNotification(null), 2000)
            },
          },
          {
            label: "🏪 Set Up Store",
            onClick: () => {
              setSuccessNotification("🏪 Opening store setup...")
              setTimeout(() => setSuccessNotification(null), 2000)
            },
          },
        ],
      },

      find_resources: {
        text: "🔍 Found 23 resources in the marketplace!\n\n⭐ Top match: 'Fraction Pizza Party' by MathTeacher_Sarah\n💰 $3.99 • 4.9★ • 2,341 downloads\n📝 Includes visual models & answer key\n\n🎯 Perfect for visual learners!",
        actions: [
          {
            label: "💳 Buy & Download",
            onClick: () => {
              setActiveTab("marketplace")
              setSuccessNotification("💳 Processing purchase...")
              setTimeout(() => setSuccessNotification(null), 2000)
            },
          },
          {
            label: "👁 View Details",
            onClick: () => {
              setSuccessNotification("👁 Opening resource preview...")
              setTimeout(() => setSuccessNotification(null), 2000)
            },
          },
          {
            label: "🔍 See More Options",
            onClick: () => {
              setSuccessNotification("🔍 Loading more resources...")
              setTimeout(() => setSuccessNotification(null), 2000)
            },
          },
        ],
      },

      my_store: {
        text: "⭐ Your store performance this month:\n\n📈 Total earnings: $127.50 (+23% from last month)\n🔥 Best seller: 'Space Math Adventures' (47 downloads)\n📊 Worksheet revenue: $31.20\n💡 Trending: Halloween math worksheets\n\n🌟 Great work!",
        actions: [
          {
            label: "📊 View Full Analytics",
            onClick: () => {
              setActiveTab("profile")
              setSuccessNotification("📊 Opening detailed analytics...")
              setTimeout(() => setSuccessNotification(null), 2000)
            },
          },
          {
            label: "➕ Create New Product",
            onClick: () => {
              setSuccessNotification("➕ Opening product creator...")
              setTimeout(() => setSuccessNotification(null), 2000)
            },
          },
          {
            label: "📢 Promote Items",
            onClick: () => {
              setSuccessNotification("📢 Opening promotion tools...")
              setTimeout(() => setSuccessNotification(null), 2000)
            },
          },
        ],
      },

      find_substitute: {
        text: '👩‍🏫 Found 3 qualified substitutes available for your date!\n\n🌟 **Sarah Martinez** (4.9★) - BEST MATCH\n• 8 years experience • Special Education specialist\n• Available Tuesday, Nov 7th • $120/day\n• 12 miles from your school\n• "Excellent with special needs students. Very reliable."\n\n📋 **Michael Chen** (4.7★)\n• 5 years experience • Elementary & ESL\n• Available Tuesday, Nov 7th • $110/day\n• 8 miles from your school\n\n📋 **Jennifer Kim** (4.8★)\n• 12 years experience • Reading & Writing\n• Available Tuesday, Nov 7th • $135/day\n• 15 miles from your school\n\nWould you like to book one of these substitutes?',
        actions: [
          {
            label: "📅 Book Sarah (Best Match)",
            onClick: () => {
              setSuccessNotification("✅ Sarah Martinez booked for Tuesday! Confirmation sent.")
              setTimeout(() => setSuccessNotification(null), 3000)
            },
          },
          {
            label: "📅 Book Michael",
            onClick: () => {
              setSuccessNotification("✅ Michael Chen booked for Tuesday! Confirmation sent.")
              setTimeout(() => setSuccessNotification(null), 3000)
            },
          },
          {
            label: "👁 View All Profiles",
            onClick: () => {
              setSuccessNotification("📄 Opening detailed substitute profiles...")
              setTimeout(() => setSuccessNotification(null), 3000)
            },
          },
        ],
      },

      create_iep: {
        text: "📋 I'll create a comprehensive IEP draft! Based on your student profile, I'm generating:\n\n**Student Profile:**\n• Grade: 3rd Grade\n• Primary: Specific Learning Disability\n• Secondary: ADHD, Processing Speed\n\n**🎯 IEP Goals Generated (3 goals):**\n• **Reading:** Grade-appropriate text with 80% accuracy\n• **Writing:** 5-sentence paragraph with proper structure\n• **Attention:** 20-minute on-task periods with minimal prompts\n\n**🛠 Accommodations (6 included):**\n• Extended time (1.5x) for assignments\n• Preferential seating near teacher\n• Frequent breaks every 15 minutes\n• Written + verbal instructions\n• Calculator for math computation\n• Spell-check tools for writing\n\nYour complete IEP draft will be ready in 30 seconds!",
        actions: [
          {
            label: "📄 View Full IEP Draft",
            onClick: () => {
              setSuccessNotification("📄 Opening complete IEP draft with all sections...")
              setTimeout(() => setSuccessNotification(null), 3000)
            },
          },
          {
            label: "✏️ Edit & Customize",
            onClick: () => {
              setSuccessNotification("✏️ Opening IEP editor to customize goals and accommodations...")
              setTimeout(() => setSuccessNotification(null), 3000)
            },
          },
          {
            label: "📅 Schedule IEP Meeting",
            onClick: () => {
              setSuccessNotification("📅 IEP meeting scheduled for next Tuesday at 2 PM")
              setTimeout(() => setSuccessNotification(null), 3000)
            },
          },
        ],
      },
    }

    const response = responses[category]
    if (response) {
      setVoiceResponse(response)
      setAssistantMessage(response.text)
    } else {
      setSuccessNotification(`Processing ${category}...`)
      setTimeout(() => setSuccessNotification(null), 2000)
    }
  }

  if (showWorksheetGenerator) {
    return (
      <>
        <WorksheetGenerator
          request={worksheetRequest}
          onComplete={(worksheet) => {
            console.log("Worksheet completed:", worksheet)
            setShowWorksheetGenerator(false)
            setShowResult(true)
          }}
          onBack={() => {
            setShowWorksheetGenerator(false)
            setTranscript("")
          }}
        />
        <VoiceAssistantOverlay
          isListening={isListening}
          startListening={startListening}
          stopListening={stopListening}
        />
      </>
    )
  } else {
    return (
      <div className="min-h-screen bg-white flex justify-center items-center p-4">
        {/* Phone Frame */}
        <div className="w-[375px] h-[812px] bg-black rounded-[40px] p-2 shadow-2xl relative phone-frame">
          <div className="w-full h-full bg-white rounded-[32px] overflow-hidden relative">
            {/* Status Bar */}
            <div className="flex justify-between items-center px-6 py-2 text-black text-sm font-medium">
              <span>9:41</span>
              <div className="flex items-center gap-1">
                <div className="w-4 h-2 border border-black rounded-sm">
                  <div className="w-3 h-1 bg-black rounded-sm m-0.5"></div>
                </div>
              </div>
            </div>

            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 pb-8">
              <div className="flex items-center justify-center mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-6 h-6" />
                  <h1 className="text-xl font-bold">VoiceVenture AI</h1>
                </div>
              </div>
              <p className="text-purple-100 text-sm text-center">
                {activeTab === "home" && "Just Ask For What You Want®"}
                {activeTab === "marketplace" && "Discover amazing educational content"}
                {activeTab === "profile" && "Manage your teaching business"}
              </p>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto scrollable-content" style={{ height: "calc(100% - 180px)" }}>
              <div className="bg-white min-h-full p-4">
                {currentView === "main" ? (
                  <>
                    {/* HOME PAGE */}
                    {activeTab === "home" && (
                      <div className="space-y-6">
                        {/* Voice Input Section */}
                        <div className="bg-white rounded-2xl p-8 flex flex-col items-center shadow-sm border border-gray-100">
                          <div className="mb-6">
                            <Button
                              onClick={isListening ? stopListening : startListening}
                              size="lg"
                              className={`w-24 h-24 rounded-full ${
                                isListening
                                  ? "bg-red-500 hover:bg-red-600 animate-pulse shadow-lg"
                                  : "bg-purple-600 hover:bg-purple-700 shadow-lg"
                              }`}
                            >
                              {isListening ? (
                                <MicOff className="w-8 h-8 text-white" />
                              ) : (
                                <Mic className="w-8 h-8 text-white" />
                              )}
                            </Button>
                          </div>

                          {/* Status Display */}
                          <div className="w-full mb-4">
                            {isListening ? (
                              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                  <span className="text-sm font-medium text-red-800">Listening...</span>
                                </div>
                                <p className="text-xs text-red-600 text-center">Speak clearly into your microphone</p>
                              </div>
                            ) : (
                              <div className="bg-white bg-opacity-80 rounded-lg p-3 border border-gray-100">
                                <p className="text-sm text-gray-700 text-center mb-1">Ready to listen</p>
                                <p className="text-xs text-gray-500 text-center">{contextHint}</p>
                              </div>
                            )}
                          </div>

                          {/* Test Microphone and Start Over Buttons */}
                          <div className="flex gap-3 mb-4">
                            <Button onClick={testMicrophone} size="sm" variant="outline" className="text-xs">
                              🧪 Test Microphone
                            </Button>
                            <Button onClick={handleStartOver} size="sm" variant="outline" className="text-xs">
                              🔄 Start Over
                            </Button>
                          </div>

                          {/* Transcript Display */}
                          {transcript && (
                            <div className="w-full bg-white rounded-lg p-4 shadow-sm mb-4 border border-gray-100">
                              <p className="text-sm font-medium text-gray-700 mb-1">You said:</p>
                              <p className="text-sm text-gray-900">"{transcript}"</p>
                            </div>
                          )}

                          {/* Creation Status */}
                          {creationStatus.isActive && (
                            <div className="w-full bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-purple-800">{creationStatus.message}</span>
                                <span className="text-xs text-purple-600">{creationStatus.progress}%</span>
                              </div>
                              <div className="w-full bg-purple-200 rounded-full h-2">
                                <div
                                  className="bg-purple-600 h-2 rounded-full transition-all duration-300 ease-out"
                                  style={{ width: `${creationStatus.progress}%` }}
                                ></div>
                              </div>
                            </div>
                          )}

                          {/* Voice Response */}
                          {voiceResponse && (
                            <div className="w-full">
                              {voiceResponse.magical ? (
                                /* Magical Create & Sell Interface */
                                <div
                                  className="relative overflow-hidden rounded-2xl"
                                  style={{
                                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #8B5CF6 100%)",
                                    backgroundSize: "200% 200%",
                                    animation: "magicalGradient 6s ease infinite",
                                  }}
                                >
                                  {/* Floating Particles Background */}
                                  <div className="absolute inset-0 overflow-hidden">
                                    {[...Array(12)].map((_, i) => (
                                      <div
                                        key={i}
                                        className="absolute w-1 h-1 bg-white rounded-full opacity-60"
                                        style={{
                                          left: `${Math.random() * 100}%`,
                                          top: `${Math.random() * 100}%`,
                                          animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
                                          animationDelay: `${Math.random() * 2}s`,
                                        }}
                                      />
                                    ))}
                                  </div>

                                  <div className="relative p-6 text-white">
                                    {/* Hero Section */}
                                    <div
                                      className="text-center mb-6"
                                      style={{
                                        animation: "slideInDown 0.8s ease-out",
                                      }}
                                    >
                                      <h2
                                        className="text-2xl font-bold mb-2"
                                        style={{
                                          fontFamily: "'Inter', -apple-system, sans-serif",
                                          fontWeight: "700",
                                          textShadow: "0 2px 4px rgba(0,0,0,0.3)",
                                        }}
                                      >
                                        ✨ {voiceResponse.data.heroMessage}
                                      </h2>
                                      <p
                                        className="text-purple-100 text-sm"
                                        style={{
                                          fontWeight: "400",
                                          opacity: 0.9,
                                        }}
                                      >
                                        {voiceResponse.data.subtitle}
                                      </p>
                                    </div>

                                    {/* Market Analysis Cards */}
                                    <div
                                      className="mb-6"
                                      style={{
                                        animation: "slideInUp 0.8s ease-out 0.2s both",
                                      }}
                                    >
                                      <h3 className="text-lg font-semibold mb-4 text-center">📊 Market Intelligence</h3>

                                      <div className="space-y-3">
                                        {voiceResponse.data.marketAnalysis.trending.map((item, index) => (
                                          <div
                                            key={index}
                                            className="backdrop-blur-md bg-white/10 rounded-xl p-4 border border-white/20"
                                            style={{
                                              animation: `slideInLeft 0.6s ease-out ${0.4 + index * 0.1}s both`,
                                              boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
                                            }}
                                          >
                                            <div className="flex items-center justify-between mb-3">
                                              <div className="flex items-center gap-3">
                                                <div
                                                  className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                                                  style={{
                                                    background: `${item.color}20`,
                                                    border: `1px solid ${item.color}40`,
                                                  }}
                                                >
                                                  {item.icon}
                                                </div>
                                                <div>
                                                  <h4 className="font-semibold text-sm">{item.category}</h4>
                                                  <p className="text-xs text-purple-100 opacity-80">
                                                    Trending {item.trend}
                                                  </p>
                                                </div>
                                              </div>
                                              <div className="text-right">
                                                <div className="text-lg font-bold" style={{ color: item.color }}>
                                                  {item.avgPrice}
                                                </div>
                                              </div>
                                            </div>

                                            {/* Animated Progress Bars */}
                                            <div className="space-y-2">
                                              <div className="flex justify-between text-xs">
                                                <span>Demand</span>
                                                <span className="font-semibold">{item.demand}</span>
                                              </div>
                                              <div className="w-full bg-white/20 rounded-full h-2">
                                                <div
                                                  className="h-2 rounded-full transition-all duration-1000 ease-out"
                                                  style={{
                                                    width: `${item.demandLevel}%`,
                                                    background: `linear-gradient(90deg, ${item.color}, ${item.color}CC)`,
                                                    animation: `growBar 1.5s ease-out ${0.6 + index * 0.1}s both`,
                                                  }}
                                                />
                                              </div>

                                              <div className="flex justify-between text-xs mt-2">
                                                <span>Competition</span>
                                                <span className="font-semibold">{item.competition}</span>
                                              </div>
                                              <div className="w-full bg-white/20 rounded-full h-2">
                                                <div
                                                  className="h-2 rounded-full transition-all duration-1000 ease-out"
                                                  style={{
                                                    width: `${item.competitionLevel}%`,
                                                    background: `linear-gradient(90deg, #F59E0B, #F59E0BCC)`,
                                                    animation: `growBar 1.5s ease-out ${0.8 + index * 0.1}s both`,
                                                  }}
                                                />
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Insights Card */}
                                    <div
                                      className="backdrop-blur-md bg-white/10 rounded-xl p-4 border border-white/20 mb-6"
                                      style={{
                                        animation: "slideInUp 0.8s ease-out 0.8s both",
                                        boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
                                      }}
                                    >
                                      <h4 className="font-semibold mb-3 text-center">💡 Success Insights</h4>
                                      <div className="grid grid-cols-2 gap-3 text-xs">
                                        <div className="text-center">
                                          <div className="font-bold text-green-300">
                                            {voiceResponse.data.marketAnalysis.insights.bestTime}
                                          </div>
                                          <div className="text-purple-100 opacity-80">Best selling time</div>
                                        </div>
                                        <div className="text-center">
                                          <div className="font-bold text-blue-300">
                                            {voiceResponse.data.marketAnalysis.insights.avgDownloads}
                                          </div>
                                          <div className="text-purple-100 opacity-80">Average downloads</div>
                                        </div>
                                        <div className="text-center">
                                          <div className="font-bold text-yellow-300">
                                            {voiceResponse.data.marketAnalysis.insights.successRate}
                                          </div>
                                          <div className="text-purple-100 opacity-80">Success rate</div>
                                        </div>
                                        <div className="text-center">
                                          <div className="font-bold text-pink-300">
                                            {voiceResponse.data.marketAnalysis.insights.topEarners}
                                          </div>
                                          <div className="text-purple-100 opacity-80">Top earners</div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Call to Action */}
                                    <div
                                      className="text-center mb-6"
                                      style={{
                                        animation: "slideInUp 0.8s ease-out 1s both",
                                      }}
                                    >
                                      <h3
                                        className="text-xl font-bold mb-4"
                                        style={{
                                          fontFamily: "'Dancing Script', cursive",
                                          textShadow: "0 2px 4px rgba(0,0,0,0.3)",
                                        }}
                                      >
                                        ✨ {voiceResponse.data.callToAction} ✨
                                      </h3>
                                    </div>

                                    {/* Enhanced Action Buttons */}
                                    <div className="space-y-3">
                                      {/* Enhanced Action Buttons with Visual Hierarchy */}
                                      <div className="space-y-3">
                                        {voiceResponse.actions.map((action, index) => {
                                          // Determine if this is the primary action (first button)
                                          const isPrimary = index === 0

                                          if (isPrimary) {
                                            // Primary action button - larger and more prominent
                                            return (
                                              <button
                                                key={index}
                                                onClick={action.onClick}
                                                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold text-base py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                                              >
                                                {action.label}
                                              </button>
                                            )
                                          }

                                          return null // Secondary buttons will be rendered separately
                                        })}

                                        {/* Secondary actions - horizontal layout with smaller buttons */}
                                        {voiceResponse.actions.length > 1 && (
                                          <div className="flex gap-2 mt-2">
                                            {voiceResponse.actions.slice(1).map((action, index) => (
                                              <button
                                                key={index + 1}
                                                onClick={action.onClick}
                                                className="flex-1 bg-white hover:bg-gray-50 text-purple-600 font-medium text-sm py-3 px-4 rounded-lg border-2 border-purple-200 hover:border-purple-300 transition-all duration-200"
                                              >
                                                {action.label}
                                              </button>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                /* Regular Voice Response */
                                <div className="w-full bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                                  <div className="flex items-start mb-4">
                                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mr-3">
                                      <Sparkles className="w-4 h-4 text-purple-600" />
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-sm text-gray-800 whitespace-pre-line">{voiceResponse.text}</p>
                                    </div>
                                  </div>

                                  <div className="flex flex-col gap-2 mt-4">
                                    {voiceResponse.actions.map((action, index) => {
                                      // Determine which icon to show based on the button index
                                      let icon = "⚡"
                                      if (index === 1) {
                                        icon = "✏️"
                                      } else if (index === 2) {
                                        icon = "💾"
                                      }

                                      return (
                                        <Button
                                          key={index}
                                          onClick={action.onClick}
                                          className="bg-purple-600 hover:bg-purple-700 text-white w-full flex items-center justify-center py-3 px-4 text-sm font-medium"
                                          size="sm"
                                        >
                                          <span className="mr-2">{icon}</span>
                                          <span>{action.label}</span>
                                        </Button>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* NEW: Enhanced Try These Examples with rotating content */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                          <div className="flex items-center justify-between mb-4">
                            <h2 className="text-gray-800 text-lg font-medium">Try These Examples</h2>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                              <span>Auto-rotating</span>
                            </div>
                          </div>
                          <div className="space-y-3">
                            {/* Show current set of 4 examples */}
                            {examplePrompts.slice(currentExampleIndex, currentExampleIndex + 4).map((prompt, index) => (
                              <ExamplePromptButton
                                key={currentExampleIndex + index}
                                prompt={prompt}
                                index={currentExampleIndex + index}
                              />
                            ))}
                          </div>
                          <div className="mt-3 text-center">
                            <div className="text-xs text-gray-500">
                              Showing {Math.min(4, examplePrompts.length - currentExampleIndex)} of{" "}
                              {examplePrompts.length} examples
                            </div>
                            <div className="flex justify-center gap-1 mt-2">
                              {Array.from({ length: Math.ceil(examplePrompts.length / 4) }).map((_, i) => (
                                <div
                                  key={i}
                                  className={`w-2 h-2 rounded-full ${
                                    Math.floor(currentExampleIndex / 4) === i ? "bg-purple-500" : "bg-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Smart Suggestions Grid - MOVED DOWN TO SECOND POSITION */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                          <h2 className="text-gray-800 text-lg font-medium mb-4">Smart Suggestions</h2>
                          <div className="grid grid-cols-2 gap-4">
                            <SmartSuggestionButton
                              icon={<FileText className="w-5 h-5" />}
                              label="Create & Sell"
                              onClick={() => handleSmartSuggestionFromAssistant("create_sell")}
                            />
                            <SmartSuggestionButton
                              icon={<ShoppingCart className="w-5 h-5" />}
                              label="Find Resources"
                              onClick={() => handleSmartSuggestionFromAssistant("find_resources")}
                            />
                            <SmartSuggestionButton
                              icon={<Users className="w-5 h-5" />}
                              label="Find Substitute"
                              onClick={() => setCurrentView("substitute")}
                            />
                            <SmartSuggestionButton
                              icon={<ClipboardList className="w-5 h-5" />}
                              label="Create IEP"
                              onClick={() => handleSmartSuggestionFromAssistant("create_iep")}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* MARKETPLACE PAGE */}
                    {activeTab === "marketplace" && (
                      <div className="space-y-6">
                        {/* Search Bar */}
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                          <div className="flex items-center bg-gray-50 rounded-lg p-3">
                            <ShoppingCart className="w-4 h-4 text-gray-500 mr-2" />
                            <input
                              type="text"
                              placeholder="Search educational resources..."
                              className="w-full bg-transparent text-sm outline-none"
                            />
                          </div>
                        </div>

                        {/* Categories */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                          <h2 className="text-gray-800 text-lg font-medium mb-4">Categories</h2>
                          <div className="grid grid-cols-2 gap-3">
                            <button className="bg-gray-50 rounded-lg p-3 text-left hover:shadow-md transition-shadow border border-gray-100">
                              <div className="text-purple-600 mb-1">📝</div>
                              <span className="text-sm font-medium">Worksheets</span>
                            </button>
                            <button className="bg-gray-50 rounded-lg p-3 text-left hover:shadow-md transition-shadow border border-gray-100">
                              <div className="text-purple-600 mb-1">📚</div>
                              <span className="text-sm font-medium">Lesson Plans</span>
                            </button>
                            <button className="bg-gray-50 rounded-lg p-3 text-left hover:shadow-md transition-shadow border border-gray-100">
                              <div className="text-purple-600 mb-1">🎯</div>
                              <span className="text-sm font-medium">Activities</span>
                            </button>
                            <button className="bg-gray-50 rounded-lg p-3 text-left hover:shadow-md transition-shadow border border-gray-100">
                              <div className="text-purple-600 mb-1">📊</div>
                              <span className="text-sm font-medium">Assessments</span>
                            </button>
                          </div>
                        </div>

                        {/* Featured Resources */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                          <h2 className="text-gray-800 text-lg font-medium mb-4">Featured Resources</h2>
                          <div className="space-y-4">
                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h3 className="font-medium text-sm">Ocean Adventures: Marine Biology</h3>
                                  <p className="text-xs text-gray-500">4th Grade • Science</p>
                                  <p className="text-xs text-gray-500">by Ms. Johnson</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-bold text-green-600">$3.99</p>
                                  <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                    <span>4.9</span>
                                  </div>
                                </div>
                              </div>
                              <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white" size="sm">
                                Purchase & Download
                              </Button>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h3 className="font-medium text-sm">Space Explorers: Solar System</h3>
                                  <p className="text-xs text-gray-500">5th Grade • Science</p>
                                  <p className="text-xs text-gray-500">by Mr. Chen</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-bold text-green-600">$4.49</p>
                                  <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                    <span>4.8</span>
                                  </div>
                                </div>
                              </div>
                              <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white" size="sm">
                                Purchase & Download
                              </Button>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h3 className="font-medium text-sm">Dinosaur Math Adventures</h3>
                                  <p className="text-xs text-gray-500">3rd Grade • Math</p>
                                  <p className="text-xs text-gray-500">by Mrs. Smith</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-bold text-green-600">$2.99</p>
                                  <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                    <span>4.7</span>
                                  </div>
                                </div>
                              </div>
                              <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white" size="sm">
                                Purchase & Download
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* PROFILE PAGE */}
                    {activeTab === "profile" && (
                      <ProfileView />
                    )}
                  </>
                ) : currentView === "substitute" ? (
                  <SubstituteBookingSystem onBack={() => setCurrentView("main")} />
                ) : null}
              </div>
            </div>

            {/* Bottom Navigation */}
            <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200">
              <div className="flex">
                <button
                  onClick={() => setActiveTab("home")}
                  className={`flex-1 flex flex-col items-center py-3 px-2 ${
                    activeTab === "home" ? "text-purple-600" : "text-gray-500"
                  }`}
                >
                  <Home className="w-5 h-5 mb-1" />
                  <span className="text-xs">Home</span>
                </button>
                <button
                  onClick={() => setActiveTab("marketplace")}
                  className={`flex-1 flex flex-col items-center py-3 px-2 ${
                    activeTab === "marketplace" ? "text-purple-600" : "text-gray-500"
                  }`}
                >
                  <Store className="w-5 h-5 mb-1" />
                  <span className="text-xs">Marketplace</span>
                </button>
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`flex-1 flex flex-col items-center py-3 px-2 ${
                    activeTab === "profile" ? "text-purple-600" : "text-gray-500"
                  }`}
                >
                  <User className="w-5 h-5 mb-1" />
                  <span className="text-xs">Profile</span>
                </button>
              </div>
            </div>

            {/* Success Notification */}
            {successNotification && (
              <div className="absolute top-20 left-4 right-4 bg-green-500 text-white p-3 rounded-lg z-50 shadow-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {successNotification}
                </div>
              </div>
            )}

            {/* AI Assistant panel - Always show */}
            {showAssistant && (
              <AIAssistant
                onClose={() => setShowAssistant(false)}
                voiceResponse={assistantMessage}
                onSendMessage={handleSendMessage}
                onSmartSuggestion={handleSmartSuggestionFromAssistant}
              />
            )}

            {/* PWA Install Prompt */}
            {showInstallPrompt && (
              <div
                style={{
                  position: "fixed",
                  bottom: "100px",
                  left: "20px",
                  right: "20px",
                  background: "linear-gradient(135deg, #8B5CF6, #3B82F6)",
                  color: "white",
                  padding: "16px",
                  borderRadius: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  zIndex: 2000,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontWeight: "bold", fontSize: "14px" }}>📱 Install VoiceVenture AI</div>
                  <div style={{ fontSize: "12px", opacity: 0.9 }}>Add to home screen for quick access</div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => setShowInstallPrompt(false)}
                    style={{
                      background: "rgba(255,255,255,0.2)",
                      border: "none",
                      color: "white",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                  >
                    Later
                  </button>
                  <button
                    onClick={handleInstallClick}
                    style={{
                      background: "white",
                      border: "none",
                      color: "#8B5CF6",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    Install
                  </button>
                </div>
              </div>
            )}

            {/* Offline Indicator */}
            {!isOnline && (
              <div
                style={{
                  position: "fixed",
                  top: "70px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "#f59e0b",
                  color: "white",
                  padding: "8px 16px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  zIndex: 2000,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                📱 Working offline
              </div>
            )}

            {/* PWA Features Menu */}
            <div
              style={{
                position: "fixed",
                bottom: "160px",
                left: "20px",
                zIndex: 1000,
              }}
            >
              <button
                onClick={() => setShowPWAMenu(!showPWAMenu)}
                style={{
                  width: "48px",
                  height: "48px",
                  background: "linear-gradient(135deg, #8B5CF6, #3B82F6)",
                  border: "none",
                  borderRadius: "50%",
                  color: "white",
                  fontSize: "20px",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                }}
              >
                ⚡
              </button>

              {showPWAMenu && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "60px",
                    left: "0",
                    background: "white",
                    borderRadius: "12px",
                    padding: "8px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    minWidth: "160px",
                  }}
                >
                  <button
                    onClick={requestNotificationPermission}
                    style={{
                      background: "none",
                      border: "none",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      textAlign: "left",
                    }}
                  >
                    🔔 Enable Notifications
                  </button>
                  <button
                    onClick={handleCameraCapture}
                    style={{
                      background: "none",
                      border: "none",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      textAlign: "left",
                    }}
                  >
                    📷 Scan Document
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <VoiceAssistantOverlay
          isListening={isListening}
          startListening={startListening}
          stopListening={stopListening}
        />
      </div>
    )
  }
}

// VoiceAssistantOverlay component
const VoiceAssistantOverlay = ({ isListening, startListening, stopListening }) => {
  console.log("VoiceAssistantOverlay mounted")
  return (
    <button
      onClick={isListening ? stopListening : startListening}
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 9999,
        width: "60px",
        height: "60px",
        borderRadius: "50%",
        background: "linear-gradient(135deg, #8B5CF6, #3B82F6)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontSize: "24px",
        cursor: "pointer",
        animation: isListening ? "glow 1.5s infinite" : "none",
      }}
    >
      {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
    </button>
  )
}
