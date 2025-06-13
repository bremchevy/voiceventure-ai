import { NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
  // Validate API key
  if (!process.env.OPENAI_API_KEY) {
    console.error("OpenAI API key missing")
    return NextResponse.json({ 
      error: "OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables." 
    }, { status: 500 })
  }

  try {
    // Test API key validity first
    try {
      const models = await openai.models.list()
      console.log("Available models:", models.data.map(m => m.id))
    } catch (apiError: any) {
      console.error("API key validation error:", apiError.message)
      return NextResponse.json({ 
        error: "OpenAI API key validation failed. Please check your API key and account status.",
        details: apiError.message
      }, { status: 403 })
    }

    const body = await request.json()
    console.log("Request body:", body)

    const { messages } = body
    
    if (!messages || !Array.isArray(messages)) {
      console.error("Invalid messages format:", messages)
      return NextResponse.json({ error: "Invalid payload: messages array missing" }, { status: 400 })
    }

    // Convert chat messages to a single prompt string
    const prompt = messages.map(msg => {
      if (msg.role === 'system') return `Instructions: ${msg.content}\n`
      if (msg.role === 'user') return `User: ${msg.content}\n`
      return `Assistant: ${msg.content}\n`
    }).join('')

    // Use the chat completions API instead of completions
    const completion = await openai.chat.completions.create({
      model: "gpt-4",  // Changed from gpt-3.5-turbo to gpt-4
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      temperature: 0.7,
      max_tokens: 800,
    })

    if (!completion.choices[0]?.message) {
      throw new Error("No completion choice returned")
    }

    return NextResponse.json(completion.choices[0].message)

  } catch (error: any) {
    console.error("Chat error:", error.response?.data || error.message || error)
    
    // Enhanced error response
    const errorMessage = error.response?.data?.error?.message || error.message || "An error occurred during chat completion"
    const statusCode = error.response?.status || 500
    
    return NextResponse.json({
      error: errorMessage,
      status: statusCode,
      type: error.type || 'UnknownError',
      // Include more details if available
      details: error.response?.data?.error || undefined
    }, { status: statusCode })
  }
} 