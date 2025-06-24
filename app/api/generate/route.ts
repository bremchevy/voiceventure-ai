import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { AIResourceGenerator } from '@/lib/services/AIResourceGenerator';
import type { ResourceGenerationOptions } from '@/lib/types/resource';

export const runtime = 'edge';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  console.log('🚀 Starting resource generation request');
  const generator = new AIResourceGenerator();

  try {
    const body = await request.json();

    // If it's a direct OpenAI prompt
    if (body.prompt) {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that generates educational content. You should follow the format specified in the user's prompt exactly."
          },
          {
            role: "user",
            content: body.prompt
          }
        ],
        max_tokens: body.max_tokens || 1000,
        temperature: body.temperature || 0.7,
      });

      return NextResponse.json({
        content: completion.choices[0].message.content || ''
      });
    }

    // Otherwise, treat it as a resource generation request
    const options: ResourceGenerationOptions = body;
    console.log('📝 Received generation options:', JSON.stringify(options, null, 2));

    // Validate required fields
    if (!options.subject || !options.gradeLevel || !options.resourceType) {
      console.error('❌ Missing required fields:', { 
        subject: options.subject, 
        gradeLevel: options.gradeLevel, 
        resourceType: options.resourceType 
      });
      return NextResponse.json(
        { error: 'Missing required fields: subject, gradeLevel, or resourceType' },
        { status: 400 }
      );
    }

    // Handle specific math topics
    if (options.subject.toLowerCase() === 'math') {
      const customInstructions = options.customInstructions?.toLowerCase() || '';
      const focus = options.focus?.map(f => f.toLowerCase()) || [];
      
      // Check if this is about fractions
      if (customInstructions.includes('fraction') || focus.some(f => f.includes('fraction'))) {
        options.topicArea = 'fractions';
        if (!options.customInstructions) {
          options.customInstructions = 'Focus on fraction operations and concepts';
        }
      }
    }

    console.log('✅ Validation passed, creating stream');
    // Create a new TransformStream for streaming
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    // Start the generation process
    console.log('🎯 Starting resource generation with options:', {
      subject: options.subject,
      gradeLevel: options.gradeLevel,
      resourceType: options.resourceType
    });

    generator.generateResource(options)
      .then(async (resource) => {
        try {
          console.log('✨ Resource generated successfully, preparing to stream');
          // Convert the resource to JSON string
          const jsonString = JSON.stringify(resource);
          console.log('📦 Resource structure:', {
            hasContent: !!resource.content,
            hasMetadata: !!resource.metadata,
            contentLength: resource.content?.length || 0,
            sections: resource.sections?.length || 0
          });
          
          // Stream the content in chunks
          const chunks = jsonString.match(/.{1,1000}/g) || [];
          console.log(`📤 Streaming response in ${chunks.length} chunks`);
          
          for (const chunk of chunks) {
            await writer.write(encoder.encode(chunk));
          }
          console.log('✅ Stream completed successfully');
          await writer.close();
        } catch (error) {
          console.error('❌ Error streaming response:', error);
          console.error('Failed resource:', resource);
          await writer.write(encoder.encode(JSON.stringify({ 
            error: 'Failed to stream response',
            details: error instanceof Error ? error.message : 'Unknown error'
          })));
          await writer.close();
        }
      })
      .catch(async (error) => {
        console.error('❌ Error generating resource:', error);
        console.error('Generation options that caused error:', options);
        await writer.write(encoder.encode(JSON.stringify({ 
          error: 'Failed to generate resource',
          details: error instanceof Error ? error.message : 'Unknown error'
        })));
        await writer.close();
      });

    console.log('📡 Returning stream response');
    // Return the stream with JSON content type
    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'application/json',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('❌ Error processing request:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 