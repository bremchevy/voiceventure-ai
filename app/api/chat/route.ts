import { NextResponse } from "next/server"
import OpenAI from "openai"

// Initialize OpenAI client
const openai = new OpenAI()

export async function POST(request: Request) {
  try {
    // Validate API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        error: "OpenAI API key not configured" 
      }, { status: 500 })
    }

    const body = await request.json()
    const { messages } = body
    
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ 
        error: "Invalid request: messages array is required" 
      }, { status: 400 })
    }

    // Create chat completion
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: messages,
      temperature: 0.7,
      max_tokens: 800,
    })

    // Return the response
    return NextResponse.json({
      content: completion.choices[0].message.content,
      role: completion.choices[0].message.role
    })

  } catch (error: any) {
    console.error("Chat API Error:", error)

    // Handle OpenAI API errors
    if (error instanceof OpenAI.APIError) {
      return NextResponse.json({
        error: error.message,
        type: error.type,
        code: error.code,
      }, { 
        status: error.status || 500 
      })
    }

    // Handle other errors
    return NextResponse.json({ 
      error: "An unexpected error occurred",
      details: error.message
    }, { 
      status: 500 
    })
  }
} 