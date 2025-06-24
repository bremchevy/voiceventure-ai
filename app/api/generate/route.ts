import { NextResponse } from 'next/server';
import { AIResourceGenerator } from '@/lib/services/AIResourceGenerator';
import type { ResourceGenerationOptions } from '@/lib/types/resource';

export const runtime = 'edge';

export async function POST(request: Request) {
  console.log('🚀 Starting resource generation request');
  const generator = new AIResourceGenerator();

  try {
    const options: ResourceGenerationOptions = await request.json();
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