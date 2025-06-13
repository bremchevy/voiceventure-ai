import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createError, ErrorCodes } from '@/lib/utils/errors';
import fs from 'fs';

// Configure OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
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
    fs.writeFileSync(tempFilePath, audioBuffer);

    // Call Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: 'whisper-1',
    });

    // Clean up the temporary file
    fs.unlinkSync(tempFilePath);

    return NextResponse.json({ 
      text: transcription.text 
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