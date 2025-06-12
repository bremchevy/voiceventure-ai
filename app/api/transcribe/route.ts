import { NextResponse } from 'next/server';
import { Configuration, OpenAIApi } from 'openai';
import { createError, ErrorCodes } from '@/lib/utils/errors';

// Configure OpenAI
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export async function POST(request: Request) {
  if (!configuration.apiKey) {
    return NextResponse.json(
      { error: "OpenAI API key not configured" },
      { status: 500 }
    );
  }

  try {
    const { audio } = await request.json();
    
    if (!audio) {
      return NextResponse.json(
        { error: "No audio data provided" },
        { status: 400 }
      );
    }

    // Convert base64 to Buffer
    const audioBuffer = Buffer.from(audio, 'base64');

    // Create a temporary file path
    const tempFilePath = `/tmp/audio-${Date.now()}.webm`;
    
    // Write the buffer to a temporary file
    require('fs').writeFileSync(tempFilePath, audioBuffer);

    // Call Whisper API
    const response = await openai.createTranscription(
      require('fs').createReadStream(tempFilePath),
      'whisper-1'
    );

    // Clean up the temporary file
    require('fs').unlinkSync(tempFilePath);

    return NextResponse.json({ 
      text: response.data.text 
    });

  } catch (error: any) {
    console.error('Error in transcription:', error);
    
    if (error.response) {
      return NextResponse.json(
        { error: error.response.data },
        { status: error.response.status }
      );
    } else {
      return NextResponse.json(
        { error: "An error occurred during transcription" },
        { status: 500 }
      );
    }
  }
} 