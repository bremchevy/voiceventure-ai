"use client"

import { useState, useRef, useEffect, memo } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Sparkles, CheckCircle, Edit } from "lucide-react"

interface VoiceAssistantOverlayProps {
  moduleType: "substitute" | "iep" | "professional_development" | "activity_ideas" | "quiz_generator" | "lesson_plan"
  currentScreen?: string
  onVoiceCommand?: (command: VoiceCommand) => void
  isVisible?: boolean
  isListening: boolean
  startListening: () => void
  stopListening: () => void
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

const VoiceAssistantOverlay = memo(({ isListening, startListening, stopListening }: VoiceAssistantOverlayProps) => {
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
})

VoiceAssistantOverlay.displayName = 'VoiceAssistantOverlay'

export default VoiceAssistantOverlay
