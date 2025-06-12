"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Sparkles, CheckCircle, Edit } from "lucide-react"

interface VoiceAssistantOverlayProps {
  moduleType: "substitute" | "iep" | "professional_development" | "activity_ideas" | "quiz_generator" | "lesson_plan"
  currentScreen?: string
  onVoiceCommand?: (command: VoiceCommand) => void
  isVisible?: boolean
}

interface VoiceCommand {
  intent: string
  parameters: Record<string, any>
  confidence: number
  rawText: string
  moduleContext: string
}

interface ParsedFormData {
  [key: string]: any
}

export default function VoiceAssistantOverlay({
  moduleType,
  currentScreen = "main",
  onVoiceCommand,
  isVisible = true,
}: VoiceAssistantOverlayProps) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [parsedData, setParsedData] = useState<ParsedFormData>({})
  const [voiceResponse, setVoiceResponse] = useState<string>("")
  const recognitionRef = useRef<any>(null)

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = false
        recognitionRef.current.interimResults = false
        recognitionRef.current.lang = "en-US"

        recognitionRef.current.onresult = (event) => {
          const transcript = event.results[0][0].transcript
          setTranscript(transcript)
          processVoiceCommand(transcript)
        }

        recognitionRef.current.onend = () => {
          setIsListening(false)
        }

        recognitionRef.current.onerror = (event) => {
          console.error("Speech recognition error:", event.error)
          setIsListening(false)
        }
      }
    }
  }, [])

  // Parse voice commands based on module context
  const parseVoiceCommand = (text: string): VoiceCommand => {
    const lowerText = text.toLowerCase()

    // Module-specific parsing
    switch (moduleType) {
      case "substitute":
        return parseSubstituteCommand(lowerText, text)
      case "iep":
        return parseIEPCommand(lowerText, text)
      case "professional_development":
        return parseProfessionalDevelopmentCommand(lowerText, text)
      case "activity_ideas":
        return parseActivityIdeasCommand(lowerText, text)
      case "quiz_generator":
        return parseQuizGeneratorCommand(lowerText, text)
      case "lesson_plan":
        return parseLessonPlanCommand(lowerText, text)
      default:
        return {
          intent: "unknown",
          parameters: {},
          confidence: 0,
          rawText: text,
          moduleContext: moduleType,
        }
    }
  }

  // Substitute Finder voice parsing
  const parseSubstituteCommand = (lowerText: string, originalText: string): VoiceCommand => {
    const parameters: Record<string, any> = {}
    const intent = "search_substitute"
    let confidence = 0.8

    // Date detection
    if (lowerText.includes("today")) {
      parameters.date = "today"
      confidence += 0.1
    } else if (lowerText.includes("tomorrow")) {
      parameters.date = "tomorrow"
      confidence += 0.1
    } else if (lowerText.includes("friday") || lowerText.includes("monday") || lowerText.includes("tuesday")) {
      const days = ["monday", "tuesday", "wednesday", "thursday", "friday"]
      const foundDay = days.find((day) => lowerText.includes(day))
      if (foundDay) {
        parameters.date = foundDay
        confidence += 0.1
      }
    }

    // Duration detection
    if (lowerText.includes("full day") || lowerText.includes("all day")) {
      parameters.duration = "full_day"
      confidence += 0.1
    } else if (lowerText.includes("half day") || lowerText.includes("morning") || lowerText.includes("afternoon")) {
      parameters.duration = "half_day"
      confidence += 0.1
    }

    // Reason detection
    if (lowerText.includes("sick")) {
      parameters.reason = "sick"
      confidence += 0.1
    } else if (lowerText.includes("personal")) {
      parameters.reason = "personal"
      confidence += 0.1
    } else if (lowerText.includes("professional development") || lowerText.includes("pd")) {
      parameters.reason = "professional_development"
      confidence += 0.1
    }

    // Subject/Grade detection
    const gradeMatch = lowerText.match(/(\d+)(st|nd|rd|th)?\s+grade/)
    if (gradeMatch) {
      parameters.grade = `${gradeMatch[1]}${gradeMatch[2] || getOrdinalSuffix(Number.parseInt(gradeMatch[1]))} Grade`
      confidence += 0.1
    }

    return {
      intent,
      parameters,
      confidence: Math.min(confidence, 1.0),
      rawText: originalText,
      moduleContext: "substitute",
    }
  }

  // IEP Creation voice parsing
  const parseIEPCommand = (lowerText: string, originalText: string): VoiceCommand => {
    const parameters: Record<string, any> = {}
    const intent = "create_iep"
    let confidence = 0.8

    // Student info detection
    const gradeMatch = lowerText.match(/(\d+)(st|nd|rd|th)?\s+grade/)
    if (gradeMatch) {
      parameters.grade = `${gradeMatch[1]}${gradeMatch[2] || getOrdinalSuffix(Number.parseInt(gradeMatch[1]))} Grade`
      confidence += 0.1
    }

    // Disability detection
    if (lowerText.includes("autism") || lowerText.includes("asd")) {
      parameters.primaryDisability = "Autism Spectrum Disorder"
      confidence += 0.1
    } else if (lowerText.includes("adhd") || lowerText.includes("attention")) {
      parameters.primaryDisability = "ADHD"
      confidence += 0.1
    } else if (lowerText.includes("learning disability") || lowerText.includes("sld")) {
      parameters.primaryDisability = "Specific Learning Disability"
      confidence += 0.1
    }

    // Goal areas
    if (lowerText.includes("reading")) {
      parameters.goalAreas = parameters.goalAreas || []
      parameters.goalAreas.push("reading")
      confidence += 0.05
    }
    if (lowerText.includes("math")) {
      parameters.goalAreas = parameters.goalAreas || []
      parameters.goalAreas.push("math")
      confidence += 0.05
    }
    if (lowerText.includes("behavior") || lowerText.includes("social")) {
      parameters.goalAreas = parameters.goalAreas || []
      parameters.goalAreas.push("behavior")
      confidence += 0.05
    }

    return {
      intent,
      parameters,
      confidence: Math.min(confidence, 1.0),
      rawText: originalText,
      moduleContext: "iep",
    }
  }

  // Professional Development voice parsing
  const parseProfessionalDevelopmentCommand = (lowerText: string, originalText: string): VoiceCommand => {
    const parameters: Record<string, any> = {}
    const intent = "search_courses"
    let confidence = 0.8

    // Topic detection
    if (lowerText.includes("classroom management")) {
      parameters.topic = "classroom_management"
      confidence += 0.1
    } else if (lowerText.includes("technology") || lowerText.includes("tech")) {
      parameters.topic = "technology"
      confidence += 0.1
    } else if (lowerText.includes("special education") || lowerText.includes("sped")) {
      parameters.topic = "special_education"
      confidence += 0.1
    } else if (lowerText.includes("assessment")) {
      parameters.topic = "assessment"
      confidence += 0.1
    }

    // Duration preference
    if (lowerText.includes("short") || lowerText.includes("quick")) {
      parameters.duration = "short"
      confidence += 0.05
    } else if (lowerText.includes("comprehensive") || lowerText.includes("detailed")) {
      parameters.duration = "comprehensive"
      confidence += 0.05
    }

    // Credit requirements
    if (lowerText.includes("ceu") || lowerText.includes("credit")) {
      parameters.needsCredits = true
      confidence += 0.05
    }

    return {
      intent,
      parameters,
      confidence: Math.min(confidence, 1.0),
      rawText: originalText,
      moduleContext: "professional_development",
    }
  }

  // Activity Ideas voice parsing
  const parseActivityIdeasCommand = (lowerText: string, originalText: string): VoiceCommand => {
    const parameters: Record<string, any> = {}
    const intent = "generate_activities"
    let confidence = 0.8

    // Subject detection
    if (lowerText.includes("math")) {
      parameters.subject = "math"
      confidence += 0.1
    } else if (lowerText.includes("reading") || lowerText.includes("english")) {
      parameters.subject = "reading"
      confidence += 0.1
    } else if (lowerText.includes("science")) {
      parameters.subject = "science"
      confidence += 0.1
    } else if (lowerText.includes("social studies") || lowerText.includes("history")) {
      parameters.subject = "social_studies"
      confidence += 0.1
    }

    // Grade detection
    const gradeMatch = lowerText.match(/(\d+)(st|nd|rd|th)?\s+grade/)
    if (gradeMatch) {
      parameters.grade = `${gradeMatch[1]}${gradeMatch[2] || getOrdinalSuffix(Number.parseInt(gradeMatch[1]))} Grade`
      confidence += 0.1
    }

    // Activity type
    if (lowerText.includes("hands-on") || lowerText.includes("hands on")) {
      parameters.activityType = "hands_on"
      confidence += 0.05
    } else if (lowerText.includes("group")) {
      parameters.activityType = "group"
      confidence += 0.05
    } else if (lowerText.includes("individual")) {
      parameters.activityType = "individual"
      confidence += 0.05
    }

    return {
      intent,
      parameters,
      confidence: Math.min(confidence, 1.0),
      rawText: originalText,
      moduleContext: "activity_ideas",
    }
  }

  // Quiz Generator voice parsing
  const parseQuizGeneratorCommand = (lowerText: string, originalText: string): VoiceCommand => {
    const parameters: Record<string, any> = {}
    const intent = "generate_quiz"
    let confidence = 0.8

    // Subject detection
    if (lowerText.includes("math")) {
      parameters.subject = "math"
      confidence += 0.1
    } else if (lowerText.includes("reading") || lowerText.includes("english")) {
      parameters.subject = "reading"
      confidence += 0.1
    } else if (lowerText.includes("science")) {
      parameters.subject = "science"
      confidence += 0.1
    }

    // Grade detection
    const gradeMatch = lowerText.match(/(\d+)(st|nd|rd|th)?\s+grade/)
    if (gradeMatch) {
      parameters.grade = `${gradeMatch[1]}${gradeMatch[2] || getOrdinalSuffix(Number.parseInt(gradeMatch[1]))} Grade`
      confidence += 0.1
    }

    // Question count
    const questionMatch = lowerText.match(/(\d+)\s+questions?/)
    if (questionMatch) {
      parameters.questionCount = Number.parseInt(questionMatch[1])
      confidence += 0.1
    }

    // Question type
    if (lowerText.includes("multiple choice")) {
      parameters.questionType = "multiple_choice"
      confidence += 0.1
    } else if (lowerText.includes("true false") || lowerText.includes("true or false")) {
      parameters.questionType = "true_false"
      confidence += 0.1
    } else if (lowerText.includes("short answer")) {
      parameters.questionType = "short_answer"
      confidence += 0.1
    }

    return {
      intent,
      parameters,
      confidence: Math.min(confidence, 1.0),
      rawText: originalText,
      moduleContext: "quiz_generator",
    }
  }

  // Lesson Plan voice parsing
  const parseLessonPlanCommand = (lowerText: string, originalText: string): VoiceCommand => {
    const parameters: Record<string, any> = {}
    const intent = "create_lesson_plan"
    let confidence = 0.8

    // Subject detection
    if (lowerText.includes("math")) {
      parameters.subject = "math"
      confidence += 0.1
    } else if (lowerText.includes("reading") || lowerText.includes("english")) {
      parameters.subject = "reading"
      confidence += 0.1
    } else if (lowerText.includes("science")) {
      parameters.subject = "science"
      confidence += 0.1
    }

    // Grade detection
    const gradeMatch = lowerText.match(/(\d+)(st|nd|rd|th)?\s+grade/)
    if (gradeMatch) {
      parameters.grade = `${gradeMatch[1]}${gradeMatch[2] || getOrdinalSuffix(Number.parseInt(gradeMatch[1]))} Grade`
      confidence += 0.1
    }

    // Duration detection
    const durationMatch = lowerText.match(/(\d+)\s+minutes?/)
    if (durationMatch) {
      parameters.duration = `${durationMatch[1]} minutes`
      confidence += 0.1
    } else if (lowerText.includes("full lesson")) {
      parameters.duration = "45 minutes"
      confidence += 0.05
    } else if (lowerText.includes("mini lesson")) {
      parameters.duration = "15 minutes"
      confidence += 0.05
    }

    // Topic detection
    if (lowerText.includes("fractions")) {
      parameters.topic = "fractions"
      confidence += 0.1
    } else if (lowerText.includes("multiplication")) {
      parameters.topic = "multiplication"
      confidence += 0.1
    } else if (lowerText.includes("reading comprehension")) {
      parameters.topic = "reading comprehension"
      confidence += 0.1
    }

    return {
      intent,
      parameters,
      confidence: Math.min(confidence, 1.0),
      rawText: originalText,
      moduleContext: "lesson_plan",
    }
  }

  // Helper function for ordinal suffixes
  const getOrdinalSuffix = (num: number): string => {
    const j = num % 10
    const k = num % 100
    if (j === 1 && k !== 11) return "st"
    if (j === 2 && k !== 12) return "nd"
    if (j === 3 && k !== 13) return "rd"
    return "th"
  }

  // Process voice command
  const processVoiceCommand = async (text: string) => {
    setIsProcessing(true)

    // Parse the command
    const command = parseVoiceCommand(text)

    // Generate response based on parsed data
    const response = generateVoiceResponse(command)
    setVoiceResponse(response)

    // Set parsed data for form population
    setParsedData(command.parameters)

    // Show confirmation dialog
    setShowConfirmation(true)
    setIsProcessing(false)

    // Notify parent component
    if (onVoiceCommand) {
      onVoiceCommand(command)
    }
  }

  // Generate contextual response
  const generateVoiceResponse = (command: VoiceCommand): string => {
    const { moduleContext, parameters, confidence } = command

    if (confidence < 0.5) {
      return "I didn't quite understand that. Could you please try again?"
    }

    switch (moduleContext) {
      case "substitute":
        return generateSubstituteResponse(parameters)
      case "iep":
        return generateIEPResponse(parameters)
      case "professional_development":
        return generateProfessionalDevelopmentResponse(parameters)
      case "activity_ideas":
        return generateActivityIdeasResponse(parameters)
      case "quiz_generator":
        return generateQuizGeneratorResponse(parameters)
      case "lesson_plan":
        return generateLessonPlanResponse(parameters)
      default:
        return "I'm ready to help! What would you like to do?"
    }
  }

  // Generate module-specific responses
  const generateSubstituteResponse = (params: Record<string, any>): string => {
    let response = "I'll help you find a substitute"
    if (params.date) response += ` for ${params.date}`
    if (params.duration) response += ` (${params.duration.replace("_", " ")})`
    if (params.reason) response += ` due to ${params.reason}`
    response += ". Let me fill out the form for you."
    return response
  }

  const generateIEPResponse = (params: Record<string, any>): string => {
    let response = "I'll help you create an IEP"
    if (params.grade) response += ` for a ${params.grade} student`
    if (params.primaryDisability) response += ` with ${params.primaryDisability}`
    response += ". Let me set up the form with the information you provided."
    return response
  }

  const generateProfessionalDevelopmentResponse = (params: Record<string, any>): string => {
    let response = "I'll help you find professional development courses"
    if (params.topic) response += ` on ${params.topic.replace("_", " ")}`
    if (params.needsCredits) response += " that offer CEU credits"
    response += ". Let me search for relevant options."
    return response
  }

  const generateActivityIdeasResponse = (params: Record<string, any>): string => {
    let response = "I'll generate activity ideas"
    if (params.subject) response += ` for ${params.subject}`
    if (params.grade) response += ` (${params.grade})`
    if (params.activityType) response += ` focusing on ${params.activityType.replace("_", " ")} activities`
    response += ". Let me create some engaging options for you."
    return response
  }

  const generateQuizGeneratorResponse = (params: Record<string, any>): string => {
    let response = "I'll create a quiz"
    if (params.subject) response += ` for ${params.subject}`
    if (params.grade) response += ` (${params.grade})`
    if (params.questionCount) response += ` with ${params.questionCount} questions`
    if (params.questionType) response += ` using ${params.questionType.replace("_", " ")} format`
    response += ". Let me set up the quiz parameters."
    return response
  }

  const generateLessonPlanResponse = (params: Record<string, any>): string => {
    let response = "I'll create a lesson plan"
    if (params.subject) response += ` for ${params.subject}`
    if (params.grade) response += ` (${params.grade})`
    if (params.topic) response += ` on ${params.topic}`
    if (params.duration) response += ` lasting ${params.duration}`
    response += ". Let me structure the lesson for you."
    return response
  }

  // Start voice recognition
  const startListening = () => {
    if (recognitionRef.current) {
      setTranscript("")
      setIsListening(true)
      recognitionRef.current.start()
    }
  }

  // Stop voice recognition
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  // Handle confirmation
  const handleConfirm = () => {
    setShowConfirmation(false)
    setTranscript("")
    setVoiceResponse("")
    // The parent component should handle the actual form population
  }

  const handleEdit = () => {
    setShowConfirmation(false)
    // Keep the data for manual editing
  }

  const handleCancel = () => {
    setShowConfirmation(false)
    setTranscript("")
    setVoiceResponse("")
    setParsedData({})
  }

  if (!isVisible) return null

  return (
    <>
      {/* Floating Voice Button */}
      <div className="fixed bottom-20 right-4 z-50">
        <Button
          onClick={isListening ? stopListening : startListening}
          className={`w-14 h-14 rounded-full shadow-lg ${
            isListening ? "bg-red-500 hover:bg-red-600 animate-pulse" : "bg-purple-600 hover:bg-purple-700"
          }`}
          disabled={isProcessing}
        >
          {isListening ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
        </Button>
      </div>

      {/* Voice Status Indicator */}
      {(isListening || isProcessing) && (
        <div className="fixed bottom-36 right-4 z-50">
          <div className="bg-white rounded-lg shadow-lg border p-3 max-w-xs">
            {isListening && (
              <div className="flex items-center gap-2 text-red-600">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Listening...</span>
              </div>
            )}
            {isProcessing && (
              <div className="flex items-center gap-2 text-purple-600">
                <Sparkles className="w-4 h-4 animate-spin" />
                <span className="text-sm font-medium">Processing...</span>
              </div>
            )}
            {transcript && <div className="mt-2 text-xs text-gray-600">"{transcript}"</div>}
          </div>
        </div>
      )}

      {/* Voice Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Voice Command Processed</h3>
                <p className="text-sm text-gray-600">Review the information I understood</p>
              </div>
            </div>

            {/* Voice Response */}
            <div className="bg-purple-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-purple-800">{voiceResponse}</p>
            </div>

            {/* Parsed Data Preview */}
            {Object.keys(parsedData).length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Information Detected:</h4>
                <div className="space-y-1">
                  {Object.entries(parsedData).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-xs">
                      <span className="text-gray-600 capitalize">{key.replace("_", " ")}:</span>
                      <span className="text-gray-900 font-medium">
                        {Array.isArray(value) ? value.join(", ") : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Original Transcript */}
            <div className="bg-blue-50 rounded-lg p-3 mb-6">
              <p className="text-xs text-blue-800">
                <span className="font-medium">You said:</span> "{transcript}"
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button onClick={handleConfirm} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                <CheckCircle className="w-4 h-4 mr-2" />
                Fill Form
              </Button>
              <Button onClick={handleEdit} variant="outline" className="flex-1">
                <Edit className="w-4 h-4 mr-2" />
                Edit First
              </Button>
              <Button onClick={handleCancel} variant="outline" className="px-4">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
