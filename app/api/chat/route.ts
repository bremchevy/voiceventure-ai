import { NextResponse } from "next/server"
import { Configuration, OpenAIApi } from "openai"

const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY })
const openai = new OpenAIApi(configuration)

export async function POST(request: Request) {
  if (!configuration.apiKey) {
    return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
  }

  try {
    const { messages, model = "gpt-4o-mini" } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid payload: messages array missing" }, { status: 400 })
    }

    const completion = await openai.createChatCompletion({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 800,
    })

    const assistantMessage = completion.data.choices[0]?.message

    return NextResponse.json({ message: assistantMessage })
  } catch (error: any) {
    console.error("Chat route error", error)
    if (error.response) {
      return NextResponse.json({ error: error.response.data }, { status: error.response.status })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 