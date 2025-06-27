import { NextResponse } from 'next/server';
import { AIResourceGenerator } from '@/lib/services/AIResourceGenerator';
import type { ResourceGenerationOptions } from '@/lib/types/resource';
import { validateEnvironment } from '@/lib/services/AIContentGenerator/config';

export const runtime = 'edge';

// Helper function to determine difficulty based on grade level
function determineDifficulty(gradeLevel: string): 'easy' | 'medium' | 'hard' {
  const grade = parseInt(gradeLevel);
  if (grade <= 2) return 'easy';
  if (grade <= 4) return 'medium';
  return 'hard';
}

// Helper function to determine visual aids based on grade level
function determineVisualAids(gradeLevel: string) {
  const grade = parseInt(gradeLevel);
  return {
    includeVisuals: grade <= 3, // More visuals for lower grades
    includeDiagrams: grade >= 3, // Diagrams for higher grades
    includeExperiments: grade >= 4, // Experiments for higher grades
    visualComplexity: grade <= 2 ? 'simple' : grade <= 4 ? 'moderate' : 'complex'
  };
}

export async function POST(request: Request) {
  try {
    // Validate environment first
    validateEnvironment();
    
    const options = await request.json();
    console.log('📝 Received generation request:', options);

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

    // Extract grade number from grade level string
    const gradeNumber = parseInt(options.gradeLevel.match(/\d+/)?.[0] || '0');
    
    // Determine difficulty and visual aids based on grade level
    const difficulty = determineDifficulty(gradeNumber.toString());
    const visualAids = determineVisualAids(gradeNumber.toString());

    // Merge the determined settings with the original options
    const enhancedOptions = {
      ...options,
      difficulty,
      ...visualAids,
    };

    console.log('🎯 Enhanced generation options:', enhancedOptions);

    const generator = new AIResourceGenerator();
    const result = await generator.generateResource(enhancedOptions);

    // Log success and return result
    console.log('✅ Content generated successfully');
    console.log('✨ Resource generated successfully, preparing to stream');
    console.log('📦 Resource structure:', { 
      hasContent: !!result.content, 
      hasMetadata: !!result.metadata, 
      contentLength: result.content?.length || 0,
      sections: result.sections?.length || 0
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Error generating resource:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate resource' },
      { status: 500 }
    );
  }
} 