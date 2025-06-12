"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, ArrowLeft, CheckCircle, Star, MapPin, Clock, Phone, Users } from "lucide-react"
import VoiceAssistantOverlay from "./voice-assistant-overlay"

interface SubstituteProfile {
  id: string
  name: string
  rating: number
  experience: string
  distance: string
  subjects: string[]
  availability: string
  phone: string
  email: string
  reviews: string
  hourlyRate: string
  photo: string
}

interface ConversationMessage {
  type: "user" | "ai"
  text: string
  timestamp: Date
}

interface BookingInfo {
  date?: string
  duration?: string
  reason?: string
  isComplete: boolean
}

type ConversationState = "initial" | "gathering_info" | "processing" | "complete"
type SubstituteScreen = "voice" | "results" | "booking"

interface SubstituteBookingSystemProps {
  onBack: () => void
}

export default function SubstituteBookingSystem({ onBack }: SubstituteBookingSystemProps) {
  const [currentScreen, setCurrentScreen] = useState<SubstituteScreen>("voice")
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([])
  const [conversationState, setConversationState] = useState<ConversationState>("initial")
  const [bookingInfo, setBookingInfo] = useState<BookingInfo>({
    isComplete: false,
  })
  const [selectedSubstitute, setSelectedSubstitute] = useState<SubstituteProfile | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Sample teacher profile
  const teacherProfile = {
    name: "Ms. Sarah Johnson",
    subject: "Mathematics",
    grade: "10th Grade",
    room: "Room 204",
    school: "Lincoln High School",
  }

  // Sample substitute data
  const availableSubstitutes: SubstituteProfile[] = [
    {
      id: "1",
      name: "Emily Rodriguez",
      rating: 4.9,
      experience: "8 years",
      distance: "12 miles away",
      subjects: ["Math", "Science", "Algebra"],
      availability: "Available Today",
      phone: "(555) 123-4567",
      email: "emily.r@subs.com",
      reviews: "Excellent with advanced math concepts. Students love her teaching style.",
      hourlyRate: "$35/hour",
      photo: "👩‍🏫",
    },
    {
      id: "2",
      name: "Michael Chen",
      rating: 4.7,
      experience: "5 years",
      distance: "8 miles away",
      subjects: ["Math", "Physics", "Calculus"],
      availability: "Available Today",
      phone: "(555) 234-5678",
      email: "michael.c@subs.com",
      reviews: "Great with technology integration. Very reliable and punctual.",
      hourlyRate: "$32/hour",
      photo: "👨‍🏫",
    },
    {
      id: "3",
      name: "Jennifer Kim",
      rating: 4.8,
      experience: "12 years",
      distance: "15 miles away",
      subjects: ["Math", "Algebra", "Statistics"],
      availability: "Available Tomorrow",
      phone: "(555) 345-6789",
      email: "jennifer.k@subs.com",
      reviews: "Exceptional classroom management. Follows lesson plans perfectly.",
      hourlyRate: "$38/hour",
      photo: "👩‍💼",
    },
  ]

  // Handle voice command from overlay
  const handleVoiceCommand = (command: any) => {
    const { parameters } = command

    // Auto-populate booking info based on voice command
    const updatedBookingInfo = { ...bookingInfo }

    if (parameters.date) {
      updatedBookingInfo.date = parameters.date
    }
    if (parameters.duration) {
      updatedBookingInfo.duration = parameters.duration === "full_day" ? "Full Day" : "Half Day"
    }
    if (parameters.reason) {
      updatedBookingInfo.reason = parameters.reason
    }

    // Check if we have enough info to proceed
    if (updatedBookingInfo.date && updatedBookingInfo.duration && updatedBookingInfo.reason) {
      updatedBookingInfo.isComplete = true
      setCurrentScreen("results")
    }

    setBookingInfo(updatedBookingInfo)
  }

  // Initialize conversation
  useEffect(() => {
    if (currentScreen === "voice" && conversationHistory.length === 0) {
      setConversationHistory([
        {
          type: "ai",
          text: "Hi! I'm SmartSub AI. I'll help you find a substitute teacher. What date do you need coverage?",
          timestamp: new Date(),
        },
      ])
      setConversationState("gathering_info")
    }
  }, [currentScreen])

  // Process user input and update conversation
  const processUserInput = (input: string) => {
    // Add user message to history
    const userMessage: ConversationMessage = {
      type: "user",
      text: input,
      timestamp: new Date(),
    }
    setConversationHistory((prev) => [...prev, userMessage])

    // Process the input and determine AI response
    setIsProcessing(true)
    setTimeout(() => {
      let aiResponse = ""
      const updatedBookingInfo = { ...bookingInfo }

      // Extract information from user input
      const lowerInput = input.toLowerCase()

      // Date detection
      if (!bookingInfo.date) {
        if (lowerInput.includes("today")) {
          updatedBookingInfo.date = "Today"
          aiResponse = "Got it! Today it is. Will this be for a full day, half day, or specific hours?"
        } else if (lowerInput.includes("tomorrow")) {
          updatedBookingInfo.date = "Tomorrow"
          aiResponse = "Perfect! Tomorrow it is. Will this be for a full day, half day, or specific hours?"
        } else if (lowerInput.includes("friday")) {
          updatedBookingInfo.date = "Friday"
          aiResponse = "Friday noted! Will this be for a full day, half day, or specific hours?"
        } else if (lowerInput.includes("monday")) {
          updatedBookingInfo.date = "Monday"
          aiResponse = "Monday it is! Will this be for a full day, half day, or specific hours?"
        } else {
          aiResponse =
            "I can help with that! What specific date do you need coverage? You can say 'today', 'tomorrow', or a specific day."
        }
      }
      // Duration detection
      else if (!bookingInfo.duration) {
        if (lowerInput.includes("full day") || lowerInput.includes("all day")) {
          updatedBookingInfo.duration = "Full Day"
          aiResponse =
            "Full day coverage noted. What's the reason for your absence? Options are: Personal, Sick, Professional Development, Maternity, or Jury Duty."
        } else if (
          lowerInput.includes("half day") ||
          lowerInput.includes("morning") ||
          lowerInput.includes("afternoon")
        ) {
          updatedBookingInfo.duration = "Half Day"
          aiResponse =
            "Half day coverage it is. What's the reason for your absence? Options are: Personal, Sick, Professional Development, Maternity, or Jury Duty."
        } else if (lowerInput.includes("hour")) {
          updatedBookingInfo.duration = "Specific Hours"
          aiResponse =
            "Specific hours noted. What's the reason for your absence? Options are: Personal, Sick, Professional Development, Maternity, or Jury Duty."
        } else {
          aiResponse = "Will this be for a full day, half day, or specific hours?"
        }
      }
      // Reason detection
      else if (!bookingInfo.reason) {
        if (lowerInput.includes("sick")) {
          updatedBookingInfo.reason = "Sick"
          updatedBookingInfo.isComplete = true
          aiResponse =
            "Perfect! I have all the details: " +
            updatedBookingInfo.date +
            " (" +
            updatedBookingInfo.duration +
            ") for Sick leave. Finding qualified substitutes now..."
          setConversationState("processing")
        } else if (lowerInput.includes("personal")) {
          updatedBookingInfo.reason = "Personal"
          updatedBookingInfo.isComplete = true
          aiResponse =
            "Got it! I have all the details: " +
            updatedBookingInfo.date +
            " (" +
            updatedBookingInfo.duration +
            ") for Personal leave. Finding qualified substitutes now..."
          setConversationState("processing")
        } else if (lowerInput.includes("pd") || lowerInput.includes("professional development")) {
          updatedBookingInfo.reason = "Professional Development"
          updatedBookingInfo.isComplete = true
          aiResponse =
            "Excellent! I have all the details: " +
            updatedBookingInfo.date +
            " (" +
            updatedBookingInfo.duration +
            ") for Professional Development. Finding qualified substitutes now..."
          setConversationState("processing")
        } else if (lowerInput.includes("maternity")) {
          updatedBookingInfo.reason = "Maternity"
          updatedBookingInfo.isComplete = true
          aiResponse =
            "Understood! I have all the details: " +
            updatedBookingInfo.date +
            " (" +
            updatedBookingInfo.duration +
            ") for Maternity leave. Finding qualified substitutes now..."
          setConversationState("processing")
        } else if (lowerInput.includes("jury")) {
          updatedBookingInfo.reason = "Jury Duty"
          updatedBookingInfo.isComplete = true
          aiResponse =
            "Got it! I have all the details: " +
            updatedBookingInfo.date +
            " (" +
            updatedBookingInfo.duration +
            ") for Jury Duty. Finding qualified substitutes now..."
          setConversationState("processing")
        } else {
          aiResponse =
            "What's the reason for your absence? Options are: Personal, Sick, Professional Development, Maternity, or Jury Duty."
        }
      }

      setBookingInfo(updatedBookingInfo)

      // Add AI response to history
      const aiMessage: ConversationMessage = {
        type: "ai",
        text: aiResponse,
        timestamp: new Date(),
      }
      setConversationHistory((prev) => [...prev, aiMessage])
      setIsProcessing(false)

      // If booking is complete, transition to results after a delay
      if (updatedBookingInfo.isComplete) {
        setTimeout(() => {
          setConversationState("complete")
          setCurrentScreen("results")
        }, 2000)
      }
    }, 1000)
  }

  // Quick answer buttons
  const handleQuickAnswer = (answer: string) => {
    setTranscript(answer)
    processUserInput(answer)
  }

  // Voice input simulation
  const startListening = () => {
    setIsListening(true)
    setTranscript("")

    // Simulate voice input after 2 seconds
    setTimeout(() => {
      setIsListening(false)
      const sampleInputs = [
        "I need to be off Friday",
        "Full day please",
        "It's for sick leave",
        "Today would be great",
        "Half day in the morning",
        "Personal reasons",
      ]
      const randomInput = sampleInputs[Math.floor(Math.random() * sampleInputs.length)]
      setTranscript(randomInput)
      processUserInput(randomInput)
    }, 2000)
  }

  // Handle substitute selection
  const handleSelectSubstitute = (substitute: SubstituteProfile) => {
    setSelectedSubstitute(substitute)
    setCurrentScreen("booking")
  }

  // Handle booking completion
  const handleBookingComplete = () => {
    // Reset all state
    setCurrentScreen("voice")
    setBookingInfo({ isComplete: false })
    setSelectedSubstitute(null)
    setConversationHistory([])
    setConversationState("initial")
    setTranscript("")
    // Return to main app
    onBack()
  }

  // Render voice interface screen
  const renderVoiceScreen = () => (
    <div className="space-y-6">
      {/* Back button */}
      <button onClick={onBack} className="flex items-center gap-2 text-purple-600 font-medium">
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </button>

      {/* Module Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center text-white">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">SmartSub AI</h2>
            <p className="text-sm text-gray-600">Just speak - we'll find your sub</p>
          </div>
        </div>
      </div>

      {/* Voice Interface */}
      <div className="bg-white rounded-2xl p-8 flex flex-col items-center shadow-sm border border-gray-100">
        <div className="mb-6">
          <Button
            onClick={startListening}
            size="lg"
            className={`w-32 h-32 rounded-full ${
              isListening
                ? "bg-red-500 hover:bg-red-600 animate-pulse shadow-lg"
                : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg"
            }`}
          >
            {isListening ? <MicOff className="w-12 h-12 text-white" /> : <Mic className="w-12 h-12 text-white" />}
          </Button>
        </div>

        {/* Voice Status */}
        <div className="w-full mb-4">
          {isListening ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-red-800">Listening...</span>
              </div>
              <p className="text-xs text-red-600 text-center">Speak naturally about your substitute needs</p>
            </div>
          ) : isProcessing ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-blue-800">Processing...</span>
              </div>
              <p className="text-xs text-blue-600 text-center">Understanding your request</p>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Ready to listen</span>
              </div>
              <p className="text-xs text-green-600 text-center">Tap the microphone to start</p>
            </div>
          )}
        </div>

        {/* Live Transcript */}
        {transcript && (
          <div className="w-full bg-purple-50 border-2 border-purple-200 rounded-lg p-4 mb-4">
            <p className="text-sm font-medium text-purple-700 mb-1">You said:</p>
            <p className="text-sm text-purple-900">"{transcript}"</p>
          </div>
        )}
      </div>

      {/* Information Gathered */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-gray-800 font-medium mb-4">Information Gathered</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Date:</span>
            <span className="text-sm font-medium text-gray-800">{bookingInfo.date || "Not specified"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Duration:</span>
            <span className="text-sm font-medium text-gray-800">{bookingInfo.duration || "Not specified"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Reason:</span>
            <span className="text-sm font-medium text-gray-800">{bookingInfo.reason || "Not specified"}</span>
          </div>
        </div>
      </div>

      {/* Quick Answer Buttons */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-gray-800 font-medium mb-4">Quick Answers</h3>
        <div className="grid grid-cols-2 gap-3">
          {!bookingInfo.date && (
            <>
              <button
                onClick={() => handleQuickAnswer("Today")}
                className="bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium py-2 px-4 rounded-lg text-sm transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => handleQuickAnswer("Tomorrow")}
                className="bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium py-2 px-4 rounded-lg text-sm transition-colors"
              >
                Tomorrow
              </button>
            </>
          )}
          {bookingInfo.date && !bookingInfo.duration && (
            <>
              <button
                onClick={() => handleQuickAnswer("Full day")}
                className="bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium py-2 px-4 rounded-lg text-sm transition-colors"
              >
                Full Day
              </button>
              <button
                onClick={() => handleQuickAnswer("Half day")}
                className="bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium py-2 px-4 rounded-lg text-sm transition-colors"
              >
                Half Day
              </button>
            </>
          )}
          {bookingInfo.date && bookingInfo.duration && !bookingInfo.reason && (
            <>
              <button
                onClick={() => handleQuickAnswer("Sick")}
                className="bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium py-2 px-4 rounded-lg text-sm transition-colors"
              >
                Sick
              </button>
              <button
                onClick={() => handleQuickAnswer("Personal")}
                className="bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium py-2 px-4 rounded-lg text-sm transition-colors"
              >
                Personal
              </button>
            </>
          )}
        </div>
      </div>

      {/* Conversation History */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-gray-800 font-medium mb-4">Conversation</h3>
        <div className="space-y-4 max-h-64 overflow-y-auto">
          {conversationHistory.map((message, index) => (
            <div key={index} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-xs p-3 rounded-lg ${
                  message.type === "user" ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-800"
                }`}
              >
                <p className="text-sm">{message.text}</p>
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-800 max-w-xs p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"
                    style={{ animationDelay: "0.4s" }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Voice Assistant Overlay */}
      <VoiceAssistantOverlay
        moduleType="substitute"
        currentScreen={currentScreen}
        onVoiceCommand={handleVoiceCommand}
        isVisible={true}
      />
    </div>
  )

  // Render results screen
  const renderResultsScreen = () => (
    <div className="space-y-6">
      {/* Back button */}
      <button onClick={() => setCurrentScreen("voice")} className="flex items-center gap-2 text-purple-600 font-medium">
        <ArrowLeft className="w-4 h-4" />
        Back to Voice
      </button>

      {/* Module Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center text-white">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">SmartSub AI</h2>
            <p className="text-sm text-gray-600">Just speak - we'll find your sub</p>
          </div>
        </div>
      </div>

      {/* Search Summary */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-6 text-white">
        <h2 className="text-xl font-bold mb-2">Found 3 Qualified Substitutes</h2>
        <p className="text-purple-100">
          {bookingInfo.date} • {bookingInfo.duration} • {bookingInfo.reason}
        </p>
        <p className="text-purple-100 text-sm mt-1">Mathematics • 10th Grade • Lincoln High School</p>
      </div>

      {/* Available Substitutes */}
      <div className="space-y-4">
        {availableSubstitutes.map((substitute) => (
          <div key={substitute.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center text-2xl">
                {substitute.photo}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-gray-800">{substitute.name}</h3>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium text-gray-700">{substitute.rating}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  {substitute.experience} experience • {substitute.distance}
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {substitute.subjects.map((subject, index) => (
                    <span key={index} className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full">
                      {subject}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{substitute.availability}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{substitute.distance}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-700 italic mb-4">"{substitute.reviews}"</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      <span>{substitute.phone}</span>
                    </div>
                  </div>
                  <span className="font-bold text-green-600">{substitute.hourlyRate}</span>
                </div>
              </div>
            </div>
            <Button
              onClick={() => handleSelectSubstitute(substitute)}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              Select {substitute.name}
            </Button>
          </div>
        ))}
      </div>

      {/* Voice Assistant Overlay */}
      <VoiceAssistantOverlay
        moduleType="substitute"
        currentScreen={currentScreen}
        onVoiceCommand={handleVoiceCommand}
        isVisible={true}
      />
    </div>
  )

  // Render booking confirmation screen
  const renderBookingScreen = () => (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => setCurrentScreen("results")}
        className="flex items-center gap-2 text-purple-600 font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Results
      </button>

      {/* Module Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center text-white">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">SmartSub AI</h2>
            <p className="text-sm text-gray-600">Just speak - we'll find your sub</p>
          </div>
        </div>
      </div>

      {/* Booking Summary */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Booking Summary</h2>

        {/* Selected Substitute */}
        {selectedSubstitute && (
          <div className="bg-purple-50 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-lg">
                {selectedSubstitute.photo}
              </div>
              <div>
                <h3 className="font-bold text-gray-800">{selectedSubstitute.name}</h3>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm text-gray-600">
                    {selectedSubstitute.rating} • {selectedSubstitute.experience}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Phone:</span>
                <p className="font-medium">{selectedSubstitute.phone}</p>
              </div>
              <div>
                <span className="text-gray-600">Rate:</span>
                <p className="font-medium text-green-600">{selectedSubstitute.hourlyRate}</p>
              </div>
            </div>
          </div>
        )}

        {/* Request Details */}
        <div className="border-t pt-4">
          <h3 className="font-medium text-gray-800 mb-3">Request Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Date:</span>
              <span className="font-medium">{bookingInfo.date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Duration:</span>
              <span className="font-medium">{bookingInfo.duration}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Reason:</span>
              <span className="font-medium">{bookingInfo.reason}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Subject:</span>
              <span className="font-medium">{teacherProfile.subject}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Grade:</span>
              <span className="font-medium">{teacherProfile.grade}</span>
            </div>
          </div>
        </div>
      </div>

      {/* What Happens Next */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-medium text-gray-800 mb-4">What Happens Next</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-purple-600">1</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">Substitute Notification</p>
              <p className="text-xs text-gray-600">{selectedSubstitute?.name} will be notified immediately</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-purple-600">2</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">Confirmation</p>
              <p className="text-xs text-gray-600">You'll receive confirmation within 15 minutes</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-purple-600">3</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">Lesson Plans</p>
              <p className="text-xs text-gray-600">Share your lesson plans via the app or email</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-purple-600">4</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">Day of Coverage</p>
              <p className="text-xs text-gray-600">Substitute arrives 15 minutes early for setup</p>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Booking Button */}
      <Button
        onClick={handleBookingComplete}
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-4 text-lg font-semibold"
      >
        Confirm Booking
      </Button>

      {/* Voice Assistant Overlay */}
      <VoiceAssistantOverlay
        moduleType="substitute"
        currentScreen={currentScreen}
        onVoiceCommand={handleVoiceCommand}
        isVisible={true}
      />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Screen Content */}
      {currentScreen === "voice" && renderVoiceScreen()}
      {currentScreen === "results" && renderResultsScreen()}
      {currentScreen === "booking" && renderBookingScreen()}
    </div>
  )
}
